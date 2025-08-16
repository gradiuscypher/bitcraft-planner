from datetime import datetime
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
    BasicUserWithRole,
    GroupMemberRole,
    UserGroup,
    UserGroupInviteOrm,
    UserGroupMembership,
    UserGroupOrm,
    UserGroupWithRoles,
    UserOrm,
)
from routes.auth import get_current_user

groups = APIRouter(prefix="/groups", tags=["groups"])


class UpdateGroup(BaseModel):
    name: str


@groups.get("/")
async def get_groups(
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserGroup]:
    result = await db.execute(
        select(UserGroupOrm)
        .join(
            UserGroupMembership,
            UserGroupOrm.id == UserGroupMembership.user_group_id,
            isouter=True,
        )
        .where(
            or_(
                UserGroupOrm.owner_id == current_user.id,  # User is owner
                UserGroupMembership.user_id == current_user.id,  # User is member
            ),
        )
        .options(
            selectinload(UserGroupOrm.user_memberships).selectinload(
                UserGroupMembership.user,
            ),
            selectinload(UserGroupOrm.owner),
        )
        .distinct(),
    )
    groups_list = result.scalars().all()

    # Manually construct UserGroup objects to avoid circular reference issues
    groups_to_return = []
    for group in groups_list:
        # Include the owner first in the users list
        users = [BasicUser.model_validate(group.owner)]
        # Then add members that are not the owner
        for membership in group.user_memberships:
            if membership.user_id != group.owner_id:
                users.append(BasicUser.model_validate(membership.user))

        groups_to_return.append(
            UserGroup(
                id=group.id,
                name=group.name,
                created_at=group.created_at,
                owner_id=group.owner_id,
                users=users,
                can_create_projects=group.is_user_owner_or_co_owner(current_user.id),
            ),
        )

    return groups_to_return


@groups.get("/{group_id}")
async def get_group(
    group_id: int,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserGroupWithRoles:
    result = await db.execute(
        select(UserGroupOrm)
        .where(UserGroupOrm.id == group_id)
        .options(
            selectinload(UserGroupOrm.user_memberships).selectinload(
                UserGroupMembership.user,
            ),
            selectinload(UserGroupOrm.owner),
        ),
    )
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if user has access to this group (owner or member)
    user_has_access = group.owner_id == current_user.id or any(
        membership.user_id == current_user.id for membership in group.user_memberships
    )

    if not user_has_access:
        raise HTTPException(
            status_code=403, detail="You do not have access to this group",
        )

    # Manually construct UserGroupWithRoles object to include role information
    users_with_roles = []

    # First, add the group owner as the first user in the list
    owner_dict = {
        "id": group.owner.id,
        "discord_id": group.owner.discord_id,
        "username": group.owner.username,
        "discriminator": group.owner.discriminator,
        "global_name": group.owner.global_name,
        "avatar": group.owner.avatar,
        "role": GroupMemberRole.OWNER,  # Special role for the owner
    }
    users_with_roles.append(BasicUserWithRole(**owner_dict))

    # Then add all the other members
    for membership in group.user_memberships:
        # Skip the owner if they're also in the memberships table (shouldn't happen but just in case)
        if membership.user.id == group.owner_id:
            continue

        user_dict = {
            "id": membership.user.id,
            "discord_id": membership.user.discord_id,
            "username": membership.user.username,
            "discriminator": membership.user.discriminator,
            "global_name": membership.user.global_name,
            "avatar": membership.user.avatar,
            "role": membership.role,
        }
        users_with_roles.append(BasicUserWithRole(**user_dict))

    return UserGroupWithRoles(
        id=group.id,
        name=group.name,
        created_at=group.created_at,
        owner_id=group.owner_id,
        users=users_with_roles,
        can_create_projects=group.is_user_owner_or_co_owner(current_user.id),
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
        raise HTTPException(
            status_code=403, detail="You are not the owner of this group",
        )

    memberships_result = await db.execute(
        select(UserGroupMembership).where(
            UserGroupMembership.user_group_id == group_id,
        ),
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
        raise HTTPException(
            status_code=403, detail="You are not the owner of this group",
        )

    # Check if user exists and get their user_id
    user_result = await db.execute(
        select(UserOrm).where(UserOrm.discord_id == discord_id),
    )
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
        raise HTTPException(
            status_code=403, detail="You are not the owner of this group",
        )

    # Check if user exists and get their user_id
    user_result = await db.execute(
        select(UserOrm).where(UserOrm.discord_id == discord_id),
    )
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


@groups.post("/{group_id}/co-owners/{discord_id}")
async def promote_user_to_co_owner(
    group_id: int,
    discord_id: str,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Promote a group member to co-owner (only group owner can do this)"""
    result = await db.execute(select(UserGroupOrm).where(UserGroupOrm.id == group_id))
    target_group = result.scalar_one_or_none()

    if not target_group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Only the group owner can promote members to co-owner
    if target_group.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the group owner can promote members to co-owner",
        )

    # Check if user exists and get their user_id
    user_result = await db.execute(
        select(UserOrm).where(UserOrm.discord_id == discord_id),
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find the membership
    membership_result = await db.execute(
        select(UserGroupMembership).where(
            UserGroupMembership.user_id == user.id,
            UserGroupMembership.user_group_id == group_id,
        ),
    )
    membership = membership_result.scalar_one_or_none()

    if not membership:
        raise HTTPException(status_code=404, detail="User is not in the group")

    if membership.role == GroupMemberRole.CO_OWNER:
        raise HTTPException(status_code=400, detail="User is already a co-owner")

    membership.role = GroupMemberRole.CO_OWNER
    await db.commit()


@groups.delete("/{group_id}/co-owners/{discord_id}")
async def demote_co_owner_to_member(
    group_id: int,
    discord_id: str,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Demote a co-owner to regular member (only group owner can do this)"""
    result = await db.execute(select(UserGroupOrm).where(UserGroupOrm.id == group_id))
    target_group = result.scalar_one_or_none()

    if not target_group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Only the group owner can demote co-owners
    if target_group.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the group owner can demote co-owners",
        )

    # Check if user exists and get their user_id
    user_result = await db.execute(
        select(UserOrm).where(UserOrm.discord_id == discord_id),
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find the membership
    membership_result = await db.execute(
        select(UserGroupMembership).where(
            UserGroupMembership.user_id == user.id,
            UserGroupMembership.user_group_id == group_id,
        ),
    )
    membership = membership_result.scalar_one_or_none()

    if not membership:
        raise HTTPException(status_code=404, detail="User is not in the group")

    if membership.role != GroupMemberRole.CO_OWNER:
        raise HTTPException(status_code=400, detail="User is not a co-owner")

    membership.role = GroupMemberRole.MEMBER
    await db.commit()


class CreateInviteRequest(BaseModel):
    expires_in_days: int = 7


class InviteResponse(BaseModel):
    id: int
    invite_code: str
    created_at: datetime
    expires_at: datetime
    owner_id: int


@groups.post("/{group_id}/invites")
async def create_group_invite(
    group_id: int,
    invite_data: CreateInviteRequest,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InviteResponse:
    """Create a new invite for a user group (only owner/co-owners can create invites)"""
    result = await db.execute(select(UserGroupOrm).where(UserGroupOrm.id == group_id))
    target_group = result.scalar_one_or_none()

    if not target_group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if user can create invites (owner or co-owner)
    if not target_group.is_user_owner_or_co_owner(current_user.id):
        raise HTTPException(
            status_code=403, detail="Only group owners and co-owners can create invites",
        )

    # Create the invite
    invite = UserGroupInviteOrm.create_invite(
        db=db,
        user_group_id=group_id,
        owner_id=current_user.id,
        expires_in_days=invite_data.expires_in_days,
    )

    return InviteResponse(
        id=invite.id,
        invite_code=invite.invite_code,
        created_at=invite.created_at,
        expires_at=invite.expires_at,
        owner_id=invite.owner_id,
    )


@groups.get("/{group_id}/invites")
async def list_group_invites(
    group_id: int,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[InviteResponse]:
    """List all invites for a user group (only owner/co-owners can view invites)"""
    result = await db.execute(select(UserGroupOrm).where(UserGroupOrm.id == group_id))
    target_group = result.scalar_one_or_none()

    if not target_group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if user can view invites (owner or co-owner)
    if not target_group.is_user_owner_or_co_owner(current_user.id):
        raise HTTPException(
            status_code=403, detail="Only group owners and co-owners can view invites",
        )

    # Get all invites for the group
    invites = UserGroupInviteOrm.get_group_invites(db=db, user_group_id=group_id)

    return [
        InviteResponse(
            id=invite.id,
            invite_code=invite.invite_code,
            created_at=invite.created_at,
            expires_at=invite.expires_at,
            owner_id=invite.owner_id,
        )
        for invite in invites
    ]


@groups.post("/invites/{invite_code}/join")
async def join_group_with_invite(
    invite_code: str,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Join a group using an invite code"""

    # Get the valid invite
    invite = UserGroupInviteOrm.get_valid_invite_by_code(db=db, invite_code=invite_code)

    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite code")

    # Check if user is already in the group
    if invite.user_group.is_user_in_group(current_user.id):
        raise HTTPException(status_code=400, detail="You are already a member of this group")

    # Use the invite to join the group
    success = invite.use_invite(db=db, user_id=current_user.id)

    if not success:
        raise HTTPException(status_code=400, detail="Failed to join group with invite")

    return {"message": f"Successfully joined group '{invite.user_group.name}'"}


@groups.delete("/invites/{invite_id}")
async def delete_group_invite(
    invite_id: int,
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Delete a group invite (only the invite creator can delete it)"""
    # Get the invite
    invite_result = await db.execute(
        select(UserGroupInviteOrm).where(UserGroupInviteOrm.id == invite_id),
    )
    invite = invite_result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    # Only the invite creator can delete it
    if invite.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the invite creator can delete this invite",
        )

    # Delete the invite
    success = UserGroupInviteOrm.delete_invite(
        db=db, invite_id=invite_id, owner_id=current_user.id,
    )

    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete invite")

    return {"message": "Invite deleted successfully"}


@groups.get("/invites/my")
async def list_my_invites(
    current_user: Annotated[UserOrm, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[InviteResponse]:
    """List all invites created by the current user"""
    invites = UserGroupInviteOrm.get_user_invites(db=db, owner_id=current_user.id)

    return [
        InviteResponse(
            id=invite.id,
            invite_code=invite.invite_code,
            created_at=invite.created_at,
            expires_at=invite.expires_at,
            owner_id=invite.owner_id,
        )
        for invite in invites
    ]
