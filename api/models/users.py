import uuid
from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import TYPE_CHECKING, Optional

from pydantic import BaseModel, ConfigDict
from sqlalchemy import DateTime, ForeignKey, String, delete, select
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship, selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from database import Base


class GroupMemberRole(str, Enum):
    MEMBER = "member"
    CO_OWNER = "co_owner"
    OWNER = "owner"


if TYPE_CHECKING:
    from models.projects import ProjectOrm


class UserGroupMembership(Base):
    __tablename__ = "user_group_memberships"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    user_group_id: Mapped[int] = mapped_column(
        ForeignKey("user_groups.id"), primary_key=True,
    )
    role: Mapped[GroupMemberRole] = mapped_column(
        SQLEnum(GroupMemberRole), default=GroupMemberRole.MEMBER,
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))

    # Relationships to the actual objects
    user: Mapped["UserOrm"] = relationship(
        "UserOrm", back_populates="group_memberships",
    )
    user_group: Mapped["UserGroupOrm"] = relationship(
        "UserGroupOrm", back_populates="user_memberships",
    )


class BasicUser(BaseModel):
    """Simplified user model without circular references for use in groups"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    discord_id: str
    username: str
    discriminator: str | None = None
    global_name: str | None = None
    avatar: str | None = None


class BasicUserWithRole(BaseModel):
    """User model with group role information"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    discord_id: str
    username: str
    discriminator: str | None = None
    global_name: str | None = None
    avatar: str | None = None
    role: GroupMemberRole


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    discord_id: str
    username: str
    discriminator: str | None = None
    global_name: str | None = None
    avatar: str | None = None
    email: str | None = None
    created_at: datetime
    updated_at: datetime
    groups: list["UserGroup"]
    owned_groups: list["UserGroup"]


class UserOrm(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    discord_id: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True,
    )
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    discriminator: Mapped[str] = mapped_column(String(10), nullable=True)
    global_name: Mapped[str] = mapped_column(String(100), nullable=True)
    avatar: Mapped[str] = mapped_column(String(200), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC),
    )

    group_memberships: Mapped[list["UserGroupMembership"]] = relationship(
        "UserGroupMembership", back_populates="user",
    )
    owned_groups: Mapped[list["UserGroupOrm"]] = relationship(
        "UserGroupOrm", back_populates="owner",
    )
    projects: Mapped[list["ProjectOrm"]] = relationship(
        "ProjectOrm", back_populates="owner",
    )

    @property
    def groups(self) -> list["UserGroupOrm"]:
        return [membership.user_group for membership in self.group_memberships]


class UserGroup(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    owner_id: int
    users: list[BasicUser]
    can_create_projects: bool = False  # Will be set based on user's permissions


class UserGroupWithRoles(BaseModel):
    """User group model that includes role information for members"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    owner_id: int
    users: list[BasicUserWithRole]
    can_create_projects: bool = False  # Will be set based on user's permissions


class UserGroupOrm(Base):
    __tablename__ = "user_groups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    owner: Mapped[UserOrm] = relationship("UserOrm", back_populates="owned_groups")
    projects: Mapped[list["ProjectOrm"]] = relationship(
        "ProjectOrm", back_populates="group",
    )

    user_memberships: Mapped[list["UserGroupMembership"]] = relationship(
        "UserGroupMembership", back_populates="user_group",
    )
    invites: Mapped[list["UserGroupInviteOrm"]] = relationship(
        "UserGroupInviteOrm", back_populates="user_group",
    )

    @property
    def users(self) -> list[UserOrm]:
        return [membership.user for membership in self.user_memberships]

    def is_user_in_group(self, user_id: int) -> bool:
        # Check if user is the group owner
        if self.owner_id == user_id:
            return True
        # Check if user is in the memberships
        return any(
            membership.user_id == user_id for membership in self.user_memberships
        )

    def is_user_owner_or_co_owner(self, user_id: int) -> bool:
        """Check if user is the owner or a co-owner of the group"""
        if self.owner_id == user_id:
            return True
        return any(
            membership.user_id == user_id
            and membership.role == GroupMemberRole.CO_OWNER
            for membership in self.user_memberships
        )

    def can_user_manage_group_projects(self, user_id: int) -> bool:
        """Check if user can manage (modify) group projects"""
        return self.is_user_owner_or_co_owner(user_id)


class UserGroupInviteOrm(Base):
    __tablename__ = "user_group_invites"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_group_id: Mapped[int] = mapped_column(ForeignKey("user_groups.id"), nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    invite_code: Mapped[str] = mapped_column(String(255), nullable=False)
    user_group: Mapped["UserGroupOrm"] = relationship("UserGroupOrm", back_populates="invites")

    @staticmethod
    def generate_invite_code() -> str:
        return str(uuid.uuid4())

    @classmethod
    async def create_invite(
        cls,
        db: AsyncSession,
        user_group_id: int,
        owner_id: int,
        expires_in_days: int = 7,
    ) -> "UserGroupInviteOrm":
        """Create a new invite for a user group"""
        invite = cls(
            user_group_id=user_group_id,
            owner_id=owner_id,
            expires_at=datetime.now(UTC) + timedelta(days=expires_in_days),
            invite_code=cls.generate_invite_code(),
        )
        db.add(invite)
        await db.commit()
        await db.refresh(invite)
        return invite

    def is_expired(self) -> bool:
        """Check if the invite has expired"""
        # Ensure both datetimes are timezone-aware for comparison
        current_time = datetime.now(UTC)
        expires_time = self.expires_at

        # If expires_at is timezone-naive, assume it's in UTC
        if expires_time.tzinfo is None:
            expires_time = expires_time.replace(tzinfo=UTC)
        return current_time > expires_time

    def is_valid(self) -> bool:
        """Check if the invite is valid (not expired)"""
        return not self.is_expired()

    @classmethod
    async def get_valid_invite_by_code(
        cls,
        db: AsyncSession,
        invite_code: str,
    ) -> Optional["UserGroupInviteOrm"]:
        """Get a valid invite by its code"""
        stmt = select(cls).where(cls.invite_code == invite_code).options(
            selectinload(cls.user_group).selectinload(UserGroupOrm.user_memberships),
        )
        result = await db.execute(stmt)
        invite = result.scalar_one_or_none()

        if invite and invite.is_valid():
            return invite
        return None

    @classmethod
    def cleanup_expired_invites(cls, db: Session) -> int:
        """Delete all expired invites and return count of deleted invites"""
        stmt = delete(cls).where(cls.expires_at < datetime.now(UTC))
        result = db.execute(stmt)
        db.commit()
        return result.rowcount

    async def use_invite(self, db: AsyncSession, user_id: int) -> bool:
        """
        Use the invite to add a user to the group.
        Returns True if successful, False if failed.
        """
        if not self.is_valid():
            return False

        # Check if user is already in the group
        if self.user_group.is_user_in_group(user_id):
            return False

        # Add user to the group
        membership = UserGroupMembership(
            user_id=user_id,
            user_group_id=self.user_group_id,
            role=GroupMemberRole.MEMBER,
        )
        db.add(membership)

        # Delete the invite after use (single use)
        db.delete(self)
        await db.commit()

        return True

    @classmethod
    async def delete_invite(cls, db: AsyncSession, invite_id: int, owner_id: int) -> bool:
        """
        Delete an invite. Only the invite owner can delete it.
        Returns True if successful, False if failed.
        """
        stmt = select(cls).where(cls.id == invite_id)
        result = await db.execute(stmt)
        invite = result.scalar_one_or_none()

        if not invite or invite.owner_id != owner_id:
            return False

        db.delete(invite)
        await db.commit()
        return True

    @classmethod
    async def get_group_invites(cls, db: AsyncSession, user_group_id: int) -> list["UserGroupInviteOrm"]:
        """Get all invites for a specific user group"""
        stmt = select(cls).where(cls.user_group_id == user_group_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @classmethod
    async def get_user_invites(cls, db: AsyncSession, owner_id: int) -> list["UserGroupInviteOrm"]:
        """Get all invites created by a specific user"""
        stmt = select(cls).where(cls.owner_id == owner_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())
