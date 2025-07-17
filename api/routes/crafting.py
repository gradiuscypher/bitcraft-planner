import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.crafting import CraftingProjectItemOrm as DBCraftingProjectItem
from models.crafting import CraftingProjectOrm as DBCraftingProject

logger = logging.getLogger(__name__)

# Create the router
crafting = APIRouter(prefix="/crafting", tags=["crafting"])


class CreateProjectRequest(BaseModel):
    project_name: str


class AddItemRequest(BaseModel):
    item_id: int
    count: int


class UpdateItemCountRequest(BaseModel):
    count: int


class ProjectResponse(BaseModel):
    project_id: int
    project_uuid: str
    project_name: str


class ProjectItemResponse(BaseModel):
    item_id: int
    count: int
    id: int


@crafting.post("/projects")
async def create_project(request: CreateProjectRequest) -> ProjectResponse:
    """Create a new crafting project"""
    try:
        db_project = await DBCraftingProject.create_project(request.project_name)

        return ProjectResponse(
            project_id=int(db_project.project_id),
            project_uuid=str(db_project.project_uuid),
            project_name=str(db_project.project_name),
        )

    except Exception:
        logger.exception("Error creating project")
        raise HTTPException(status_code=500, detail="Failed to create project") from None


@crafting.get("/projects/{project_id}")
async def get_project(project_id: int) -> ProjectResponse:
    """Get a crafting project by ID"""
    db_project = await DBCraftingProject.get_project(project_id)

    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        project_id=int(db_project.project_id),
        project_uuid=str(db_project.project_uuid),
        project_name=str(db_project.project_name),
    )


@crafting.get("/projects/uuid/{project_uuid}")
async def get_project_by_uuid(project_uuid: str) -> ProjectResponse:
    """Get a crafting project by UUID"""
    try:
        uuid_obj = UUID(project_uuid)
        db_project = await DBCraftingProject.get_project_by_uuid(uuid_obj)

        if not db_project:
            raise HTTPException(status_code=404, detail="Project not found")

        return ProjectResponse(
            project_id=int(db_project.project_id),
            project_uuid=str(db_project.project_uuid),
            project_name=str(db_project.project_name),
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from None


@crafting.post("/projects/{project_id}/items")
async def add_item_to_project(project_id: int, request: AddItemRequest) -> dict[str, str]:
    """Add an item to a crafting project"""
    # Verify project exists
    db_project = await DBCraftingProject.get_project(project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        await DBCraftingProjectItem.add_item_to_project(
            project_id=project_id,
            item_id=request.item_id,
            count=request.count,
        )

    except Exception:
        logger.exception("Error adding item to project")
        raise HTTPException(status_code=500, detail="Failed to add item to project") from None

    else:
        return {"message": "Item added to project successfully"}


@crafting.delete("/projects/{project_id}/items/{item_id}")
async def remove_item_from_project(project_id: int, item_id: int) -> dict[str, str]:
    """Remove an item from a crafting project"""
    # Verify project exists
    db_project = await DBCraftingProject.get_project(project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        await DBCraftingProjectItem.remove_item_from_project(project_id, item_id)

    except Exception:
        logger.exception("Error removing item from project")
        raise HTTPException(status_code=500, detail="Failed to remove item from project") from None

    else:
        return {"message": "Item removed from project successfully"}


@crafting.get("/projects/{project_id}/items")
async def get_project_items(project_id: int) -> list[ProjectItemResponse]:
    """Get all items in a crafting project"""
    # Verify project exists
    db_project = await DBCraftingProject.get_project(project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_items = await DBCraftingProjectItem.get_project_items(project_id)

    return [
        ProjectItemResponse(
            item_id=item.item_id,
            count=item.count,
            id=item.id,
        )
        for item in project_items
    ]


@crafting.put("/projects/{project_id}/items/{item_id}/count")
async def update_item_count(project_id: int, item_id: int, request: UpdateItemCountRequest) -> dict[str, str]:
    """Update the count of an item in a crafting project"""
    # Verify project exists
    db_project = await DBCraftingProject.get_project(project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get the specific project item
    project_items = await DBCraftingProjectItem.get_project_items(project_id)
    target_item = None
    for item in project_items:
        if int(item.item_id) == item_id:
            target_item = item
            break

    if not target_item:
        raise HTTPException(status_code=404, detail="Item not found in project")

    try:
        await target_item.update_item_count(request.count)

    except Exception:
        logger.exception("Error updating item count")
        raise HTTPException(status_code=500, detail="Failed to update item count") from None

    else:
        return {"message": "Item count updated successfully"}