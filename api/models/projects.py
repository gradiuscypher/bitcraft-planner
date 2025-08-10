from datetime import UTC, datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

if TYPE_CHECKING:
    from models.users import UserOrm, UserGroupOrm  # noqa: I001
    from models.gamedata import GameItemOrm


class CreateProjectRequest(BaseModel):
    name: str
    group_id: int | None = None


class AddItemToProjectRequest(BaseModel):
    item_id: int
    amount: int
    item_type: str = "item"  # "item", "building", or "cargo"


class UpdateProjectItemCountRequest(BaseModel):
    count: int


class Project(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    owner_id: int
    group_id: int | None = None
    created_at: datetime
    updated_at: datetime
    items: list["ProjectItem"] = []


class ProjectItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    name: str
    count: int
    target_count: int
    tier: int | None = None


class ProjectItemOrm(Base):
    __tablename__ = "project_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("game_items.id"), nullable=False)
    # Read-only relationship to game item using external item_id key
    # The physical FK points to game_items.id in DB, but we store BitCraft's item_id here.
    # Use a custom join so we can still access related fields like tier.
    item: Mapped["GameItemOrm"] = relationship(
        "GameItemOrm",
        primaryjoin="ProjectItemOrm.item_id == foreign(GameItemOrm.item_id)",
        viewonly=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False)
    target_count: Mapped[int] = mapped_column(Integer, nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    project: Mapped["ProjectOrm"] = relationship("ProjectOrm", back_populates="items")

    @property
    def tier(self) -> int | None:  # surfaced to API via Pydantic ProjectItem
        # When the related game item is loaded, expose its tier
        try:
            return getattr(self.item, "tier", None)
        except Exception:
            return None


class ProjectOrm(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    group_id: Mapped[int] = mapped_column(ForeignKey("user_groups.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC),
    )

    owner: Mapped["UserOrm"] = relationship("UserOrm", back_populates="projects")
    group: Mapped["UserGroupOrm | None"] = relationship(
        "UserGroupOrm", back_populates="projects",
    )
    items: Mapped[list["ProjectItemOrm"]] = relationship(
        "ProjectItemOrm", back_populates="project",
    )

    def does_user_have_access(self, user_id: int) -> bool:
        """Check if user can view the project"""
        return self.owner_id == user_id or (
            self.group_id is not None and self.group.is_user_in_group(user_id)
        )

    def can_user_modify(self, user_id: int) -> bool:
        """Check if user can modify the project"""
        # Project owner can always modify
        if self.owner_id == user_id:
            return True
        # For group projects, only group owners and co-owners can modify
        if self.group_id is not None:
            return self.group.can_user_manage_group_projects(user_id)
        # For personal projects, only the owner can modify
        return False
