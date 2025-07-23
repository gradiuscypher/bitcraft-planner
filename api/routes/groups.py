from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.projects import ProjectOrm
from models.users import (
    BasicUser,
    UserGroup,
    UserGroupMembership,
    UserGroupOrm,
    UserOrm,
)
from routes.auth import get_current_user

groups = APIRouter(prefix="/groups", tags=["groups"])


class UpdateGroup(BaseModel):
    name: str


@groups.get("/", include_in_schema=False)
@groups.get("")
async def get_groups(
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserGroup]:
    result = await db.execute(
        select(UserGroupOrm)
        .join(UserGroupMembership, UserGroupOrm.id == UserGroupMembership.user_group_id, isouter=True)
        .where(
            or_(
                UserGroupOrm.owner_id == current_user.id,  # User is owner
                UserGroupMembership.user_id == current_user.id,  # User is member
            ),
        )
        .options(selectinload(UserGroupOrm.user_memberships).selectinload(UserGroupMembership.user))
        .distinct(),
    )
    groups_list = result.scalars().all()

    # Manually construct UserGroup objects to avoid circular reference issues
    return [
        UserGroup(
            id=group.id,
            name=group.name,
            created_at=group.created_at,
            owner_id=group.owner_id,
            users=[BasicUser.model_validate(membership.user) for membership in group.user_memberships],
        )
        for group in groups_list
    ]


@groups.get("/{group_id}")
async def get_group(
    group_id: int,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserGroup:
    result = await db.execute(
        select(UserGroupOrm)
        .where(UserGroupOrm.id == group_id)
        .options(
            selectinload(UserGroupOrm.user_memberships).selectinload(UserGroupMembership.user),
            selectinload(UserGroupOrm.owner),
        ),
    )
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if user has access to this group (owner or member)
    user_has_access = (
        group.owner_id == current_user.id or
        any(membership.user_id == current_user.id for membership in group.user_memberships)
    )

    if not user_has_access:
        raise HTTPException(status_code=403, detail="You do not have access to this group")

    # Manually construct UserGroup object to avoid circular reference issues
    return UserGroup(
        id=group.id,
        name=group.name,
        created_at=group.created_at,
        owner_id=group.owner_id,
        users=[BasicUser.model_validate(membership.user) for membership in group.user_memberships],
    )


@groups.post("/")
async def create_group(
    group_name: str,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    user_group = UserGroupOrm(name=group_name, owner_id=current_user.id)
    db.add(user_group)
    await db.commit()





@groups.delete("/{group_id}")
async def delete_group(
    group_id: int,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(select(UserGroupOrm).where(UserGroupOrm.id == group_id))
    target_group = result.scalar_one_or_none()

    if not target_group:
        raise HTTPException(status_code=404, detail="Group not found")

    if target_group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the owner of this group")

    memberships_result = await db.execute(
        select(UserGroupMembership).where(UserGroupMembership.user_group_id == group_id),
    )
    memberships = memberships_result.scalars().all()
    for membership in memberships:
        await db.delete(membership)

    projects_result = await db.execute(
        select(ProjectOrm).where(ProjectOrm.group_id == group_id),
    )
    projects = projects_result.scalars().all()
    for project in projects:
        project.group_id = None

    await db.delete(target_group)
    await db.commit()


@groups.post("/{group_id}/users/{discord_id}")
async def add_user_to_group(
    group_id: int,
    discord_id: str,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(select(UserGroupOrm).where(UserGroupOrm.id == group_id))
    target_group = result.scalar_one_or_none()

    if not target_group:
        raise HTTPException(status_code=404, detail="Group not found")

    if target_group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the owner of this group")

    # Check if user exists and get their user_id
    user_result = await db.execute(select(UserOrm).where(UserOrm.discord_id == discord_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if membership already exists
    existing_membership = await db.execute(
        select(UserGroupMembership).where(
            UserGroupMembership.user_id == user.id,
            UserGroupMembership.user_group_id == group_id,
        ),
    )
    if existing_membership.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already in the group")

    membership = UserGroupMembership(user_id=user.id, user_group_id=group_id)
    db.add(membership)
    await db.commit()


@groups.delete("/{group_id}/users/{discord_id}")
async def remove_user_from_group(
    group_id: int,
    discord_id: str,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(select(UserGroupOrm).where(UserGroupOrm.id == group_id))
    target_group = result.scalar_one_or_none()

    if not target_group:
        raise HTTPException(status_code=404, detail="Group not found")

    if target_group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the owner of this group")

    # Check if user exists and get their user_id
    user_result = await db.execute(select(UserOrm).where(UserOrm.discord_id == discord_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find and remove the membership
    membership_result = await db.execute(
        select(UserGroupMembership).where(
            UserGroupMembership.user_id == user.id,
            UserGroupMembership.user_group_id == group_id,
        ),
    )
    membership = membership_result.scalar_one_or_none()

    if not membership:
        raise HTTPException(status_code=404, detail="User is not in the group")

    await db.delete(membership)
    await db.commit()
