from typing import Annotated

from auth import get_current_user
from fastapi import APIRouter, Depends, status

from models.users import UserGroup, UserGroupOrm, UserOrm

groups = APIRouter(prefix="/groups", tags=["groups"])

@groups.get("/")
async def get_groups(current_user: Annotated[UserOrm, Depends(get_current_user)]) -> list[UserGroup]:
    return [UserGroup.model_validate(group) for group in UserGroupOrm.get_user_groups(current_user.id)]


@groups.post("/", status_code=status.HTTP_204_NO_CONTENT)
async def create_group(group_name: str, current_user: Annotated[UserOrm, Depends(get_current_user)]) -> None:
    UserGroupOrm.create_user_group(group_name, current_user.id)


@groups.get("/{group_id}")
async def get_group(group_id: int, current_user: Annotated[UserOrm, Depends(get_current_user)]):
    return {"message": "Hello, World!"}


@groups.put("/{group_id}")
async def update_group(group_id: int, group: UserGroupOrm, current_user: Annotated[UserOrm, Depends(get_current_user)]):
    return {"message": "Hello, World!"}


@groups.delete("/{group_id}")
async def delete_group(group_id: int, current_user: Annotated[UserOrm, Depends(get_current_user)]):
    return {"message": "Hello, World!"}

