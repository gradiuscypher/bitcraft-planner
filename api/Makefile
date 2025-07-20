.PHONY: api test
api:
	uv run uvicorn api:app --host 0.0.0.0 --port 8000 --reload

test:
	uv run pytest tests/ -vv