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

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.projects import CreateProjectRequest, Project, ProjectOrm
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
async def get_project(project_id: int, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


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
    return Project.model_validate(project_orm)


@projects.put("/{project_id}")
async def update_project(project_id: int, project: Project, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


@projects.delete("/{project_id}")
async def delete_project(project_id: int, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}

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
