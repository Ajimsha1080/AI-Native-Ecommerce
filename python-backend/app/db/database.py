import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import text

# Base declarative class
Base = declarative_base()

# Resolve Database URL
# In enterprise production: postgresql+asyncpg://user:pass@host:5432/dbname
# In local dev: sqlite+aiosqlite:///./data/aaas_enterprise.db
DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
DEFAULT_DATA_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_DB_PATH = DEFAULT_DATA_DIR / "aaas_enterprise.db"

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Default to async SQLite driver for standalone dev testing
    DATABASE_URL = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH.as_posix()}"
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

from sqlalchemy.pool import NullPool

# Engine options
engine_kwargs = {
    "echo": False,
    "future": True,
}

if "sqlite" in DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = NullPool
else:
    # PostgreSQL 16 enterprise pooling settings
    engine_kwargs["pool_size"] = 25
    engine_kwargs["max_overflow"] = 15
    engine_kwargs["pool_recycle"] = 1800
    engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injector for FastAPI endpoints"""
    async with async_session_factory() as session:
        yield session

@asynccontextmanager
async def tenant_session(tenant_id: str) -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager that sets PostgreSQL Row-Level Security tenant context
    using `SET LOCAL app.current_tenant = :tenant_id` within the active transaction.
    """
    async with async_session_factory() as session:
        async with session.begin():
            if "sqlite" not in DATABASE_URL and tenant_id:
                await session.execute(text(f"SET LOCAL app.current_tenant = '{tenant_id}'"))
            yield session

async def init_db():
    """Initializes database schema, pgvector extension, and RLS tables asynchronously"""
    from . import models
    from .models import generate_rls_sql
    
    async with engine.begin() as conn:
        if "postgresql" in DATABASE_URL:
            # Enable pgvector extension
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            except Exception as e:
                print(f"Notice: pgvector extension creation deferred: {e}")
        
        await conn.run_sync(Base.metadata.create_all)
        
        if "postgresql" in DATABASE_URL:
            # Apply RLS policies
            try:
                rls_statements = generate_rls_sql()
                for stmt in rls_statements.split(";"):
                    stmt = stmt.strip()
                    if stmt:
                        await conn.execute(text(stmt))
            except Exception as e:
                print(f"Notice: RLS policy application: {e}")
