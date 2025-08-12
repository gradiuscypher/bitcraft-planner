from logging.config import fileConfig
import os
from typing import Any

from sqlalchemy import engine_from_config, pool

from alembic import context

# Alembic Config, provides access to values in alembic.ini
config = context.config

# Configure logging from alembic.ini if present
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import app metadata and models so Alembic can autogenerate migrations
# The ini's prepend_sys_path = . ensures this file's dir (api/) is on sys.path
import models.gamedata  # noqa: E402
import models.projects  # noqa: E402
import models.users  # noqa: F401, E402
from database import Base  # noqa: E402
from database import engine as async_engine  # noqa: E402


def _derive_sync_url_from_async(async_url: str) -> str:
    """Convert async SQLAlchemy URL to its synchronous form.

    Examples:
    - sqlite+aiosqlite:///path/to.db -> sqlite:///path/to.db
    - postgresql+asyncpg://... -> postgresql://...
    """
    if "+" in async_url:
        dialect, rest = async_url.split("+", 1)
        # rest may still contain "://" and credentials
        if "://" in rest:
            _, suffix = rest.split("://", 1)
            return f"{dialect}://{suffix}"
    return async_url


def _get_sqlalchemy_url() -> str:
    """Determine the SQLAlchemy URL for Alembic.

    Priority:
    1) -x sqlite_url=... (or generally any "url" override via x arg)
    2) Derive from application's async engine URL
    3) Fallback to alembic.ini sqlalchemy.url
    """
    # Allow environment variable override when CLI -x is unavailable
    env_override = os.getenv("ALEMBIC_URL") or os.getenv("ALEMBIC_SQLALCHEMY_URL")
    if env_override:
        return str(env_override)

    x_args: dict[str, Any] = context.get_x_argument(as_dictionary=True)
    override_url = x_args.get("sqlite_url") or x_args.get("url")
    if override_url:
        return str(override_url)

    try:
        async_url = str(async_engine.url)
        return _derive_sync_url_from_async(async_url)
    except Exception:
        # Fallback to value from alembic.ini
        return config.get_main_option("sqlalchemy.url")


# Names of SQLite FTS virtual and auxiliary tables that must be ignored during
# Alembic autogenerate. Reflecting these can fail on systems where SQLite is
# compiled without FTS5 support, resulting in "vtable constructor failed".
FTS_TABLE_NAMES: set[str] = {
    "items_fts",
    "items_fts_data",
    "items_fts_docsize",
    "items_fts_config",
    "items_fts_idx",
    "buildings_fts",
    "buildings_fts_data",
    "buildings_fts_docsize",
    "buildings_fts_config",
    "buildings_fts_idx",
    "cargo_fts",
    "cargo_fts_data",
    "cargo_fts_docsize",
    "cargo_fts_config",
    "cargo_fts_idx",
}


# Set target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no DBAPI required)."""
    url = _get_sqlalchemy_url()
    # write the resolved URL into config for script context
    config.set_main_option("sqlalchemy.url", url)

    def include_name(name: str, type_: str, parent_names: dict[str, str] | None) -> bool:
        # Prevent Alembic from reflecting FTS tables at all
        return not (type_ == "table" and name in FTS_TABLE_NAMES)

    def include_object(
        obj: Any, name: str, type_: str, reflected: bool, compare_to: Any | None
    ) -> bool:
        # Additional safeguard at the object level
        return not (type_ == "table" and name in FTS_TABLE_NAMES)

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_name=include_name,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode using a Connection."""
    url = _get_sqlalchemy_url()
    config.set_main_option("sqlalchemy.url", url)

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        def include_name(name: str, type_: str, parent_names: dict[str, str] | None) -> bool:
            return not (type_ == "table" and name in FTS_TABLE_NAMES)

        def include_object(
            obj: Any, name: str, type_: str, reflected: bool, compare_to: Any | None
        ) -> bool:
            return not (type_ == "table" and name in FTS_TABLE_NAMES)

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            render_as_batch=connection.dialect.name == "sqlite",
            include_name=include_name,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
