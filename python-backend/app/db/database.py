import os
import ssl
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import text

# Base declarative class
Base = declarative_base()

DEFAULT_LOCAL_URL = "postgresql+asyncpg://shopmate_app:shopmate_secure_app_pwd_2026@192.168.107.58:5432/aaas_enterprise"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_LOCAL_URL)

if DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Engine options
if os.getenv("TESTING") == "true" or os.getenv("PYTEST_CURRENT_TEST"):
    from sqlalchemy.pool import NullPool
    engine_kwargs = {
        "echo": False,
        "future": True,
        "poolclass": NullPool,
        "pool_pre_ping": True,
    }
else:
    engine_kwargs = {
        "echo": False,
        "future": True,
        "pool_size": 25,
        "max_overflow": 15,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    }

# SSL configuration for asyncpg in production
if os.getenv("DATABASE_SSL") == "true" or (
    os.getenv("APP_ENV") == "production" and "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL
):
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = True
    ssl_ctx.verify_mode = ssl.CERT_REQUIRED
    ca_path = os.getenv("DATABASE_CA_PATH")
    if ca_path and os.path.exists(ca_path):
        ssl_ctx.load_verify_locations(cafile=ca_path)
    engine_kwargs["connect_args"] = {"ssl": ssl_ctx}

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
    using `set_config('app.current_tenant', :tenant, true)` within the active transaction.
    """
    async with async_session_factory() as session:
        async with session.begin():
            if tenant_id:
                await session.execute(
                    text("SELECT set_config('app.current_tenant', :tenant, true)"),
                    {"tenant": tenant_id}
                )
            yield session

async def init_db():
    """Initializes database schema, pgvector extension, and verifies connectivity."""
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1;"))
