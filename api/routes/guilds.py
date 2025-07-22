from fastapi import APIRouter, Depends

from models.users import Group, GroupOrm, User
from routes.auth import get_current_user

groups = APIRouter(prefix="/groups", tags=["groups"])


@groups.get("/{group_id}")
async def get_group(group_id: int) -> Group:
    return await GroupOrm.get_group(group_id)


@groups.post("/{name}")
async def create_group(name: str, current_user: User = Depends(get_current_user)) -> Group:
    return await GroupOrm.create_group(name, current_user.id)
