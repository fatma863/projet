"""
MySQL connection and raw query helpers.
Reads DB_* from the Laravel .env file (or from env vars directly).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import dotenv_values
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

# ---------------------------------------------------------------------------
# Config: try to load from laravel/.env, fallback to env vars
# ---------------------------------------------------------------------------

def _load_env() -> dict[str, str]:
    # 1. local .env next to this file (python/ml/.env)
    local_env = Path(__file__).parent / ".env"
    if local_env.exists():
        return {**dotenv_values(local_env), **os.environ}
    # 2. laravel/.env (monorepo local dev fallback)
    laravel_env = Path(__file__).parent.parent.parent / "laravel" / ".env"
    if laravel_env.exists():
        return {**dotenv_values(laravel_env), **os.environ}
    # 3. Render / production: pure environment variables
    return dict(os.environ)

_ENV: dict[str, str] = _load_env()


def get_engine() -> Engine:
    host     = _ENV.get("DB_HOST", "127.0.0.1")
    port     = _ENV.get("DB_PORT", "3306")
    database = _ENV.get("DB_DATABASE", "projet")
    username = _ENV.get("DB_USERNAME", "root")
    password = _ENV.get("DB_PASSWORD", "")
    url      = f"mysql+pymysql://{username}:{password}@{host}:{port}/{database}?charset=utf8mb4"
    return create_engine(url, pool_pre_ping=True)


_engine: Engine | None = None


def engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = get_engine()
    return _engine


def query_df(sql: str, params: dict[str, Any] | None = None) -> pd.DataFrame:
    with engine().connect() as conn:
        return pd.read_sql(text(sql), conn, params=params)


def query_scalar(sql: str, params: dict[str, Any] | None = None) -> Any:
    with engine().connect() as conn:
        result = conn.execute(text(sql), params or {})
        row = result.fetchone()
        return row[0] if row else None
