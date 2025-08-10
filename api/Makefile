.PHONY: api test seed lint fmt
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