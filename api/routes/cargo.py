import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException

from models.gamedata import GameCargoOrm
from models.items import Cargo
from helpers import load_cargo_descriptions

logger = logging.getLogger(__name__)

# Create the router
cargo = APIRouter(prefix="/cargo", tags=["cargo"])


@cargo.get("/{cargo_id}")
async def get_cargo(cargo_id: int) -> Cargo:
    """Get cargo by ID"""
    cargo_orm = await GameCargoOrm.get_by_id(cargo_id)
    if not cargo_orm:
        raise HTTPException(status_code=404, detail="Cargo not found")

    # Load full cargo details from JSON data
    _, cargo_descriptions = load_cargo_descriptions()
    cargo_data = cargo_descriptions.get(cargo_id)
    if not cargo_data:
        raise HTTPException(status_code=404, detail="Cargo details not found")

    return Cargo.model_validate(cargo_data)