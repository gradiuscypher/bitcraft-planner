from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from helpers import (
    fuzzy_search_all,
    fuzzy_search_buildings,
    fuzzy_search_cargo,
    fuzzy_search_items,
    get_best_match,
)

app = FastAPI()

class SearchResult(BaseModel):
    name: str
    score: float
    id: str
    type: str | None = None

class SearchResponse(BaseModel):
    results: list[SearchResult]
    query: str
    search_type: str

@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "BitCraft Planner API"}

@app.get("/search/items")
async def search_items(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
    """Search for items using fuzzy matching"""
    results = fuzzy_search_items(query, limit, score_cutoff)
    return SearchResponse(
        results=[SearchResult(name=name, score=score, id=str(item_id), type="item") for name, score, item_id in results],
        query=query,
        search_type="items",
    )

@app.get("/search/buildings")
async def search_buildings(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
    """Search for buildings using fuzzy matching"""
    results = fuzzy_search_buildings(query, limit, score_cutoff)
    return SearchResponse(
        results=[SearchResult(name=name, score=score, id=str(building_id), type="building") for name, score, building_id in results],
        query=query,
        search_type="buildings",
    )

@app.get("/search/cargo")
async def search_cargo(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
    """Search for cargo using fuzzy matching"""
    results = fuzzy_search_cargo(query, limit, score_cutoff)
    return SearchResponse(
        results=[SearchResult(name=name, score=score, id=str(cargo_id), type="cargo") for name, score, cargo_id in results],
        query=query,
        search_type="cargo",
    )

@app.get("/search/all")
async def search_all(query: str, limit: int = 5, score_cutoff: float = 60.0) -> dict:
    """Search across all categories using fuzzy matching"""
    results = fuzzy_search_all(query, limit, score_cutoff)
    return {
        "query": query,
        "items": [SearchResult(name=name, score=score, id=str(item_id), type="item") for name, score, item_id in results["items"]],
        "buildings": [SearchResult(name=name, score=score, id=str(building_id), type="building") for name, score, building_id in results["buildings"]],
        "cargo": [SearchResult(name=name, score=score, id=str(cargo_id), type="cargo") for name, score, cargo_id in results["cargo"]],
    }

@app.get("/search/best")
async def get_best_match_endpoint(query: str, search_type: str = "all") -> SearchResult | None:
    """Get the single best match across specified search type"""
    if search_type not in ["items", "buildings", "cargo", "all"]:
        raise HTTPException(status_code=400, detail="search_type must be one of: items, buildings, cargo, all")

    result = get_best_match(query, search_type)
    if result:
        name, score, item_id, match_type = result
        return SearchResult(name=name, score=score, id=str(item_id), type=match_type)
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8000)
