from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

from settings import ENVIRONMENT, LOGFIRE_TOKEN, EnvironmentEnum

# Create engine
if ENVIRONMENT == EnvironmentEnum.TEST:
    # Use a single shared in-memory SQLite DB across the test process
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
elif ENVIRONMENT == EnvironmentEnum.DEV:
    # Anchor DB next to this file to avoid varying CWD creating multiple DBs
    data_dir = Path(__file__).resolve().parent
    data_dir.mkdir(parents=True, exist_ok=True)
    database_path = data_dir / "bitcraft.db"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{database_path}", connect_args={},
    )
else:  # PROD
    import logfire

    logfire.configure(token=LOGFIRE_TOKEN, environment=ENVIRONMENT.value)
    logfire.configure(send_to_logfire=False)
    data_dir = Path("/api/data")
    data_dir.mkdir(parents=True, exist_ok=True)
    database_path = data_dir / "bitcraft.db"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{database_path}", connect_args={},
    )

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
    from models.gamedata import (  # noqa: F401, PLC0415
        GameBuildingExperiencePerProgressOrm,
        GameBuildingRecipeConsumedCargoOrm,
        GameBuildingRecipeConsumedItemOrm,
        GameBuildingRecipeLevelRequirementOrm,
        GameBuildingRecipeOrm,
        GameBuildingRecipeToolRequirementOrm,
        GameBuildingTypeOrm,
        GameCargoOrm,
        GameItemOrm,
        GameItemRecipeOrm,
    )
    from models.projects import ProjectItemOrm, ProjectOrm  # noqa: F401, PLC0415
    from models.users import (  # noqa: F401, PLC0415
        UserGroupInviteOrm,
        UserGroupMembership,
        UserGroupOrm,
        UserOrm,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
