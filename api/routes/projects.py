"""
Routes for projects

- get all projects visible to the user
- get a project by id
- create a project
- update a project
- delete a project
- get a group
- get a groups projects
- add a project to a group
- remove a project from a group
- get a users projects
- add a project to a user
- remove a project from a user
- get a users groups
- add a group to a user
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.gamedata import GameBuildingRecipeOrm, GameCargoOrm, GameItemOrm
from models.projects import (
    AddItemToProjectRequest,
    CreateProjectRequest,
    Project,
    ProjectItemOrm,
    ProjectOrm,
    UpdateProjectItemCountRequest,
)
from models.users import UserGroupOrm, UserOrm
from routes.auth import get_current_user

projects = APIRouter(prefix="/projects", tags=["projects"])


# Regular project endpoints
@projects.get("/")
async def get_projects(
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Project]:
    # Get groups where user is a member
    member_group_ids = [group.id for group in current_user.groups]

    # Get groups where user is the owner (query directly from DB to avoid lazy loading issues)
    owned_groups_result = await db.execute(
        select(UserGroupOrm.id).where(UserGroupOrm.owner_id == current_user.id),
    )
    owned_group_ids = [row[0] for row in owned_groups_result.fetchall()]

    # Combine both lists
    all_group_ids = list(set(member_group_ids + owned_group_ids))

    # Build the query conditions
    conditions = [ProjectOrm.owner_id == current_user.id]
    if all_group_ids:  # Only add group condition if user has groups
        conditions.append(ProjectOrm.group_id.in_(all_group_ids))

    result = await db.execute(
        select(ProjectOrm)
        .where(or_(*conditions))
        .options(selectinload(ProjectOrm.items)),
    )
    projects = result.scalars().all()
    return [Project.model_validate(project) for project in projects]


@projects.get("/{project_id}")
async def get_project(
    project_id: int,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(
            selectinload(ProjectOrm.items).selectinload(ProjectItemOrm.item),
            selectinload(ProjectOrm.group).selectinload(UserGroupOrm.user_memberships),
        ),
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.does_user_have_access(current_user.id):
        raise HTTPException(
            status_code=403, detail="You do not have access to this project",
        )

    return Project.model_validate(project)


@projects.post("/")
async def create_project(
    project: CreateProjectRequest,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    # If user is trying to create a project for a group, validate they have permission
    if project.group_id is not None:
        result = await db.execute(
            select(UserGroupOrm)
            .where(UserGroupOrm.id == project.group_id)
            .options(selectinload(UserGroupOrm.user_memberships)),
        )
        group = result.scalar_one_or_none()

        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        if not group.is_user_owner_or_co_owner(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="You can only create projects for groups you own or co-own",
            )

    project_orm = ProjectOrm(
        name=project.name,
        owner_id=current_user.id,
        group_id=project.group_id,
    )
    db.add(project_orm)
    await db.commit()
    await db.refresh(project_orm)

    # Reload the project with items relationship eagerly loaded
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_orm.id)
        .options(selectinload(ProjectOrm.items)),
    )
    project_with_items = result.scalar_one()
    return Project.model_validate(project_with_items)


@projects.put("/{project_id}")
async def update_project(
    project_id: int,
    project: CreateProjectRequest,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(
            selectinload(ProjectOrm.group).selectinload(UserGroupOrm.user_memberships),
        ),
    )
    project_orm = result.scalar_one_or_none()
    if not project_orm:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project_orm.can_user_modify(current_user.id):
        raise HTTPException(
            status_code=403, detail="You do not have permission to modify this project",
        )
    project_orm.name = project.name
    await db.commit()

    # Reload the project with items relationship eagerly loaded
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(selectinload(ProjectOrm.items).selectinload(ProjectItemOrm.item)),
    )
    updated_project = result.scalar_one()
    return Project.model_validate(updated_project)


@projects.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(
            selectinload(ProjectOrm.group).selectinload(UserGroupOrm.user_memberships),
        ),
    )
    project_orm = result.scalar_one_or_none()
    if not project_orm:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project_orm.can_user_modify(current_user.id):
        raise HTTPException(
            status_code=403, detail="You do not have permission to delete this project",
        )
    await db.delete(project_orm)
    await db.commit()


@projects.post("/{project_id}/items")
async def add_item_to_project(
    project_id: int,
    item: AddItemToProjectRequest,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(
            selectinload(ProjectOrm.group).selectinload(UserGroupOrm.user_memberships),
        ),
    )
    project_orm = result.scalar_one_or_none()
    if not project_orm:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project_orm.can_user_modify(current_user.id):
        raise HTTPException(
            status_code=403, detail="You do not have permission to modify this project",
        )

    # Find the item based on type
    item_name = None
    if item.item_type == "item":
        # For items, try both item_id lookup and primary key lookup
        item_orm = await GameItemOrm.get_by_id(item.item_id)
        if not item_orm:
            # Try finding by primary key ID as fallback
            result = await db.execute(
                select(GameItemOrm).where(GameItemOrm.id == item.item_id),
            )
            item_orm = result.scalar_one_or_none()
        if item_orm:
            item_name = item_orm.name
    elif item.item_type == "building":
        building_orm = await GameBuildingRecipeOrm.get_by_id(item.item_id)
        if building_orm:
            item_name = building_orm.name
    elif item.item_type == "cargo":
        # For cargo, try both cargo_id lookup and primary key lookup
        cargo_orm = await GameCargoOrm.get_by_id(item.item_id)
        if not cargo_orm:
            # Try finding by primary key ID as fallback
            result = await db.execute(
                select(GameCargoOrm).where(GameCargoOrm.id == item.item_id),
            )
            cargo_orm = result.scalar_one_or_none()
        if cargo_orm:
            item_name = cargo_orm.name

    if not item_name:
        raise HTTPException(
            status_code=404, detail=f"{item.item_type.capitalize()} not found",
        )

    project_item_orm = ProjectItemOrm(
        project_id=project_id,
        item_id=item.item_id,
        name=item_name,
        count=0,  # Initial count is 0
        target_count=item.amount,  # Target count is the requested amount
    )
    db.add(project_item_orm)
    await db.commit()

    # Reload the project with items relationship eagerly loaded
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(selectinload(ProjectOrm.items).selectinload(ProjectItemOrm.item)),
    )
    updated_project = result.scalar_one()
    return Project.model_validate(updated_project)


@projects.delete("/{project_id}/items/{item_id}")
async def remove_item_from_project(
    project_id: int,
    item_id: int,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    result = await db.execute(
        select(ProjectItemOrm)
        .where(
            ProjectItemOrm.project_id == project_id, ProjectItemOrm.item_id == item_id,
        )
        .options(
            selectinload(ProjectItemOrm.project)
            .selectinload(ProjectOrm.group)
            .selectinload(UserGroupOrm.user_memberships),
        ),
    )
    project_item_orm = result.scalar_one_or_none()
    if not project_item_orm:
        raise HTTPException(status_code=404, detail="Item not found in project")
    if not project_item_orm.project.can_user_modify(current_user.id):
        raise HTTPException(
            status_code=403, detail="You do not have permission to modify this project",
        )
    await db.delete(project_item_orm)
    await db.commit()

    # Reload the project with items relationship eagerly loaded
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(selectinload(ProjectOrm.items).selectinload(ProjectItemOrm.item)),
    )
    updated_project = result.scalar_one()
    return Project.model_validate(updated_project)


@projects.put("/{project_id}/items/{item_id}/count")
async def update_project_item_count(
    project_id: int,
    item_id: int,
    update_data: UpdateProjectItemCountRequest,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    # First check if the project exists and user has access
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(
            selectinload(ProjectOrm.group).selectinload(UserGroupOrm.user_memberships),
        ),
    )
    project_orm = result.scalar_one_or_none()
    if not project_orm:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project_orm.can_user_modify(current_user.id):
        raise HTTPException(
            status_code=403, detail="You do not have permission to modify this project",
        )

    # Find the project item
    result = await db.execute(
        select(ProjectItemOrm).where(
            ProjectItemOrm.project_id == project_id, ProjectItemOrm.item_id == item_id,
        ),
    )
    project_item_orm = result.scalar_one_or_none()
    if not project_item_orm:
        raise HTTPException(status_code=404, detail="Item not found in project")

    # Update the count
    project_item_orm.count = max(
        0, update_data.count,
    )  # Ensure count doesn't go below 0
    await db.commit()

    # Reload the project with items relationship eagerly loaded
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(selectinload(ProjectOrm.items)),
    )
    updated_project = result.scalar_one()
    return Project.model_validate(updated_project)


# Group project endpoints
@projects.post("/group/{group_id}/{project_id}")
async def add_project_to_group(
    group_id: int, project_id: int, current_user: UserOrm = Depends(get_current_user),
):
    return {"message": "Hello, World!"}


@projects.delete("/group/{group_id}/{project_id}")
async def remove_project_from_group(
    group_id: int, project_id: int, current_user: UserOrm = Depends(get_current_user),
):
    return {"message": "Hello, World!"}


@projects.get("/group/{group_id}/projects")
async def get_group_projects(
    group_id: int, current_user: UserOrm = Depends(get_current_user),
):
    return {"message": "Hello, World!"}


# User project endpoints
@projects.get("/user")
async def get_user_projects(current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


@projects.post("/user/{user_id}/{project_id}")
async def add_project_to_user(
    user_id: int, project_id: int, current_user: UserOrm = Depends(get_current_user),
):
    return {"message": "Hello, World!"}


@projects.delete("/user/{user_id}/{project_id}")
async def remove_project_from_user(
    user_id: int, project_id: int, current_user: UserOrm = Depends(get_current_user),
):
    return {"message": "Hello, World!"}
