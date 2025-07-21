import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from models.crafting import (
    CraftingProjectItemOrm, 
    CraftingProjectOrm, 
    CraftingProject,
    CraftingProjectResponse
)
from models.users import User
from routes.auth import get_current_user

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


class AddOwnerRequest(BaseModel):
    discord_id: str


class NewProjectResponse(BaseModel):
    public_uuid: str
    private_uuid: str
    project_name: str


class ProjectItemResponse(BaseModel):
    item_id: int
    count: int


@crafting.post("/projects")
async def create_project(
    request: CreateProjectRequest, 
    current_user: User = Depends(get_current_user)
) -> NewProjectResponse:
    """Create a new crafting project"""
    try:
        db_project = await CraftingProjectOrm.create_project(
            request.project_name, 
            current_user.id
        )

        return NewProjectResponse(
            public_uuid=str(db_project.public_uuid),
            private_uuid=str(db_project.private_uuid),
            project_name=request.project_name,
        )

    except Exception:
        logger.exception("Error creating project")
        raise HTTPException(status_code=500, detail="Failed to create project") from None


@crafting.get("/projects")
async def get_user_projects(
    current_user: User = Depends(get_current_user)
) -> list[CraftingProject]:
    """Get all projects owned by the current user"""
    try:
        return await CraftingProjectOrm.get_user_projects(current_user.id)
    except Exception:
        logger.exception("Error fetching user projects")
        raise HTTPException(status_code=500, detail="Failed to fetch projects") from None


@crafting.get("/projects/{project_uuid}")
async def get_project_by_uuid(project_uuid: str) -> CraftingProjectResponse:
    """Get a crafting project by UUID (public endpoint - no auth required)"""
    try:
        db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)

        if not db_project:
            raise HTTPException(status_code=404, detail="Project not found")

        return db_project

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from None


@crafting.post("/projects/{project_uuid}/items")
async def add_item_to_project(
    project_uuid: str, 
    request: AddItemRequest,
    current_user: User = Depends(get_current_user)
) -> dict[str, str]:
    """Add an item to a crafting project"""
    # Get project and verify it exists
    db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        success = await CraftingProjectItemOrm.add_item_to_project(
            project_id=db_project.project_id,
            item_id=request.item_id,
            count=request.count,
            user_id=current_user.id,
        )
        
        if not success:
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to modify this project"
            )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error adding item to project")
        raise HTTPException(status_code=500, detail="Failed to add item to project") from None

    return {"message": "Item added to project successfully"}


@crafting.delete("/projects/{project_uuid}/items/{item_id}")
async def remove_item_from_project(
    project_uuid: str, 
    item_id: int,
    current_user: User = Depends(get_current_user)
) -> dict[str, str]:
    """Remove an item from a crafting project"""
    # Get project and verify it exists
    db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        success = await CraftingProjectItemOrm.remove_item_from_project(
            db_project.project_id, 
            item_id,
            current_user.id
        )
        
        if not success:
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to modify this project"
            )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error removing item from project")
        raise HTTPException(status_code=500, detail="Failed to remove item from project") from None

    return {"message": "Item removed from project successfully"}


@crafting.get("/projects/{project_uuid}/items")
async def get_project_items(project_uuid: str) -> list[ProjectItemResponse]:
    """Get all items in a crafting project (public endpoint - no auth required)"""

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
async def update_item_count(
    project_uuid: str, 
    item_id: int, 
    request: UpdateItemCountRequest,
    current_user: User = Depends(get_current_user)
) -> dict[str, str]:
    """Update the count of an item in a crafting project"""
    # Get project and verify it exists
    db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_item = await CraftingProjectItemOrm.get_project_item(db_project.project_id, item_id)

    if not project_item:
        raise HTTPException(status_code=404, detail="Item not found in project")

    try:
        success = await project_item.update_item_count(request.count, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to modify this project"
            )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error updating item count")
        raise HTTPException(status_code=500, detail="Failed to update item count") from None

    return {"message": "Item count updated successfully"}


@crafting.post("/projects/{project_uuid}/owners")
async def add_project_owner(
    project_uuid: str,
    request: AddOwnerRequest,
    current_user: User = Depends(get_current_user)
) -> dict[str, str]:
    """Add a user as an owner of the project by their Discord ID"""
    # Get project and verify it exists
    db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        success = await CraftingProjectOrm.add_owner_by_discord_id(
            project_id=db_project.project_id,
            discord_id=request.discord_id,
            requester_user_id=current_user.id
        )
        
        if not success:
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to add owners to this project, or the user was not found"
            )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error adding project owner")
        raise HTTPException(status_code=500, detail="Failed to add project owner") from None

    return {"message": "User added as project owner successfully"}


@crafting.delete("/projects/{project_uuid}/owners/{discord_id}")
async def remove_project_owner(
    project_uuid: str,
    discord_id: str,
    current_user: User = Depends(get_current_user)
) -> dict[str, str]:
    """Remove a user as an owner of the project by their Discord ID"""
    # Get project and verify it exists
    db_project = await CraftingProjectOrm.get_project_by_uuid(project_uuid)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        success = await CraftingProjectOrm.remove_owner_by_discord_id(
            project_id=db_project.project_id,
            discord_id=discord_id,
            requester_user_id=current_user.id
        )
        
        if not success:
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to remove owners from this project, the user was not found, or you cannot remove the last owner"
            )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error removing project owner")
        raise HTTPException(status_code=500, detail="Failed to remove project owner") from None

    return {"message": "User removed as project owner successfully"}


@crafting.delete("/projects/{project_uuid}")
async def delete_project(
    project_uuid: str,
    current_user: User = Depends(get_current_user)
) -> dict[str, str]:
    """Delete a crafting project"""
    try:
        success = await CraftingProjectOrm.delete_project(project_uuid, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=403, 
                detail="Project not found or you don't have permission to delete this project"
            )

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from None
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error deleting project")
        raise HTTPException(status_code=500, detail="Failed to delete project") from None

    return {"message": "Project deleted successfully"}
