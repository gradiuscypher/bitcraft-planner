from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from models.crafting import CraftingProjectOrm, CraftingProjectResponse
from models.users import Group, GroupOrm, User, UserGroupMembership, UserGroupMembershipResponse
from routes.auth import get_current_user

groups = APIRouter(prefix="/groups", tags=["groups"])


@groups.get("/{group_id}")
async def get_group(group_id: int) -> Group:
    group = await GroupOrm.get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return Group.model_validate(group)


@groups.post("/{name}")
async def create_group(name: str) -> Group:
    group_orm = await GroupOrm.create_group(name)
    return Group.model_validate(group_orm)


@groups.post("/{group_id}/members")
async def add_member(group_id: int, user_id: int, current_user: User = Depends(get_current_user)) -> UserGroupMembershipResponse:
    group = await GroupOrm.get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if not await group.is_admin(current_user.id):
        raise HTTPException(status_code=403, detail="You are not an admin of this group")
    membership = await group.add_member(user_id)
    return UserGroupMembershipResponse.model_validate(membership)


@groups.delete("/{group_id}/members/{user_id}")
async def remove_member(group_id: int, user_id: int, current_user: User = Depends(get_current_user)) -> bool:
    group = await GroupOrm.get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if not await group.is_admin(current_user.id):
        raise HTTPException(status_code=403, detail="You are not an admin of this group")
    return await group.remove_member(user_id)


@groups.get("/{group_id}/projects")
async def get_group_projects(group_id: int) -> list[CraftingProjectResponse]:
    return await CraftingProjectOrm.get_group_projects(group_id)
