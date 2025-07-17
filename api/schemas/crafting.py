from sqlalchemy import UUID, Column, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class CraftingProject(Base):
    """SQLAlchemy model for crafting projects"""
    __tablename__ = "crafting_projects"

    project_id = Column(Integer, primary_key=True, index=True)
    project_owner = Column(UUID(as_uuid=True), nullable=False, index=True)
    project_name = Column(String, nullable=False)

    # Relationship to project items
    target_items = relationship("CraftingProjectItem", back_populates="project", cascade="all, delete-orphan")


class CraftingProjectItem(Base):
    """SQLAlchemy model for items in crafting projects"""
    __tablename__ = "crafting_project_items"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("crafting_projects.project_id"), nullable=False)
    item_id = Column(Integer, nullable=False, index=True)  # Reference to Item.id
    count = Column(Integer, nullable=False)

    # Relationship back to project
    project = relationship("CraftingProject", back_populates="target_items")
