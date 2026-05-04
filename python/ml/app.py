"""
FastAPI ML microservice.

Endpoints:
  POST /recommend        — recommend assignees for a (new) task
  GET  /recommend/{task} — recommend for an existing task by ID
  GET  /model-info       — model metadata + feature importances
  POST /train            — trigger retraining (returns metrics)
  POST /feedback/{task}  — record task outcome for future training

Run:
  uvicorn app:app --host 127.0.0.1 --port 8001 --reload
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import recommender
from database import query_df

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml_service")

app = FastAPI(title="ML Task Assignment Service", version="1.0.0")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TaskInput(BaseModel):
    project_id:      int
    priority:        str  = Field(default="medium", pattern="^(low|medium|high|urgent)$")
    issue_type:      str  = Field(default="task",   pattern="^(task|bug|story)$")
    complexity:      int  = Field(default=5, ge=1, le=10)
    story_points:    int | None = None
    estimated_hours: float | None = None
    planned_end:     str | None = None
    sprint_id:       int | None = None
    specialty_ids:   list[int]  = Field(default_factory=list)
    top_n:           int  = Field(default=5, ge=1, le=10)


class FeedbackInput(BaseModel):
    task_id:    int
    on_time:    bool | None = None
    hours_ok:   bool | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/recommend")
def recommend(body: TaskInput) -> dict:
    """Recommend assignees for a task (may not exist yet)."""
    task_dict: dict[str, Any] = body.model_dump(exclude={"top_n"})
    result = recommender.recommend(
        project_id=body.project_id,
        task=task_dict,
        top_n=body.top_n,
    )
    return result


@app.get("/recommend/{task_id}")
def recommend_existing(task_id: int, top_n: int = 5) -> dict:
    """Recommend assignees for an existing task by its ID."""
    row = query_df(
        "SELECT * FROM tasks WHERE id = :tid AND deleted_at IS NULL",
        {"tid": task_id},
    )
    if row.empty:
        raise HTTPException(status_code=404, detail="Task not found")

    task = row.iloc[0].to_dict()

    spec_ids = query_df(
        "SELECT specialty_id FROM task_specialty WHERE task_id = :tid",
        {"tid": task_id},
    )["specialty_id"].astype(int).tolist()

    task_dict: dict[str, Any] = {
        "project_id":     int(task["project_id"]),
        "priority":       task.get("priority") or "medium",
        "issue_type":     task.get("issue_type") or "task",
        "complexity":     float(task.get("complexity") or 5),
        "estimated_hours": task.get("estimated_hours"),
        "sprint_id":      task.get("sprint_id"),
        "specialty_ids":  spec_ids,
    }

    return recommender.recommend(
        project_id=int(task["project_id"]),
        task=task_dict,
        top_n=top_n,
    )


@app.get("/model-info")
def model_info() -> dict:
    """Return model metadata and feature importances."""
    _, meta = recommender.load_model()
    info = recommender._model_info(meta)
    if meta and meta.get("importances"):
        sorted_imp = sorted(
            meta["importances"].items(), key=lambda x: x[1], reverse=True
        )
        info["feature_importances"] = [
            {"feature": k, "importance": round(v, 6)} for k, v in sorted_imp
        ]
    return info


@app.post("/train")
def train_model() -> dict:
    """Trigger model retraining. Returns evaluation metrics."""
    result = recommender.train(verbose=False)
    if result.get("status") == "insufficient_data":
        raise HTTPException(status_code=422, detail=result["message"])
    return result


@app.post("/feedback/{task_id}")
def record_feedback(task_id: int, body: FeedbackInput) -> dict:
    """
    Store task outcome so the next training run includes this signal.
    Called automatically by Laravel when a task moves to 'done'.
    """
    from database import engine
    from sqlalchemy import text

    outcome = None
    if body.on_time is not None:
        outcome = 1 if body.on_time and (body.hours_ok is not False) else 0

    with engine().connect() as conn:
        conn.execute(text("""
            UPDATE ml_assignment_feedback
               SET outcome    = :outcome,
                   on_time    = :on_time,
                   updated_at = NOW()
             WHERE task_id = :tid
        """), {"outcome": outcome, "on_time": body.on_time, "tid": task_id})
        conn.commit()

    return {"status": "recorded", "task_id": task_id, "outcome": outcome}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
