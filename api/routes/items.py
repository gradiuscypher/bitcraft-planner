import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select

from database import AsyncSession, get_db
from models.gamedata import (
    GameBuildingRecipeOrm,
    GameCargoOrm,
    GameItemOrm,
    GameItemRecipeOrm,
    GameItemRecipeProducedOrm,
    GameItemRecipeConsumedOrm,
    SearchService,
)
from models.items import Item, ItemRecipe, ConsumedItem

logger = logging.getLogger(__name__)

# Create the router
items = APIRouter(prefix="/items", tags=["items"])


class SearchResult(BaseModel):
    name: str
    score: float
    id: int
    type: str | None = None
    tier: int | None = None

class SearchResponse(BaseModel):
    results: list[SearchResult]
    query: str
    search_type: str


class SearchAllResponse(BaseModel):
    items: list[SearchResult]
    buildings: list[SearchResult]
    cargo: list[SearchResult]
    query: str


class RecipeTreeItem(BaseModel):
    item_id: int
    item_name: str
    amount: int
    is_base_material: bool = False


class RecipeTreeStep(BaseModel):
    depth: int
    items: list[RecipeTreeItem]


class RecipeTreeResponse(BaseModel):
    recipe_id: int
    item_id: int
    item_name: str
    steps: list[RecipeTreeStep]
    base_materials: list[RecipeTreeItem]


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
            tier=result.tier,
        )
        for result in search_results
    ]

    return SearchResponse(
        results=results,
        query=query,
        search_type="items",
    )


@items.get("/random")
async def get_random_items(
    db: Annotated[AsyncSession, Depends(get_db)],
    count: int = 6,
) -> SearchAllResponse:
    """Get random items, buildings, and cargo for the homepage."""

    # Get random items from each category (2 items, 2 buildings, 2 cargo)
    items_per_category = max(1, count // 3)

    # Get random items
    items_result = await db.execute(
        select(GameItemOrm).order_by(func.random()).limit(items_per_category),
    )
    random_items = items_result.scalars().all()

    # Get random buildings
    buildings_result = await db.execute(
        select(GameBuildingRecipeOrm).order_by(func.random()).limit(items_per_category),
    )
    random_buildings = buildings_result.scalars().all()

    # Get random cargo
    cargo_result = await db.execute(
        select(GameCargoOrm).order_by(func.random()).limit(items_per_category),
    )
    random_cargo = cargo_result.scalars().all()

    # Convert to SearchResult format
    items = [
        SearchResult(
            name=item.name,
            score=100.0,  # Perfect match since it's curated
            id=item.item_id,
            type="item",
            tier=item.tier,
        )
        for item in random_items
    ]

    buildings = [
        SearchResult(
            name=building.name,
            score=100.0,
            id=building.id,
            type="building",
            tier=None,
        )
        for building in random_buildings
    ]

    cargo = [
        SearchResult(
            name=cargo_item.name,
            score=100.0,
            id=cargo_item.cargo_id,
            type="cargo",
            tier=cargo_item.tier,
        )
        for cargo_item in random_cargo
    ]

    return SearchAllResponse(
        items=items,
        buildings=buildings,
        cargo=cargo,
        query="random",
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
            tier=result.tier,
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
            tier=result.tier,
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
            tier=result.tier,
        )
        for result in items_results
    ]

    buildings = [
        SearchResult(
            name=result.name,
            score=result.score,
            id=result.id,
            type=result.type,
            tier=result.tier,
        )
        for result in buildings_results
    ]

    cargo = [
        SearchResult(
            name=result.name,
            score=result.score,
            id=result.id,
            type=result.type,
            tier=result.tier,
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
            tier=getattr(best_result, "tier", None),
        )
    return None


async def calculate_recipe_tree_by_item(item_id: int, amount: int = 1, depth: int = 0, max_depth: int = 10) -> tuple[list[RecipeTreeStep], list[RecipeTreeItem]]:
    """
    Recursively calculate all materials needed for an item using its first available non-reforging recipe.
    Returns tuple of (steps, base_materials)
    """
    if depth > max_depth:
        return [], []
    
    # Get all recipes that produce this item
    item_recipes_orm = await GameItemRecipeProducedOrm.get_by_item_id(item_id)
    
    if not item_recipes_orm:
        # This is a base material (no recipe found)
        item_orm = await GameItemOrm.get_by_id(item_id)
        item_name = item_orm.name if item_orm else f"Unknown Item {item_id}"
        base_material = RecipeTreeItem(
            item_id=item_id,
            item_name=item_name,
            amount=amount,
            is_base_material=True
        )
        return [], [base_material]
    
    # Find the first non-reforging recipe (exclude building type 127749503)
    suitable_recipe_id = None
    for recipe_produced in item_recipes_orm:
        recipe_orm = await GameItemRecipeOrm.get_by_id(recipe_produced.recipe_id)
        if recipe_orm and recipe_orm.building_type_requirement != 127749503:
            suitable_recipe_id = recipe_produced.recipe_id
            break
    
    if not suitable_recipe_id:
        # No suitable recipes found, treat as base material
        item_orm = await GameItemOrm.get_by_id(item_id)
        item_name = item_orm.name if item_orm else f"Unknown Item {item_id}"
        base_material = RecipeTreeItem(
            item_id=item_id,
            item_name=item_name,
            amount=amount,
            is_base_material=True
        )
        return [], [base_material]
    
    # Use the first suitable recipe
    return await calculate_recipe_tree_by_recipe(suitable_recipe_id, amount, depth, max_depth)


async def calculate_recipe_tree_by_recipe(recipe_id: int, amount: int = 1, depth: int = 0, max_depth: int = 10) -> tuple[list[RecipeTreeStep], list[RecipeTreeItem]]:
    """
    Recursively calculate all materials needed for a specific recipe.
    Returns tuple of (steps, base_materials)
    """
    if depth > max_depth:
        return [], []
    
    steps = []
    base_materials = []
    current_step_items = []
    
    # Get the specific recipe
    recipe_orm = await GameItemRecipeOrm.get_by_id(recipe_id)
    
    if not recipe_orm or not recipe_orm.consumed_items:
        # No consumed items means this recipe produces base materials
        # Find what this recipe produces
        if recipe_orm and recipe_orm.produced_items:
            for produced_item in recipe_orm.produced_items:
                item_orm = await GameItemOrm.get_by_id(produced_item.item_id)
                item_name = item_orm.name if item_orm else f"Unknown Item {produced_item.item_id}"
                base_material = RecipeTreeItem(
                    item_id=produced_item.item_id,
                    item_name=item_name,
                    amount=amount,
                    is_base_material=True
                )
                base_materials.append(base_material)
        return [], base_materials
    
    # Calculate how many times we need to run this recipe
    # Find the main produced item (first one, or could be specified)
    main_produced_item = recipe_orm.produced_items[0] if recipe_orm.produced_items else None
    produced_amount = main_produced_item.amount if main_produced_item else 1
    recipe_runs = (amount + produced_amount - 1) // produced_amount  # Ceiling division
    
    # Process each consumed item
    for consumed_item in recipe_orm.consumed_items:
        consumed_item_orm = await GameItemOrm.get_by_id(consumed_item.item_id)
        consumed_item_name = consumed_item_orm.name if consumed_item_orm else f"Unknown Item {consumed_item.item_id}"
        
        total_needed = consumed_item.amount * recipe_runs
        
        current_step_items.append(RecipeTreeItem(
            item_id=consumed_item.item_id,
            item_name=consumed_item_name,
            amount=total_needed
        ))
        
        # Recursively get materials for this consumed item (use first available recipe)
        sub_steps, sub_base_materials = await calculate_recipe_tree_by_item(
            consumed_item.item_id, 
            total_needed, 
            depth + 1, 
            max_depth
        )
        
        steps.extend(sub_steps)
        
        # Merge base materials (sum amounts for same items)
        for sub_base in sub_base_materials:
            existing = next((bm for bm in base_materials if bm.item_id == sub_base.item_id), None)
            if existing:
                existing.amount += sub_base.amount
            else:
                base_materials.append(sub_base)
    
    # Add current step if we have items
    if current_step_items:
        steps.insert(0, RecipeTreeStep(depth=depth, items=current_step_items))
    
    return steps, base_materials


@items.get("/{item_id}/recipe-tree")
async def get_item_recipe_tree(item_id: int, amount: int = 1) -> RecipeTreeResponse:
    """Get complete recipe tree for an item using its first available non-reforging recipe"""
    
    # Verify item exists
    item_orm = await GameItemOrm.get_by_id(item_id)
    if not item_orm:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get all recipes for this item
    item_recipes_orm = await GameItemRecipeProducedOrm.get_by_item_id(item_id)
    if not item_recipes_orm:
        raise HTTPException(status_code=404, detail="No recipe found for this item")
    
    # Find the first non-reforging recipe (exclude building type 127749503)
    suitable_recipe_id = None
    for recipe_produced in item_recipes_orm:
        recipe_orm = await GameItemRecipeOrm.get_by_id(recipe_produced.recipe_id)
        if recipe_orm and recipe_orm.building_type_requirement != 127749503:
            suitable_recipe_id = recipe_produced.recipe_id
            break
    
    if not suitable_recipe_id:
        raise HTTPException(status_code=404, detail="No suitable crafting recipe found for this item (only reforging recipes available)")
    
    # Calculate the recipe tree
    steps, base_materials = await calculate_recipe_tree_by_recipe(suitable_recipe_id, amount)
    
    return RecipeTreeResponse(
        recipe_id=suitable_recipe_id,
        item_id=item_id,
        item_name=item_orm.name,
        steps=steps,
        base_materials=base_materials
    )


@items.get("/recipe/{recipe_id}/recipe-tree")
async def get_recipe_tree(recipe_id: int, amount: int = 1) -> RecipeTreeResponse:
    """Get complete recipe tree for a specific recipe ID"""
    
    # Verify recipe exists
    recipe_orm = await GameItemRecipeOrm.get_by_id(recipe_id)
    if not recipe_orm:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Get the main item this recipe produces
    if not recipe_orm.produced_items:
        raise HTTPException(status_code=400, detail="Recipe produces no items")
    
    main_produced_item = recipe_orm.produced_items[0]
    item_orm = await GameItemOrm.get_by_id(main_produced_item.item_id)
    item_name = item_orm.name if item_orm else f"Unknown Item {main_produced_item.item_id}"
    
    # Calculate the recipe tree
    steps, base_materials = await calculate_recipe_tree_by_recipe(recipe_id, amount)
    
    return RecipeTreeResponse(
        recipe_id=recipe_id,
        item_id=main_produced_item.item_id,
        item_name=item_name,
        steps=steps,
        base_materials=base_materials
    )
