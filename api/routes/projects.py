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

from auth import get_current_user
from fastapi import APIRouter, Depends

from models.projects import (
    ProjectOrm,
)
from models.users import UserOrm

projects = APIRouter(prefix="/projects", tags=["projects"])

# Regular project endpoints
@projects.get("/")
async def get_projects(current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


@projects.get("/{project_id}")
async def get_project(project_id: int, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


@projects.post("/")
async def create_project(project: ProjectOrm, current_user: UserOrm = Depends(get_current_user)):
    return {"message": "Hello, World!"}


@projects.put("/{project_id}")
async def update_project(project_id: int, project: ProjectOrm, current_user: UserOrm = Depends(get_current_user)):
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