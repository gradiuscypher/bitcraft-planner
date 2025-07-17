import logging
from typing import Any

from fastapi import APIRouter, HTTPException
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
from models.items import Cargo, Item, ItemRecipe

logger = logging.getLogger(__name__)

# Load data (this will be moved to a shared location later if needed)
items_by_name, items_by_id = load_item_descriptions()
buildings_by_name, buildings_by_id = load_building_recipes()
cargo_by_name, cargo_by_id = load_cargo_descriptions()

all_items = Item.all_items()
all_cargo = Cargo.all_cargo()

# Create the router
items = APIRouter()


class SearchResult(BaseModel):
    name: str
    score: float
    id: int
    type: str | None = None

class SearchResponse(BaseModel):
    results: list[SearchResult]
    query: str
    search_type: str


@items.get("/")
async def root() -> dict[str, str]:
    return {"message": "BitCraft Planner API"}


@items.get("/item/{item_id}")
async def get_item(item_id: int) -> Item:
    """Get item by ID"""
    if item_id not in all_items:
        raise HTTPException(status_code=404, detail="Item not found")
    item = all_items[item_id]
    item.recipe = ItemRecipe.item_recipe(item_id)
    return item


@items.get("/building/{building_id}")
async def get_building(building_id: int) -> dict[str, Any]:
    """Get building by ID"""
    return buildings_by_id[building_id]


@items.get("/cargo/{item_id}")
async def get_cargo(item_id: int) -> Cargo:
    """Get cargo by ID"""
    if item_id not in all_cargo:
        raise HTTPException(status_code=404, detail="Cargo not found")
    cargo = all_cargo[item_id]
    cargo.recipe = ItemRecipe.item_recipe(item_id)
    return cargo


@items.get("/search/items")
async def search_items(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
    """Search for items using fuzzy matching"""
    results = fuzzy_search_items(query, limit, score_cutoff)
    return SearchResponse(
        results=[SearchResult(name=name, score=score, id=item_id, type="item") for name, score, item_id in results],
        query=query,
        search_type="items",
    )

@items.get("/search/buildings")
async def search_buildings(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
    """Search for buildings using fuzzy matching"""
    results = fuzzy_search_buildings(query, limit, score_cutoff)
    return SearchResponse(
        results=[SearchResult(name=name, score=score, id=building_id, type="building") for name, score, building_id in results],
        query=query,
        search_type="buildings",
    )

@items.get("/search/cargo")
async def search_cargo(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
    """Search for cargo using fuzzy matching"""
    results = fuzzy_search_cargo(query, limit, score_cutoff)
    return SearchResponse(
        results=[SearchResult(name=name, score=score, id=cargo_id, type="cargo") for name, score, cargo_id in results],
        query=query,
        search_type="cargo",
    )

@items.get("/search/all")
async def search_all(query: str, limit: int = 5, score_cutoff: float = 60.0) -> dict:
    """Search across all categories using fuzzy matching"""
    results = fuzzy_search_all(query, limit, score_cutoff)
    return {
        "query": query,
        "items": [SearchResult(name=name, score=score, id=item_id, type="item") for name, score, item_id in results["items"]],
        "buildings": [SearchResult(name=name, score=score, id=building_id, type="building") for name, score, building_id in results["buildings"]],
        "cargo": [SearchResult(name=name, score=score, id=cargo_id, type="cargo") for name, score, cargo_id in results["cargo"]],
    }

@items.get("/search/best")
async def get_best_match_endpoint(query: str, search_type: str = "all") -> SearchResult | None:
    """Get the single best match across specified search type"""
    if search_type not in ["items", "buildings", "cargo", "all"]:
        raise HTTPException(status_code=400, detail="search_type must be one of: items, buildings, cargo, all")

    result = get_best_match(query, search_type)
    if result:
        name, score, item_id, match_type = result
        return SearchResult(name=name, score=score, id=item_id, type=match_type)
    return None
