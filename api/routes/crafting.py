import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from schemas.crafting import CraftingProject as DBCraftingProject
from schemas.crafting import CraftingProjectItem as DBCraftingProjectItem

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
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail="Failed to create project")


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
        raise HTTPException(status_code=400, detail="Invalid UUID format")


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
        return {"message": "Item added to project successfully"}
    except Exception as e:
        logger.error(f"Error adding item to project: {e}")
        raise HTTPException(status_code=500, detail="Failed to add item to project")


@crafting.delete("/projects/{project_id}/items/{item_id}")
async def remove_item_from_project(project_id: int, item_id: int) -> dict[str, str]:
    """Remove an item from a crafting project"""
    # Verify project exists
    db_project = await DBCraftingProject.get_project(project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        await DBCraftingProjectItem.remove_item_from_project(project_id, item_id)
        return {"message": "Item removed from project successfully"}
    except Exception as e:
        logger.error(f"Error removing item from project: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove item from project")


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
        return {"message": "Item count updated successfully"}
    except Exception as e:
        logger.exception(f"Error updating item count: {e}")
        raise HTTPException(status_code=500, detail="Failed to update item count")
