import logging

from fastapi import APIRouter, HTTPException

from helpers import load_building_descriptions, load_building_recipes
from models.gamedata import GameBuildingTypeOrm
from models.items import Building, BuildingRecipe

logger = logging.getLogger(__name__)

# Create the router
buildings = APIRouter(prefix="/buildings", tags=["buildings"])


@buildings.get("/{building_id}")
async def get_building(building_id: int) -> Building:
    """Get building by ID"""
    building_orm = await GameBuildingTypeOrm.get_by_id(building_id)
    if not building_orm:
        raise HTTPException(status_code=404, detail="Building not found")

    # Load full building details from JSON data
    building_descriptions = load_building_descriptions()
    building_data = building_descriptions.get(building_id)
    if not building_data:
        raise HTTPException(status_code=404, detail="Building details not found")

    # Load building recipe
    _, building_recipes_by_id = load_building_recipes()
    recipe_data = None
    for recipe in building_recipes_by_id.values():
        if recipe.get("building_description_id") == building_id:
            recipe_data = recipe
            break

    if not recipe_data:
        raise HTTPException(status_code=404, detail="Building recipe not found")

    # Create BuildingRecipe object
    building_recipe = BuildingRecipe.model_validate(recipe_data)

    # Add recipe to building data
    building_data["recipe"] = building_recipe

    return Building.model_validate(building_data)
