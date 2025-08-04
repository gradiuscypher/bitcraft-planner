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
from models.gamedata import GameItemOrm
from models.projects import (
    AddItemToProjectRequest,
    CreateProjectRequest,
    Project,
    ProjectItemOrm,
    ProjectOrm,
)
from models.users import UserOrm
from routes.auth import get_current_user

projects = APIRouter(prefix="/projects", tags=["projects"])

# Regular project endpoints
@projects.get("/")
async def get_projects(current_user: Annotated[UserOrm, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]) -> list[Project]:
    group_ids = [group.id for group in current_user.groups]
    result = await db.execute(
        select(ProjectOrm)
        .where(
            or_(
                ProjectOrm.owner_id == current_user.id,
                ProjectOrm.group_id.in_(group_ids),
            ),
        )
        .options(selectinload(ProjectOrm.items)),
    )
    projects = result.scalars().all()
    return [Project.model_validate(project) for project in projects]


@projects.get("/{project_id}")
async def get_project(project_id: int, current_user: Annotated[UserOrm, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]) -> Project:
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(selectinload(ProjectOrm.items)),
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.does_user_have_access(current_user.id):
        raise HTTPException(status_code=403, detail="You do not have access to this project")

    return Project.model_validate(project)


@projects.post("/")
async def create_project(project: CreateProjectRequest, current_user: Annotated[UserOrm, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]) -> Project:
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
async def update_project(project_id: int, project: CreateProjectRequest, current_user: Annotated[UserOrm, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]) -> Project:
    result = await db.execute(select(ProjectOrm).where(ProjectOrm.id == project_id))
    project_orm = result.scalar_one_or_none()
    if not project_orm:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project_orm.does_user_have_access(current_user.id):
        raise HTTPException(status_code=403, detail="You do not have access to this project")
    project_orm.name = project.name
    await db.commit()

    # Reload the project with items relationship eagerly loaded
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(selectinload(ProjectOrm.items)),
    )
    updated_project = result.scalar_one()
    return Project.model_validate(updated_project)


@projects.delete("/{project_id}")
async def delete_project(project_id: int, current_user: Annotated[UserOrm, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    result = await db.execute(select(ProjectOrm).where(ProjectOrm.id == project_id))
    project_orm = result.scalar_one_or_none()
    if not project_orm:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project_orm.does_user_have_access(current_user.id):
        raise HTTPException(status_code=403, detail="You do not have access to this project")
    await db.delete(project_orm)
    await db.commit()


@projects.post("/{project_id}/items")
async def add_item_to_project(project_id: int, item: AddItemToProjectRequest, current_user: Annotated[UserOrm, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]) -> Project:
    result = await db.execute(select(ProjectOrm).where(ProjectOrm.id == project_id))
    project_orm = result.scalar_one_or_none()
    if not project_orm:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project_orm.does_user_have_access(current_user.id):
        raise HTTPException(status_code=403, detail="You do not have access to this project")

    item_orm = await GameItemOrm.get_by_id(item.item_id)
    if not item_orm:
        raise HTTPException(status_code=404, detail="Item not found")

    project_item_orm = ProjectItemOrm(
        project_id=project_id,
        item_id=item.item_id,
        name=item_orm.name,
        count=item.amount,
    )
    db.add(project_item_orm)
    await db.commit()

    # Reload the project with items relationship eagerly loaded
    result = await db.execute(
        select(ProjectOrm)
        .where(ProjectOrm.id == project_id)
        .options(selectinload(ProjectOrm.items)),
    )
    updated_project = result.scalar_one()
    return Project.model_validate(updated_project)


@projects.delete("/{project_id}/items/{item_id}")
async def remove_item_from_project(project_id: int, item_id: int, current_user: Annotated[UserOrm, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]) -> Project:
    result = await db.execute(select(ProjectItemOrm).where(ProjectItemOrm.project_id == project_id, ProjectItemOrm.item_id == item_id))
    project_item_orm = result.scalar_one_or_none()
    if not project_item_orm:
        raise HTTPException(status_code=404, detail="Item not found in project")
    if not project_item_orm.project.does_user_have_access(current_user.id):
        raise HTTPException(status_code=403, detail="You do not have access to this project")
    await db.delete(project_item_orm)
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
async def add_project_to_group(group_id: int, project_id: int, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


@projects.delete("/group/{group_id}/{project_id}")
async def remove_project_from_group(group_id: int, project_id: int, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


@projects.get("/group/{group_id}/projects")
async def get_group_projects(group_id: int, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}

# User project endpoints
@projects.get("/user")
async def get_user_projects(current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


@projects.post("/user/{user_id}/{project_id}")
async def add_project_to_user(user_id: int, project_id: int, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


@projects.delete("/user/{user_id}/{project_id}")
async def remove_project_from_user(user_id: int, project_id: int, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}
