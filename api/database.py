from collections.abc import AsyncGenerator
from pathlib import Path

import logfire
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from settings import ENVIRONMENT, LOGFIRE_TOKEN, EnvironmentEnum

# Only configure logfire if token is provided
if LOGFIRE_TOKEN:
    logfire.configure(token=LOGFIRE_TOKEN, environment=ENVIRONMENT.value)
else:
    # Configure logfire to not send data when no token is provided
    logfire.configure(send_to_logfire=False)

# Create engine
if ENVIRONMENT == EnvironmentEnum.TEST:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args={})
elif ENVIRONMENT == EnvironmentEnum.DEV:
    data_dir = Path.cwd()
    data_dir.mkdir(parents=True, exist_ok=True)
    database_path = data_dir / "bitcraft.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}", connect_args={})
else:  # PROD
    data_dir = Path("/api/data")
    data_dir.mkdir(parents=True, exist_ok=True)
    database_path = data_dir / "bitcraft.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}", connect_args={})

logfire.instrument_sqlalchemy(engine)


# Create session
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        await db.close()


async def reset_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def init_database() -> None:
    """Initialize database tables if they don't exist"""
    # Import models to ensure they're registered with Base
    from models.crafting import CraftingProjectOrm, CraftingProjectItemOrm  # noqa: F401
    from models.users import User  # noqa: F401
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
