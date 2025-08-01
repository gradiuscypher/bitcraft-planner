import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import AsyncSession, get_db
from models.gamedata import (
    GameItemOrm,
    GameItemRecipeConsumedOrm,
    GameItemRecipeOrm,
    GameItemRecipeProducedOrm,
    SearchService,
)
from models.items import Item, ItemRecipe

logger = logging.getLogger(__name__)

# Create the router
items = APIRouter(prefix="/items", tags=["items"])


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


@items.get("/search")
async def search_items(
    db: Annotated[AsyncSession, Depends(get_db)],
    query: str,
    limit: int = 5,
    score_cutoff: float = 60.0,
) -> SearchResponse:
    search_service = SearchService(db)
    search_results = await search_service.search_items(query, limit, score_cutoff)

    # Convert gamedata SearchResult objects to Pydantic SearchResult models
    results = [
        SearchResult(
            name=result.name,
            score=result.score,
            id=result.id,
            type=result.type,
        )
        for result in search_results
    ]

    return SearchResponse(
        results=results,
        query=query,
        search_type="items",
    )


@items.get("/{item_id}")
async def get_item(item_id: int) -> Item:
    """Get item by ID"""
    item = await GameItemOrm.get_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return Item.model_validate(item)


@items.get("/{item_id}/recipe")
async def get_item_recipe(item_id: int) -> list[ItemRecipe]:
    """Get item recipe by ID"""
    results: list[ItemRecipe] = []
    item = await GameItemOrm.get_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item_recipes_orm: list[GameItemRecipeProducedOrm] = await GameItemRecipeProducedOrm.get_by_item_id(item_id)
    if not item_recipes_orm:
        raise HTTPException(status_code=404, detail="Item recipe not found")

    for partial_recipe in item_recipes_orm:
        item_recipe = await GameItemRecipeOrm.get_by_id(partial_recipe.recipe_id)
        if not item_recipe:
            raise HTTPException(status_code=404, detail="Item recipe not found")
        results.append(ItemRecipe.model_validate(item_recipe, from_attributes=True))

    return results

# @items.get("/building/{building_id}")
# async def get_building(building_id: int) -> dict[str, Any]:
#     """Get building by ID"""
#     return buildings_by_id[building_id]


# @items.get("/cargo/{item_id}")
# async def get_cargo(item_id: int) -> Cargo:
#     """Get cargo by ID"""
#     if item_id not in all_cargo:
#         raise HTTPException(status_code=404, detail="Cargo not found")
#     cargo = all_cargo[item_id]
#     cargo.recipe = ItemRecipe.item_recipe(item_id)
#     return cargo



# @items.get("/search/buildings")
# async def search_buildings(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
#     """Search for buildings using fuzzy matching"""
#     results = fuzzy_search_buildings(query, limit, score_cutoff)
#     return SearchResponse(
#         results=[SearchResult(name=name, score=score, id=building_id, type="building") for name, score, building_id in results],
#         query=query,
#         search_type="buildings",
#     )

# @items.get("/search/cargo")
# async def search_cargo(query: str, limit: int = 5, score_cutoff: float = 60.0) -> SearchResponse:
#     """Search for cargo using fuzzy matching"""
#     results = fuzzy_search_cargo(query, limit, score_cutoff)
#     return SearchResponse(
#         results=[SearchResult(name=name, score=score, id=cargo_id, type="cargo") for name, score, cargo_id in results],
#         query=query,
#         search_type="cargo",
#     )

# @items.get("/search/all")
# async def search_all(query: str, limit: int = 5, score_cutoff: float = 60.0) -> dict:
#     """Search across all categories using fuzzy matching"""
#     results = fuzzy_search_all(query, limit, score_cutoff)
#     return {
#         "query": query,
#         "items": [SearchResult(name=name, score=score, id=item_id, type="item") for name, score, item_id in results["items"]],
#         "buildings": [SearchResult(name=name, score=score, id=building_id, type="building") for name, score, building_id in results["buildings"]],
#         "cargo": [SearchResult(name=name, score=score, id=cargo_id, type="cargo") for name, score, cargo_id in results["cargo"]],
#     }

# @items.get("/search/best")
# async def get_best_match_endpoint(query: str, search_type: str = "all") -> SearchResult | None:
#     """Get the single best match across specified search type"""
#     if search_type not in ["items", "buildings", "cargo", "all"]:
#         raise HTTPException(status_code=400, detail="search_type must be one of: items, buildings, cargo, all")

#     result = get_best_match(query, search_type)
#     if result:
#         name, score, item_id, match_type = result
#         return SearchResult(name=name, score=score, id=item_id, type=match_type)
#     return None
