.PHONY: api test seed lint fmt migrate upgrade downgrade stamp db-init
api:
	uv run uvicorn api:app --host 0.0.0.0 --port 8000 --reload

test:
	uv run pytest tests/ -vv

# Build and seed the database with game data and FTS tables
seed:
	uv run python -c "import asyncio; from models.gamedata import build_everything; asyncio.run(build_everything())"

# Lint and format
lint:
	uv run ruff check .

fmt:
	uv run ruff format .

# Alembic helpers
# Usage examples:
#   make migrate m="add new table"
#   make upgrade
#   make downgrade
#   make stamp

migrate:
	uv run python -m alembic -c alembic.ini revision --autogenerate -m "$(m)"

upgrade:
	uv run python -m alembic -c alembic.ini upgrade head

downgrade:
	uv run python -m alembic -c alembic.ini downgrade -1

stamp:
	uv run python -m alembic -c alembic.ini stamp head

# Initialize Alembic with a temporary empty DB to capture full schema
db-init:
	ALEMBIC_URL=sqlite:///./.alembic_tmp.db uv run python -m alembic -c alembic.ini revision --autogenerate -m "initial schema"