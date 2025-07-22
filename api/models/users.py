from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base, SessionLocal

if TYPE_CHECKING:
    from models.crafting import CraftingProjectOwnership


class Group(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class UserGroupMembershipResponse(BaseModel):
    """Pydantic model for UserGroupMembership responses"""
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    group_id: int
    joined_at: datetime
    is_admin: bool


class UserGroupMembership(Base):
    __tablename__ = "user_group_memberships"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="group_memberships")
    group = relationship("GroupOrm", back_populates="user_memberships")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    discord_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    discriminator: Mapped[str] = mapped_column(String(10), nullable=True)  # Legacy Discord discriminator
    global_name: Mapped[str] = mapped_column(String(100), nullable=True)  # New Discord display name
    avatar: Mapped[str] = mapped_column(String(200), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ownership_records = relationship("CraftingProjectOwnership", back_populates="user", cascade="all, delete-orphan")

    group_memberships = relationship("UserGroupMembership", back_populates="user", cascade="all, delete-orphan")
    owned_groups = relationship("GroupOrm", back_populates="group_owner", cascade="all, delete-orphan")

    @property
    def owned_projects(self) -> list["CraftingProjectOwnership"]:
        return [ownership.project for ownership in self.ownership_records]

    @property
    def groups(self) -> list[UserGroupMembership]:
        return [membership.group for membership in self.group_memberships]


class GroupOrm(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    group_owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    user_memberships = relationship("UserGroupMembership", back_populates="group", cascade="all, delete-orphan")
    group_owner = relationship("User", back_populates="owned_groups")

    @property
    def members(self) -> list[User]:
        return [membership.user for membership in self.user_memberships]

    @staticmethod
    async def get_group(group_id: int) -> "GroupOrm":
        async with SessionLocal() as session:
            return await session.get(GroupOrm, group_id)

    @staticmethod
    async def create_group(name: str) -> "GroupOrm":
        async with SessionLocal() as session:
            session.add(GroupOrm(name=name))
            await session.commit()
            return GroupOrm(id=session.get(GroupOrm, name=name).id, name=name)


    async def add_member(self, user_id: int) -> UserGroupMembership:
        async with SessionLocal() as session:
            membership = UserGroupMembership(
                user_id=user_id,
                group_id=self.id,  # Using the instance's ID
                is_admin=False,
            )
            session.add(membership)
            await session.commit()
            await session.refresh(membership)
            return membership

    async def add_admin(self, user_id: int) -> bool:
        async with SessionLocal() as session:
            membership = await session.get(UserGroupMembership, user_id=user_id, group_id=self.id)
            if membership:
                membership.is_admin = True
                await session.commit()
                return True
            return False

    async def is_admin(self, user_id: int) -> bool:
        async with SessionLocal() as session:
            membership = await session.get(UserGroupMembership, user_id=user_id, group_id=self.id)
            return membership.is_admin

    async def remove_admin(self, user_id: int) -> bool:
        async with SessionLocal() as session:
            membership = await session.get(UserGroupMembership, user_id=user_id, group_id=self.id)
            if membership:
                membership.is_admin = False
                await session.commit()
                return True
            return False

    async def remove_member(self, user_id: int) -> bool:
        async with SessionLocal() as session:
            membership = await session.get(UserGroupMembership, user_id=user_id, group_id=self.id)
            if membership:
                await session.delete(membership)
                await session.commit()
                return True
            return False
