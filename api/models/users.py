from datetime import UTC, datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

if TYPE_CHECKING:
    from models.projects import ProjectOrm


class UserGroupMembership(Base):
    __tablename__ = "user_group_memberships"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    user_group_id: Mapped[int] = mapped_column(ForeignKey("user_groups.id"), primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))

    # Relationships to the actual objects
    user: Mapped["UserOrm"] = relationship("UserOrm", back_populates="group_memberships")
    user_group: Mapped["UserGroupOrm"] = relationship("UserGroupOrm", back_populates="user_memberships")


class BasicUser(BaseModel):
    """Simplified user model without circular references for use in groups"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    discord_id: str
    username: str
    discriminator: str | None = None
    global_name: str | None = None
    avatar: str | None = None


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
    discord_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    discriminator: Mapped[str] = mapped_column(String(10), nullable=True)
    global_name: Mapped[str] = mapped_column(String(100), nullable=True)
    avatar: Mapped[str] = mapped_column(String(200), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC))

    group_memberships: Mapped[list["UserGroupMembership"]] = relationship("UserGroupMembership", back_populates="user")
    owned_groups: Mapped[list["UserGroupOrm"]] = relationship("UserGroupOrm", back_populates="owner")
    projects: Mapped[list["ProjectOrm"]] = relationship("ProjectOrm", back_populates="owner")

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


class UserGroupOrm(Base):
    __tablename__ = "user_groups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    owner: Mapped[UserOrm] = relationship("UserOrm", back_populates="owned_groups")
    projects: Mapped[list["ProjectOrm"]] = relationship("ProjectOrm", back_populates="group")

    user_memberships: Mapped[list["UserGroupMembership"]] = relationship("UserGroupMembership", back_populates="user_group")

    @property
    def users(self) -> list[UserOrm]:
        return [membership.user for membership in self.user_memberships]
