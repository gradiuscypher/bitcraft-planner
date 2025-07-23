from typing import Annotated

from auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from models.users import UserGroup, UserGroupOrm, UserOrm

groups = APIRouter(prefix="/groups", tags=["groups"])


class UpdateGroup(BaseModel):
    name: str


@groups.get("/")
async def get_groups(current_user: Annotated[UserOrm, Depends(get_current_user)]) -> list[UserGroup]:
    return [UserGroup.model_validate(group) for group in UserGroupOrm.get_user_groups(current_user.id)]


@groups.post("/")
async def create_group(group_name: str, current_user: Annotated[UserOrm, Depends(get_current_user)]) -> None:
    UserGroupOrm.create_user_group(group_name, current_user.id)


# @groups.get("/{group_id}")
# async def get_group(group_id: int, current_user: Annotated[UserOrm, Depends(get_current_user)]) -> UserGroup:
#     return UserGroup.model_validate(UserGroupOrm.get_user_group(group_id))


# @groups.put("/{group_id}")
# async def update_group(group_id: int, group: UserGroupOrm, current_user: Annotated[UserOrm, Depends(get_current_user)]):
#     return {"message": "Hello, World!"}


@groups.delete("/{group_id}")
async def delete_group(group_id: int, current_user: Annotated[UserOrm, Depends(get_current_user)]) -> None:
    target_group = UserGroupOrm.get_user_group(group_id)
    if target_group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the owner of this group")
    UserGroupOrm.delete_user_group(group_id)
