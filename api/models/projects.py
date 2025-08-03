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
    name: str
    count: int


class ProjectItemOrm(Base):
    __tablename__ = "project_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    item: Mapped["GameItemOrm"] = relationship("GameItemOrm")
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    project: Mapped["ProjectOrm"] = relationship("ProjectOrm", back_populates="items")


class ProjectOrm(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    group_id: Mapped[int] = mapped_column(ForeignKey("user_groups.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC))

    owner: Mapped["UserOrm"] = relationship("UserOrm", back_populates="projects")
    group: Mapped["UserGroupOrm | None"] = relationship("UserGroupOrm", back_populates="projects")
    items: Mapped[list["ProjectItemOrm"]] = relationship("ProjectItemOrm", back_populates="project")

    def does_user_have_access(self, user_id: int) -> bool:
        return self.owner_id == user_id or (self.group_id is not None and self.group.is_user_in_group(user_id))
