import logging

from fastapi import APIRouter, HTTPException

from models.gamedata import GameBuildingRecipeOrm, GameBuildingTypeOrm
from models.items import Building, BuildingType

logger = logging.getLogger(__name__)

# Create the router
buildings = APIRouter(prefix="/buildings", tags=["buildings"])


@buildings.get("/{building_id}")
async def get_building(building_id: int) -> Building:
    building_orm = await GameBuildingRecipeOrm.get_by_id(building_id)
    if not building_orm:
        raise HTTPException(status_code=404, detail="Building not found")
    return Building.model_validate(building_orm)


@buildings.get("/type/{building_type_id}")
async def get_building_type(building_type_id: int) -> BuildingType:
    building_type_orm = await GameBuildingTypeOrm.get_by_id(building_type_id)
    if not building_type_orm:
        raise HTTPException(status_code=404, detail="Building type not found")
    return BuildingType.model_validate(building_type_orm)
