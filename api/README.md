# BitCraft Planner API

A FastAPI-based API for searching and managing BitCraft game data with fuzzy search capabilities.

## Features

- **Fuzzy Search**: Search across items, buildings, and cargo with intelligent matching
- **RESTful API**: Clean REST endpoints for web integration
- **Multiple Search Types**: Search specific categories or all at once
- **Configurable Scoring**: Adjust search sensitivity with score cutoffs
- **Best Match**: Get the single best match across all categories

## Dependencies

- Python 3.13+
- FastAPI
- RapidFuzz (for fuzzy string matching)

## Installation

1. Install dependencies:
```bash
uv sync
```

2. Run the API:
```bash
uv run fastapi dev api.py
```

### Testing

Run test suite (in-memory DB):

```bash
ENVIRONMENT=test uv run pytest -vv
```

Lint and format:

```bash
uv run ruff check .
uv run ruff format .
```

## API Endpoints

### Search Endpoints

- `GET /search/items?query=<search_term>` - Search for items
- `GET /search/buildings?query=<search_term>` - Search for buildings  
- `GET /search/cargo?query=<search_term>` - Search for cargo
- `GET /search/all?query=<search_term>` - Search across all categories
- `GET /search/best?query=<search_term>` - Get single best match

### Parameters

- `query` (required): Search term
- `limit` (optional): Maximum results to return (default: 5)
- `score_cutoff` (optional): Minimum similarity score 0-100 (default: 60.0)
- `search_type` (optional, for `/search/best`): Category to search in (default: "all")

### Example Usage

```bash
# Search for items containing "wood"
curl "http://localhost:8000/search/items?query=wood&limit=3"

# Search all categories for "iron"
curl "http://localhost:8000/search/all?query=iron"

# Get best match for a search term
curl "http://localhost:8000/search/best?query=pickaxe"
```

## Fuzzy Search Functions

The `helpers.py` module provides the following fuzzy search functions:

### `fuzzy_search_items(query, limit=5, score_cutoff=60.0)`
Search for items by name with fuzzy matching.

### `fuzzy_search_buildings(query, limit=5, score_cutoff=60.0)`
Search for buildings by name with fuzzy matching.

### `fuzzy_search_cargo(query, limit=5, score_cutoff=60.0)`
Search for cargo by name with fuzzy matching.

### `fuzzy_search_all(query, limit=5, score_cutoff=60.0)`
Search across all categories simultaneously.

### `get_best_match(query, search_type='all')`
Get the single highest-scoring match across specified categories.

## Example Usage (Python)

```python
from helpers import fuzzy_search_items, get_best_match

# Search for items
results = fuzzy_search_items("wood", limit=3)
for name, score, item_id in results:
    print(f"{name} (ID: {item_id}) - Score: {score}")

# Get best match
best_match = get_best_match("pickaxe")
if best_match:
    name, score, item_id, match_type = best_match
    print(f"Best match: {name} - Type: {match_type}")
```

## Demo Script

Run the interactive demo:
```bash
python example_usage.py
```

This will demonstrate various fuzzy search capabilities and provide an interactive search interface.

## How Fuzzy Search Works

The fuzzy search implementation uses RapidFuzz's `WRatio` scorer, which:

1. **Handles typos**: "sward" → "sword"
2. **Partial matches**: "pick" → "pickaxe"
3. **Case insensitive**: "Wood" → "wood"
4. **Word order**: "iron sword" → "sword iron"

Scores range from 0-100, where 100 is a perfect match. The default cutoff of 60.0 provides a good balance between precision and recall.

## Configuration

Update the `BITCRAFT_GAMEDATA_DIR` path in `helpers.py` to point to your BitCraft game data directory:

```python
BITCRAFT_GAMEDATA_DIR = "/path/to/your/BitCraft_GameData/server/region"
```