import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.crafting import CraftingProjectItemOrm, CraftingProjectOrm

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


class NewProjectResponse(BaseModel):
    public_uuid: str
    private_uuid: str
    project_name: str


class ProjectItemResponse(BaseModel):
    item_id: int
    count: int


@crafting.post("/projects")
async def create_project(request: CreateProjectRequest) -> NewProjectResponse:
    """Create a new crafting project"""
    try:
        db_project = await CraftingProjectOrm.create_project(request.project_name)

        return NewProjectResponse(
            public_uuid=str(db_project.public_uuid),
            private_uuid=str(db_project.private_uuid),
            project_name=request.project_name,
        )

    except Exception:
        logger.exception("Error creating project")
        raise HTTPException(status_code=500, detail="Failed to create project") from None


@crafting.get("/projects/{project_uuid}")
async def get_project_by_uuid(project_uuid: str) -> ProjectResponse:
    """Get a crafting project by UUID"""
    try:
        db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)

        if not db_project:
            raise HTTPException(status_code=404, detail="Project not found")

        return ProjectResponse(
            project_id=int(db_project.project_id),
            project_uuid=project_uuid,
            project_name=str(db_project.project_name),
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from None


@crafting.post("/projects/{project_uuid}/items")
async def add_item_to_project(project_uuid: str, request: AddItemRequest) -> dict[str, str]:
    """Add an item to a crafting project"""
    # Verify project exists
    db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not db_project.is_private:
        raise HTTPException(status_code=403, detail="Use the private UUID to add items to this project")

    try:
        await CraftingProjectItemOrm.add_item_to_project(
            project_id=db_project.project_id,
            item_id=request.item_id,
            count=request.count,
        )

    except Exception:
        logger.exception("Error adding item to project")
        raise HTTPException(status_code=500, detail="Failed to add item to project") from None

    else:
        return {"message": "Item added to project successfully"}


@crafting.delete("/projects/{project_uuid}/items/{item_id}")
async def remove_item_from_project(project_uuid: str, item_id: int) -> dict[str, str]:
    """Remove an item from a crafting project"""
    # Verify project exists
    db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not db_project.is_private:
        raise HTTPException(status_code=403, detail="Use the private UUID to remove items from this project")

    try:
        await CraftingProjectItemOrm.remove_item_from_project(db_project.project_id, item_id)

    except Exception:
        logger.exception("Error removing item from project")
        raise HTTPException(status_code=500, detail="Failed to remove item from project") from None

    else:
        return {"message": "Item removed from project successfully"}



@crafting.get("/projects/{project_uuid}/items")
async def get_project_items(project_uuid: str) -> list[ProjectItemResponse]:
    """Get all items in a crafting project"""

    db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)

    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_items = await CraftingProjectItemOrm.get_project_items(db_project.project_id)

    return [
        ProjectItemResponse(
            item_id=item.item_id,
            count=item.count,
        )
        for item in project_items
    ]


@crafting.put("/projects/{project_uuid}/items/{item_id}/count")
async def update_item_count(project_uuid: str, item_id: int, request: UpdateItemCountRequest) -> dict[str, str]:
    """Update the count of an item in a crafting project"""
    # Verify project exists
    db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not db_project.is_private:
        raise HTTPException(status_code=403, detail="Use the private UUID to update item counts in this project")

    try:
        project_item = await CraftingProjectItemOrm.get_project_item(db_project.project_id, item_id)

        if not project_item:
            raise HTTPException(status_code=404, detail="Item not found in project")

        await project_item.update_item_count(request.count)

    except Exception:
        logger.exception("Error updating item count")
        raise HTTPException(status_code=500, detail="Failed to update item count") from None

    else:
        return {"message": "Item count updated successfully"}
