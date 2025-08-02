import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import AsyncSession, get_db
from models.gamedata import (
    GameItemOrm,
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


class SearchAllResponse(BaseModel):
    items: list[SearchResult]
    buildings: list[SearchResult]
    cargo: list[SearchResult]
    query: str


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


@items.get("/search/buildings")
async def search_buildings(
    db: Annotated[AsyncSession, Depends(get_db)],
    query: str,
    limit: int = 5,
    score_cutoff: float = 60.0,
) -> SearchResponse:
    """Search for buildings using hybrid FTS + fuzzy matching"""
    search_service = SearchService(db)
    search_results = await search_service.search_buildings(query, limit, score_cutoff)

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
        search_type="buildings",
    )

@items.get("/search/cargo")
async def search_cargo(
    db: Annotated[AsyncSession, Depends(get_db)],
    query: str,
    limit: int = 5,
    score_cutoff: float = 60.0,
) -> SearchResponse:
    """Search for cargo using hybrid FTS + fuzzy matching"""
    search_service = SearchService(db)
    search_results = await search_service.search_cargo(query, limit, score_cutoff)

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
        search_type="cargo",
    )

@items.get("/search/all")
async def search_all(
    db: Annotated[AsyncSession, Depends(get_db)],
    query: str,
    limit: int = 5,
    score_cutoff: float = 60.0,
) -> SearchAllResponse:
    """Search across all categories using hybrid FTS + fuzzy matching"""
    search_service = SearchService(db)

    # Perform searches across all categories sequentially to avoid session conflicts
    items_results = await search_service.search_items(query, limit, score_cutoff)
    buildings_results = await search_service.search_buildings(query, limit, score_cutoff)
    cargo_results = await search_service.search_cargo(query, limit, score_cutoff)

    # Convert gamedata SearchResult objects to Pydantic SearchResult models
    items = [
        SearchResult(
            name=result.name,
            score=result.score,
            id=result.id,
            type=result.type,
        )
        for result in items_results
    ]

    buildings = [
        SearchResult(
            name=result.name,
            score=result.score,
            id=result.id,
            type=result.type,
        )
        for result in buildings_results
    ]

    cargo = [
        SearchResult(
            name=result.name,
            score=result.score,
            id=result.id,
            type=result.type,
        )
        for result in cargo_results
    ]

    return SearchAllResponse(
        items=items,
        buildings=buildings,
        cargo=cargo,
        query=query,
    )

@items.get("/search/best")
async def get_best_match_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
    query: str,
    search_type: str = "all",
) -> SearchResult | None:
    """Get the single best match across specified search type"""
    if search_type not in ["items", "buildings", "cargo", "all"]:
        raise HTTPException(status_code=400, detail="search_type must be one of: items, buildings, cargo, all")

    search_service = SearchService(db)
    best_result = None
    best_score = 0.0

    if search_type in ["items", "all"]:
        items_results = await search_service.search_items(query, 1, 0.0)
        if items_results and items_results[0].score > best_score:
            best_result = items_results[0]
            best_score = items_results[0].score

    if search_type in ["buildings", "all"]:
        buildings_results = await search_service.search_buildings(query, 1, 0.0)
        if buildings_results and buildings_results[0].score > best_score:
            best_result = buildings_results[0]
            best_score = buildings_results[0].score

    if search_type in ["cargo", "all"]:
        cargo_results = await search_service.search_cargo(query, 1, 0.0)
        if cargo_results and cargo_results[0].score > best_score:
            best_result = cargo_results[0]
            best_score = cargo_results[0].score

    if best_result:
        return SearchResult(
            name=best_result.name,
            score=best_result.score,
            id=best_result.id,
            type=best_result.type,
        )
    return None
