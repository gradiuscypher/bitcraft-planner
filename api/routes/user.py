from fastapi import APIRouter, Depends
from typing import Annotated

from models.users import UserOrm, BasicUser
from stdb_helpers import get_user_list_by_id, get_user_list_by_name
from routes.auth import get_current_user

user = APIRouter(prefix="/user", tags=["user", "authentication"])

# Create a reusable dependency for current user
CurrentUser = Annotated[UserOrm, Depends(get_current_user)]


@user.get("/me")
async def get_me(current_user: CurrentUser) -> dict:
    return {"message": f"Hello {current_user.username}!", "user_id": current_user.id}
