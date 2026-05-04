"""
ML recommendation engine using scikit-learn.

Model: Gradient Boosting Classifier (GBM) ensemble with RandomForest
as a secondary estimator. Falls back to a Logistic Regression when there
is insufficient training data.

Trained model is persisted via joblib in models/task_assignment.joblib.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from database import query_df
from features import FEATURE_NAMES, FeatureCache, FeatureExtractor

logger = logging.getLogger(__name__)

MODEL_DIR  = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "task_assignment.joblib"
META_PATH  = MODEL_DIR / "task_assignment_meta.joblib"

# Minimum labelled samples before we try to train the ensemble
MIN_SAMPLES_ENSEMBLE = 40
MIN_SAMPLES_LR       = 10


# ---------------------------------------------------------------------------
# Model persistence helpers
# ---------------------------------------------------------------------------

def load_model() -> tuple[Any | None, dict | None]:
    """Returns (model, meta) or (None, None) if no model exists."""
    if MODEL_PATH.exists() and META_PATH.exists():
        try:
            model = joblib.load(MODEL_PATH)
            meta  = joblib.load(META_PATH)
            return model, meta
        except Exception as exc:
            logger.warning("Failed to load saved model: %s", exc)
    return None, None


def save_model(model: Any, meta: dict) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(meta,  META_PATH)


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def collect_training_data() -> tuple[np.ndarray, np.ndarray]:
    """
    Pulls all completed task-assignments from the database, computes
    feature vectors, and returns (X, y).

    Label y = 1 if:
      - task was completed (workflow_status == 'done')
      - completed on-time (updated_at <= due_date, if due_date set)
      - hours accurate (actual_hours <= estimated_hours * 1.3, if both set)
    """
    assignments = query_df("""
        SELECT
            ta.user_id,
            t.id AS task_id,
            t.project_id,
            t.workflow_status,
            t.priority,
            t.issue_type,
            t.complexity,
            t.story_points,
            t.estimated_hours,
            t.actual_hours,
            t.due_date,
            t.updated_at,
            t.sprint_id
        FROM task_assignments ta
        JOIN tasks t ON t.id = ta.task_id
        WHERE t.workflow_status = 'done'
          AND t.deleted_at IS NULL
    """)

    if assignments.empty or len(assignments) < MIN_SAMPLES_LR:
        return np.empty((0, len(FEATURE_NAMES))), np.empty(0)

    assignments["due_date"]  = pd.to_datetime(assignments["due_date"],  errors="coerce")
    assignments["updated_at"] = pd.to_datetime(assignments["updated_at"], errors="coerce")

    user_ids   = assignments["user_id"].astype(int).unique().tolist()
    project_ids = assignments["project_id"].astype(int).unique().tolist()

    # One cache per project for performance
    caches: dict[int, FeatureCache] = {}

    X_list: list[list[float]] = []
    y_list: list[int]         = []

    for _, row in assignments.iterrows():
        uid    = int(row["user_id"])
        pid    = int(row["project_id"])
        due    = row["due_date"]
        upd    = row["updated_at"]
        est_h  = row["estimated_hours"]
        act_h  = row["actual_hours"]

        # Label
        on_time    = pd.isna(due) or (not pd.isna(upd) and upd <= due)
        hours_good = (pd.isna(est_h) or pd.isna(act_h) or est_h == 0
                      or (act_h / est_h) <= 1.3)
        label = 1 if on_time and hours_good else 0

        if pid not in caches:
            caches[pid] = FeatureCache([uid], pid)

        task_dict: dict[str, Any] = {
            "project_id":    pid,
            "priority":      row.get("priority", "medium"),
            "issue_type":    row.get("issue_type", "task"),
            "complexity":    float(row.get("complexity") or 5),
            "estimated_hours": est_h,
            "sprint_id":     row.get("sprint_id"),
            "specialty_ids": [],
        }

        try:
            fe  = FeatureExtractor(caches[pid])
            fv  = fe.extract(uid, task_dict)
            vec = [fv[fn] for fn in FEATURE_NAMES]
        except Exception as exc:
            logger.debug("Feature extraction failed for task %s: %s", row["task_id"], exc)
            continue

        X_list.append(vec)
        y_list.append(label)

    X = np.array(X_list, dtype=float)
    y = np.array(y_list, dtype=int)
    return X, y


def train(verbose: bool = True) -> dict:
    """Train the model and return evaluation metrics."""
    if verbose:
        print("  Collecting training data from database...")

    X, y = collect_training_data()
    n = len(X)

    if verbose:
        print(f"  {n} labelled samples found.")

    if n < MIN_SAMPLES_LR:
        return {
            "status":  "insufficient_data",
            "samples": n,
            "message": f"Need at least {MIN_SAMPLES_LR} completed task assignments. "
                       "Run: php artisan ml:seed-training-data",
        }

    # Build model
    if n >= MIN_SAMPLES_ENSEMBLE:
        gbm = GradientBoostingClassifier(
            n_estimators=200, max_depth=4, learning_rate=0.08,
            min_samples_leaf=3, random_state=42
        )
        rf = RandomForestClassifier(
            n_estimators=150, max_depth=6, min_samples_leaf=4,
            random_state=42, n_jobs=-1
        )
        base = VotingClassifier(
            estimators=[("gbm", gbm), ("rf", rf)], voting="soft"
        )
        model_label = "GBM+RF Ensemble"
    else:
        base = LogisticRegression(
            C=1.0, max_iter=500, random_state=42, class_weight="balanced"
        )
        model_label = "Logistic Regression (fallback)"

    # CV folds must not exceed minority class count
    min_class_count = int(min(np.bincount(y)))
    cv_folds = min(5, max(2, min(n // 10, min_class_count)))

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    CalibratedClassifierCV(base, cv=cv_folds)),
    ])

    if verbose:
        print(f"  Training {model_label} on {n} samples...")

    pipeline.fit(X, y)

    y_pred = pipeline.predict(X)
    acc  = float(accuracy_score(y, y_pred))
    prec = float(precision_score(y, y_pred, zero_division=0))
    rec  = float(recall_score(y, y_pred, zero_division=0))
    f1   = float(f1_score(y, y_pred, zero_division=0))

    # Feature importances (from GBM estimator when available)
    importances: dict[str, float] = {}
    try:
        clf = pipeline.named_steps["clf"].estimator
        if hasattr(clf, "estimators_"):
            gbm_est = dict(clf.estimators_).get("gbm")
            if gbm_est and hasattr(gbm_est, "feature_importances_"):
                importances = dict(zip(FEATURE_NAMES, gbm_est.feature_importances_.tolist()))
        elif hasattr(clf, "feature_importances_"):
            importances = dict(zip(FEATURE_NAMES, clf.feature_importances_.tolist()))
        elif hasattr(clf, "coef_"):
            importances = dict(zip(FEATURE_NAMES, clf.coef_[0].tolist()))
    except Exception:
        pass

    meta = {
        "model_label":   model_label,
        "n_samples":     n,
        "accuracy":      acc,
        "precision":     prec,
        "recall":        rec,
        "f1":            f1,
        "importances":   importances,
    }

    save_model(pipeline, meta)

    if verbose:
        print(f"  Done. accuracy={acc:.3f}  precision={prec:.3f}  recall={rec:.3f}  f1={f1:.3f}")

    return {"status": "trained", **meta}


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

def _default_score(feature_vector: dict[str, float]) -> float:
    """Weighted dot-product fallback when no trained model exists."""
    from ml_config import DEFAULT_WEIGHTS  # noqa
    total  = sum(w for w in DEFAULT_WEIGHTS.values() if w > 0)
    raw    = sum(feature_vector.get(f, 0.0) * w for f, w in DEFAULT_WEIGHTS.items())
    return min(100.0, max(0.0, (raw / total) * 100)) if total > 0 else 0.0


def _fetch_candidates(project_id: int) -> pd.DataFrame:
    """
    Fetch eligible candidate users for a project.
    Priority: explicit project members → same-team users → all active non-admin users.
    """
    _EXCLUDE_ADMINS = """
        u.id NOT IN (
            SELECT mu.model_id FROM model_has_roles mu
            JOIN roles r ON r.id = mu.role_id
            WHERE r.name = 'admin' AND mu.model_type LIKE '%User%'
        )
    """

    # 1. Explicit project members
    df = query_df(f"""
        SELECT u.id, u.name, u.email, u.avatar
        FROM users u
        WHERE u.id IN (
            SELECT user_id FROM project_user    WHERE project_id = :pid
            UNION
            SELECT user_id FROM project_members WHERE project_id = :pid
        )
          AND u.status = 'active'
          AND {_EXCLUDE_ADMINS}
    """, {"pid": project_id})

    if not df.empty:
        return df

    # 2. Same team users (fallback when project has no explicit members yet)
    df = query_df(f"""
        SELECT u.id, u.name, u.email, u.avatar
        FROM users u
        WHERE u.id IN (
            SELECT tu.user_id FROM team_user tu
            JOIN projects p ON p.team_id = tu.team_id
            WHERE p.id = :pid
        )
          AND u.status = 'active'
          AND {_EXCLUDE_ADMINS}
    """, {"pid": project_id})

    if not df.empty:
        logger.info("[ML] No explicit project members for pid=%d, using team members (%d found)", project_id, len(df))
        return df

    # 3. All active non-admin users (last resort)
    df = query_df(f"""
        SELECT u.id, u.name, u.email, u.avatar
        FROM users u
        WHERE u.status = 'active'
          AND {_EXCLUDE_ADMINS}
        LIMIT 20
    """, {"pid": project_id})

    logger.info("[ML] No team members for pid=%d, using global pool (%d found)", project_id, len(df))
    return df


def _member_stats(cache: "FeatureCache", user_ids: list[int]) -> dict[int, dict]:
    """Compute human-readable performance stats per user for display in the modal."""
    rows = cache.assignments
    stats: dict[int, dict] = {}

    for uid in user_ids:
        ur = rows[rows["user_id"] == uid] if not rows.empty else pd.DataFrame()
        done = ur[ur["workflow_status"] == "done"] if not ur.empty else pd.DataFrame()
        active = ur[ur["workflow_status"].isin(["in_progress", "at_risk"])] if not ur.empty else pd.DataFrame()

        tasks_done  = int(len(done))
        tasks_total = int(len(ur))
        active_count = int(len(active))

        # Average actual hours on completed tasks
        avg_hours: float | None = None
        if tasks_done > 0 and "actual_hours" in done.columns:
            h = done["actual_hours"].dropna()
            h = h[h > 0]
            avg_hours = round(float(h.mean()), 1) if len(h) > 0 else None

        # Average time to complete: assignment created_at → task updated_at (≈ done time)
        # Cap at 90 days to exclude stale/pre-existing assignments; use median for robustness
        avg_days: float | None = None
        if tasks_done > 0 and "assigned_at" in done.columns and "updated_at" in done.columns:
            deltas = (done["updated_at"] - done["assigned_at"]).dt.total_seconds() / 86400
            deltas = deltas[(deltas > 0) & (deltas <= 90)]
            avg_days = round(float(deltas.median()), 1) if len(deltas) > 0 else None

        # On-time rate
        if tasks_done > 0 and "due_date" in done.columns and "updated_at" in done.columns:
            on_time = (done["updated_at"] <= done["due_date"]).sum()
            with_due = done["due_date"].notna().sum()
            on_time_pct = round(float(on_time / with_due * 100), 0) if with_due > 0 else None
        else:
            on_time_pct = None

        stats[uid] = {
            "tasks_done":    tasks_done,
            "tasks_total":   tasks_total,
            "active_tasks":  active_count,
            "avg_hours":     avg_hours,
            "avg_days":      avg_days,
            "on_time_pct":   on_time_pct,
        }

    return stats


def recommend(
    project_id: int,
    task: dict[str, Any],
    top_n: int = 5,
) -> dict:
    """
    Returns top-N candidate users for a task.
    Uses the trained sklearn model if available, otherwise falls back
    to the weighted dot-product heuristic.
    Falls back through: project members → team members → all active users.
    """
    df = _fetch_candidates(project_id)

    if df.empty:
        return {"best_user_id": None, "candidates": [], "model_info": _model_info()}

    user_ids  = df["id"].astype(int).tolist()
    task_full = {**task, "project_id": project_id}

    cache     = FeatureCache(user_ids, project_id)
    extractor = FeatureExtractor(cache)

    feature_vecs: list[dict[str, float]] = []
    for uid in user_ids:
        try:
            fv = extractor.extract(uid, task_full)
        except Exception as exc:
            logger.warning("Feature extraction failed for user %d: %s", uid, exc)
            fv = {fn: 0.5 for fn in FEATURE_NAMES}
        feature_vecs.append(fv)

    model, meta = load_model()

    scores: list[float] = []
    if model is not None:
        X = np.array([[fv[fn] for fn in FEATURE_NAMES] for fv in feature_vecs])
        probas = model.predict_proba(X)[:, 1]
        scores = (probas * 100).tolist()
    else:
        scores = [_default_score(fv) for fv in feature_vecs]

    perf_stats = _member_stats(cache, user_ids)

    from ml_config import FEATURE_LABELS  # noqa

    # Build candidate list
    candidates = []
    for idx, (_, row) in enumerate(df.iterrows()):
        uid = int(row["id"])
        fv  = feature_vecs[idx]
        sc  = float(scores[idx])

        candidates.append({
            "user_id":  uid,
            "name":     row["name"],
            "email":    row["email"],
            "avatar":   row["avatar"],
            "score":    round(sc, 1),
            "feature_breakdown": {
                fn: {"value": round(fv[fn], 4), "label": FEATURE_LABELS.get(fn, fn)}
                for fn in FEATURE_NAMES
            },
            "stats":    perf_stats.get(uid, {}),
            "strengths":  _top_features(fv, positive=True, n=3),
            "weaknesses": _top_features(fv, positive=False, n=2),
        })

    candidates.sort(key=lambda c: c["score"], reverse=True)
    top = candidates[:top_n]

    best_score = top[0]["score"] if top else 0
    for c in top:
        c["relative_score"] = round((c["score"] / best_score * 100), 1) if best_score > 0 else 0

    return {
        "best_user_id": top[0]["user_id"] if top else None,
        "candidates":   top,
        "model_info":   _model_info(meta),
    }


def _model_info(meta: dict | None = None) -> dict:
    if meta is None:
        _, meta = load_model()
    return {
        "is_trained":    meta is not None,
        "model_label":   meta["model_label"]  if meta else "default_weights",
        "n_samples":     meta["n_samples"]    if meta else 0,
        "accuracy":      meta.get("accuracy") if meta else None,
        "f1":            meta.get("f1")       if meta else None,
        "feature_count": len(FEATURE_NAMES),
    }


def _top_features(fv: dict[str, float], positive: bool, n: int) -> list[str]:
    from ml_config import FEATURE_LABELS, DEFAULT_WEIGHTS  # noqa

    if positive:
        items = {f: fv[f] * DEFAULT_WEIGHTS.get(f, 1) for f in FEATURE_NAMES
                 if fv[f] > 0.6 and DEFAULT_WEIGHTS.get(f, 0) > 0}
        ranked = sorted(items, key=lambda f: items[f], reverse=True)
    else:
        items = {f: fv[f] for f in FEATURE_NAMES
                 if fv[f] < 0.4 and DEFAULT_WEIGHTS.get(f, 0) > 1.0}
        ranked = sorted(items, key=lambda f: items[f])

    return [FEATURE_LABELS.get(r, r) for r in ranked[:n]]
