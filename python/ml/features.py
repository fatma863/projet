"""
Feature engineering for the ML task-assignment recommendation model.

Produces a 22-dimensional normalized feature vector [0, 1] for each
(user_id, task_attributes) pair.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from database import query_df

# ---------------------------------------------------------------------------
# Feature names (must match FeatureExtractor::FEATURE_NAMES in PHP)
# ---------------------------------------------------------------------------

FEATURE_NAMES: list[str] = [
    # Skill match
    "specialty_exact_match",
    "specialty_partial_match",
    "specialty_breadth",
    # Workload
    "current_task_load",
    "capacity_utilization",
    "overdue_ratio_inv",
    # Historical performance
    "overall_completion_rate",
    "on_time_rate",
    "hours_accuracy",
    # Task-specific affinity
    "same_priority_success",
    "same_type_success",
    "complexity_affinity",
    # Context
    "project_familiarity",
    "team_familiarity",
    "project_role_weight",
    # Trend
    "recent_velocity",
    "performance_trend",
    "recent_on_time_rate",
    # Risk
    "at_risk_tasks_inv",
    "experience_depth",
    "collaboration_score",
    "sprint_alignment",
]


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _normalize(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 0.5
    return _clamp((value - lo) / (hi - lo))


# ---------------------------------------------------------------------------
# Cached bulk loaders (avoid N+1 queries)
# ---------------------------------------------------------------------------

class FeatureCache:
    """Holds bulk-fetched data for a batch of users in one project."""

    def __init__(self, user_ids: list[int], project_id: int) -> None:
        self.user_ids   = user_ids
        self.project_id = project_id
        self._load()

    def _load(self) -> None:
        uid_in = ",".join(str(u) for u in self.user_ids)

        # --- User specialties ---
        self.user_specialties: dict[int, list[int]] = {u: [] for u in self.user_ids}
        if uid_in:
            df = query_df(f"""
                SELECT user_id, specialty_id FROM user_specialty
                WHERE user_id IN ({uid_in})
            """)
            for _, row in df.iterrows():
                self.user_specialties[int(row.user_id)].append(int(row.specialty_id))

        # --- Project members ---
        self.project_member_ids: list[int] = []
        df = query_df("""
            SELECT user_id FROM project_user WHERE project_id = :pid
            UNION
            SELECT user_id FROM project_members WHERE project_id = :pid
        """, {"pid": self.project_id})
        self.project_member_ids = df["user_id"].astype(int).tolist()

        # --- Project roles ---
        self.project_roles: dict[int, str] = {}
        df1 = query_df(
            "SELECT user_id, role FROM project_user WHERE project_id = :pid",
            {"pid": self.project_id},
        )
        for _, row in df1.iterrows():
            self.project_roles[int(row.user_id)] = row.role

        df2 = query_df(
            "SELECT user_id, project_role FROM project_members WHERE project_id = :pid",
            {"pid": self.project_id},
        )
        for _, row in df2.iterrows():
            uid = int(row.user_id)
            existing = self.project_roles.get(uid, "guest")
            rank = {"admin": 3, "chef": 3, "member": 2, "guest": 1}
            if rank.get(row.project_role, 1) > rank.get(existing, 1):
                self.project_roles[uid] = row.project_role

        # --- All task assignments for these users ---
        self.assignments: pd.DataFrame = pd.DataFrame()
        if uid_in:
            self.assignments = query_df(f"""
                SELECT
                    ta.user_id,
                    ta.created_at AS assigned_at,
                    t.id AS task_id,
                    t.project_id,
                    t.workflow_status,
                    t.priority,
                    t.issue_type,
                    t.complexity,
                    t.due_date,
                    t.updated_at,
                    t.estimated_hours,
                    t.actual_hours,
                    t.sprint_id
                FROM task_assignments ta
                JOIN tasks t ON t.id = ta.task_id
                WHERE ta.user_id IN ({uid_in})
                  AND t.deleted_at IS NULL
            """)
            if not self.assignments.empty:
                self.assignments["user_id"]    = self.assignments["user_id"].astype(int)
                self.assignments["due_date"]   = pd.to_datetime(self.assignments["due_date"],   errors="coerce")
                self.assignments["updated_at"] = pd.to_datetime(self.assignments["updated_at"], errors="coerce")
                self.assignments["assigned_at"] = pd.to_datetime(self.assignments["assigned_at"], errors="coerce")


# ---------------------------------------------------------------------------
# Feature extractor
# ---------------------------------------------------------------------------

class FeatureExtractor:
    def __init__(self, cache: FeatureCache) -> None:
        self.cache = cache

    def extract(self, user_id: int, task: dict[str, Any]) -> dict[str, float]:
        c    = self.cache
        rows = c.assignments
        uid  = user_id

        user_rows = rows[rows["user_id"] == uid] if not rows.empty else pd.DataFrame()

        required_spec_ids: list[int] = task.get("specialty_ids", [])
        user_spec_ids: list[int]     = c.user_specialties.get(uid, [])
        task_priority: str           = task.get("priority", "medium")
        task_type: str               = task.get("issue_type", "task")
        task_complexity: float       = float(task.get("complexity", 5))
        task_sprint_id: int | None   = task.get("sprint_id")
        project_id: int              = task["project_id"]

        return {
            # Skill match
            "specialty_exact_match":   self._spec_exact(user_spec_ids, required_spec_ids),
            "specialty_partial_match": self._spec_partial(user_spec_ids, required_spec_ids),
            "specialty_breadth":       _normalize(len(user_spec_ids), 0, 10),

            # Workload
            "current_task_load":   self._task_load_inv(user_rows),
            "capacity_utilization": self._capacity_inv(user_rows),
            "overdue_ratio_inv":   self._overdue_inv(user_rows),

            # Performance
            "overall_completion_rate": self._completion_rate(user_rows),
            "on_time_rate":            self._on_time_rate(user_rows),
            "hours_accuracy":          self._hours_accuracy(user_rows),

            # Affinity
            "same_priority_success": self._same_priority(user_rows, task_priority),
            "same_type_success":     self._same_type(user_rows, task_type),
            "complexity_affinity":   self._complexity_affinity(user_rows, task_complexity),

            # Context
            "project_familiarity":  self._project_familiarity(user_rows, project_id),
            "team_familiarity":     self._team_familiarity(uid, project_id),
            "project_role_weight":  self._role_weight(uid),

            # Trend
            "recent_velocity":    self._recent_velocity(user_rows),
            "performance_trend":  self._performance_trend(user_rows),
            "recent_on_time_rate": self._recent_on_time(user_rows),

            # Risk
            "at_risk_tasks_inv":   self._at_risk_inv(user_rows),
            "experience_depth":    _normalize(int((user_rows["workflow_status"] == "done").sum()), 0, 100),
            "collaboration_score": self._collaboration(uid, project_id),
            "sprint_alignment":    self._sprint_alignment(user_rows, task_sprint_id),
        }

    # ------------------------------------------------------------------
    # Skill features
    # ------------------------------------------------------------------

    def _spec_exact(self, user_ids: list[int], req_ids: list[int]) -> float:
        if not req_ids:
            return 0.5
        return 1.0 if all(r in user_ids for r in req_ids) else 0.0

    def _spec_partial(self, user_ids: list[int], req_ids: list[int]) -> float:
        if not req_ids:
            return 0.5
        matched = len(set(user_ids) & set(req_ids))
        return matched / len(req_ids)

    # ------------------------------------------------------------------
    # Workload
    # ------------------------------------------------------------------

    def _active_rows(self, rows: pd.DataFrame) -> pd.DataFrame:
        if rows.empty:
            return rows
        return rows[rows["workflow_status"].isin(["todo", "in_progress", "at_risk"])]

    def _task_load_inv(self, rows: pd.DataFrame) -> float:
        cnt = len(self._active_rows(rows))
        return _clamp(1 - cnt / 8)

    def _capacity_inv(self, rows: pd.DataFrame) -> float:
        active = self._active_rows(rows)
        if active.empty:
            return 1.0
        total_alloc = len(active) * 100  # assume 100% per task
        return _clamp(1 - total_alloc / 100)

    def _overdue_inv(self, rows: pd.DataFrame) -> float:
        active = self._active_rows(rows)
        if active.empty:
            return 1.0
        now = pd.Timestamp.now()
        overdue = active[
            active["due_date"].notna() & (active["due_date"] < now)
        ]
        return _clamp(1 - len(overdue) / max(len(active), 1))

    # ------------------------------------------------------------------
    # Historical performance
    # ------------------------------------------------------------------

    def _completion_rate(self, rows: pd.DataFrame) -> float:
        if rows.empty:
            return 0.5
        total = len(rows)
        done  = (rows["workflow_status"] == "done").sum()
        return _clamp(done / total)

    def _on_time_rate(self, rows: pd.DataFrame) -> float:
        done_with_due = rows[
            (rows["workflow_status"] == "done") & rows["due_date"].notna()
        ]
        if done_with_due.empty:
            return 0.5
        on_time = (done_with_due["updated_at"] <= done_with_due["due_date"]).sum()
        return _clamp(on_time / len(done_with_due))

    def _hours_accuracy(self, rows: pd.DataFrame) -> float:
        valid = rows[
            (rows["workflow_status"] == "done")
            & rows["estimated_hours"].notna()
            & rows["actual_hours"].notna()
            & (rows["estimated_hours"] > 0)
        ]
        if valid.empty:
            return 0.5
        errors = ((valid["actual_hours"] - valid["estimated_hours"]).abs() / valid["estimated_hours"]).clip(0, 1)
        return _clamp(1 - errors.mean())

    # ------------------------------------------------------------------
    # Affinity
    # ------------------------------------------------------------------

    def _same_priority(self, rows: pd.DataFrame, priority: str) -> float:
        same = rows[rows["priority"] == priority]
        if same.empty:
            return 0.5
        done = (same["workflow_status"] == "done").sum()
        return _clamp(done / len(same))

    def _same_type(self, rows: pd.DataFrame, issue_type: str) -> float:
        same = rows[rows["issue_type"] == issue_type]
        if same.empty:
            return 0.5
        done = (same["workflow_status"] == "done").sum()
        return _clamp(done / len(same))

    def _complexity_affinity(self, rows: pd.DataFrame, task_complexity: float) -> float:
        done = rows[rows["workflow_status"] == "done"]
        if done.empty or done["complexity"].isna().all():
            return 0.5
        avg_c = done["complexity"].dropna().mean()
        sigma = 2.5
        return float(math.exp(-((avg_c - task_complexity) ** 2) / (2 * sigma**2)))

    # ------------------------------------------------------------------
    # Context
    # ------------------------------------------------------------------

    def _project_familiarity(self, rows: pd.DataFrame, project_id: int) -> float:
        in_proj = rows[(rows["project_id"] == project_id) & (rows["workflow_status"] == "done")]
        cnt = len(in_proj)
        if cnt > 0:
            return _clamp(cnt / 10)
        in_proj_any = rows[rows["project_id"] == project_id]
        return 0.3 if not in_proj_any.empty else 0.0

    def _team_familiarity(self, user_id: int, project_id: int) -> float:
        other_ids = [i for i in self.cache.project_member_ids if i != user_id]
        if not other_ids:
            return 0.0
        other_in = ",".join(str(i) for i in other_ids)
        count = query_df(f"""
            SELECT COUNT(DISTINCT pu1.project_id) AS cnt
            FROM project_user pu1
            JOIN project_user pu2 ON pu1.project_id = pu2.project_id
            WHERE pu1.user_id = :uid
              AND pu2.user_id IN ({other_in})
              AND pu1.project_id != :pid
        """, {"uid": user_id, "pid": project_id})["cnt"].iloc[0]
        return _normalize(int(count), 0, 5)

    def _role_weight(self, user_id: int) -> float:
        role = self.cache.project_roles.get(user_id, "guest")
        return {"admin": 1.0, "chef": 1.0, "member": 0.7}.get(role, 0.3)

    # ------------------------------------------------------------------
    # Trend
    # ------------------------------------------------------------------

    def _recent_velocity(self, rows: pd.DataFrame) -> float:
        now   = pd.Timestamp.now()
        cutoff = now - pd.Timedelta(days=30)
        recent = rows[(rows["workflow_status"] == "done") & (rows["updated_at"] >= cutoff)]
        return _normalize(len(recent), 0, 15)

    def _performance_trend(self, rows: pd.DataFrame) -> float:
        now   = pd.Timestamp.now()
        d30   = now - pd.Timedelta(days=30)
        d60   = now - pd.Timedelta(days=60)

        def ot_rate(subset: pd.DataFrame) -> float | None:
            s = subset[subset["due_date"].notna()]
            if len(s) < 2:
                return None
            return float((s["updated_at"] <= s["due_date"]).sum() / len(s))

        recent = rows[(rows["workflow_status"] == "done") & (rows["updated_at"] >= d30)]
        prev   = rows[(rows["workflow_status"] == "done") & (rows["updated_at"].between(d60, d30))]

        r_rate = ot_rate(recent)
        p_rate = ot_rate(prev)

        if r_rate is None or p_rate is None:
            return 0.5
        delta = r_rate - p_rate
        return _normalize(delta, -0.5, 0.5)

    def _recent_on_time(self, rows: pd.DataFrame) -> float:
        now   = pd.Timestamp.now()
        cutoff = now - pd.Timedelta(days=30)
        recent = rows[(rows["workflow_status"] == "done") & (rows["updated_at"] >= cutoff)]
        with_due = recent[recent["due_date"].notna()]
        if with_due.empty:
            return 0.5
        on_time = (with_due["updated_at"] <= with_due["due_date"]).sum()
        return _clamp(on_time / len(with_due))

    # ------------------------------------------------------------------
    # Risk
    # ------------------------------------------------------------------

    def _at_risk_inv(self, rows: pd.DataFrame) -> float:
        at_risk = (rows["workflow_status"] == "at_risk").sum()
        return _clamp(1 - at_risk / 5)

    def _collaboration(self, user_id: int, project_id: int) -> float:
        other_ids = [i for i in self.cache.project_member_ids if i != user_id]
        if not other_ids:
            return 0.0
        other_in = ",".join(str(i) for i in other_ids)
        count = query_df(f"""
            SELECT COUNT(DISTINCT ta1.task_id) AS cnt
            FROM task_assignments ta1
            JOIN task_assignments ta2 ON ta1.task_id = ta2.task_id
            JOIN tasks t ON t.id = ta1.task_id
            WHERE ta1.user_id = :uid
              AND ta2.user_id IN ({other_in})
              AND t.deleted_at IS NULL
        """, {"uid": user_id})["cnt"].iloc[0]
        return _normalize(int(count), 0, 10)

    def _sprint_alignment(self, rows: pd.DataFrame, sprint_id: int | None) -> float:
        if sprint_id is None:
            return 0.5
        active_sprint = rows[
            (rows["sprint_id"] == sprint_id)
            & (rows["workflow_status"].isin(["todo", "in_progress"]))
        ]
        return 0.9 if not active_sprint.empty else 0.4
