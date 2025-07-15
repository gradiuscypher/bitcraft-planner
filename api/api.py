import logging
import os
from typing import Any

import logfire
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from helpers import (
    fuzzy_search_all,
    fuzzy_search_buildings,
    fuzzy_search_cargo,
    fuzzy_search_items,
    get_best_match,
    load_building_recipes,
    load_cargo_descriptions,
    load_item_descriptions,
)
from models import Cargo, Item, ItemRecipe

load_dotenv()

LOGFIRE_TOKEN = os.getenv("LOGFIRE_TOKEN")
ENVIRONMENT = os.getenv("ENVIRONMENT")

logger = logging.getLogger(__name__)
logfire.configure(token=LOGFIRE_TOKEN, environment=ENVIRONMENT)

items_by_name, items_by_id = load_item_descriptions()
buildings_by_name, buildings_by_id = load_building_recipes()
cargo_by_name, cargo_by_id = load_cargo_descriptions()

logger.info("Loading items...")
all_items = Item.all_items()
logger.info("Items loaded")

logger.info("Loading cargo...")
all_cargo = Cargo.all_cargo()
logger.info("Cargo loaded")

app = FastAPI()
logfire.instrument_fastapi(app)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative React dev server
        "http://127.0.0.1:5173",  # Alternative localhost format
        "https://bitcraft.derp.tools",  # Production domain
        "http://bitcraft.derp.tools",   # Production domain (HTTP)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

class SearchResult(BaseModel):
    name: str
    score: float
    id: int
    type: str | None = None

class SearchResponse(BaseModel):
    results: list[SearchResult]
    query: str
    search_type: str


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "BitCraft Planner API"}


@app.get("/item/{item_id}")
async def get_item(item_id: int) -> Item:
    """Get item by ID"""
    if item_id not in all_items:
        raise HTTPException(status_code=404, detail="Item not found")
    item = all_items[item_id]
    item.recipe = ItemRecipe.item_recipe(item_id)
    return item


@app.get("/building/{building_id}")
async def get_building(building_id: int) -> dict[str, Any]:
    """Get building by ID"""
    return buildings_by_id[building_id]


@app.get("/cargo/{item_id}")
async def get_cargo(item_id: int) -> Cargo:
    """Get cargo by ID"""
    if item_id not in all_cargo:
        raise HTTPException(status_code=404, detail="Cargo not found")
    cargo = all_cargo[item_id]
    cargo.recipe = ItemRecipe.item_recipe(item_id)
    return cargo


@app.get("/search/items")
async def search_items(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
    """Search for items using fuzzy matching"""
    results = fuzzy_search_items(query, limit, score_cutoff)
    return SearchResponse(
        results=[SearchResult(name=name, score=score, id=item_id, type="item") for name, score, item_id in results],
        query=query,
        search_type="items",
    )

@app.get("/search/buildings")
async def search_buildings(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
    """Search for buildings using fuzzy matching"""
    results = fuzzy_search_buildings(query, limit, score_cutoff)
    return SearchResponse(
        results=[SearchResult(name=name, score=score, id=building_id, type="building") for name, score, building_id in results],
        query=query,
        search_type="buildings",
    )

@app.get("/search/cargo")
async def search_cargo(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
    """Search for cargo using fuzzy matching"""
    results = fuzzy_search_cargo(query, limit, score_cutoff)
    return SearchResponse(
        results=[SearchResult(name=name, score=score, id=cargo_id, type="cargo") for name, score, cargo_id in results],
        query=query,
        search_type="cargo",
    )

@app.get("/search/all")
async def search_all(query: str, limit: int = 5, score_cutoff: float = 60.0) -> dict:
    """Search across all categories using fuzzy matching"""
    results = fuzzy_search_all(query, limit, score_cutoff)
    return {
        "query": query,
        "items": [SearchResult(name=name, score=score, id=item_id, type="item") for name, score, item_id in results["items"]],
        "buildings": [SearchResult(name=name, score=score, id=building_id, type="building") for name, score, building_id in results["buildings"]],
        "cargo": [SearchResult(name=name, score=score, id=cargo_id, type="cargo") for name, score, cargo_id in results["cargo"]],
    }

@app.get("/search/best")
async def get_best_match_endpoint(query: str, search_type: str = "all") -> SearchResult | None:
    """Get the single best match across specified search type"""
    if search_type not in ["items", "buildings", "cargo", "all"]:
        raise HTTPException(status_code=400, detail="search_type must be one of: items, buildings, cargo, all")

    result = get_best_match(query, search_type)
    if result:
        name, score, item_id, match_type = result
        return SearchResult(name=name, score=score, id=item_id, type=match_type)
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8000)
