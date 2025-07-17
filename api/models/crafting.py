from uuid import uuid4

from pydantic import UUID4, BaseModel, ConfigDict
from sqlalchemy import UUID, Column, ForeignKey, Integer, String, delete, select
from sqlalchemy.orm import relationship

from database import Base, SessionLocal
from models.items import Item


class CraftingProjectItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item: Item
    count: int


class CraftingProject(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    project_uuid: UUID4
    project_name: str
    target_items: list[CraftingProjectItem]


class CraftingProjectOrm(Base):
    """SQLAlchemy model for crafting projects"""
    __tablename__ = "crafting_projects"

    project_id = Column(Integer, primary_key=True, index=True)
    project_uuid = Column(UUID(as_uuid=True), nullable=False, index=True)
    project_name = Column(String, nullable=False)

    # Relationship to project items
    target_items = relationship("CraftingProjectItem", back_populates="project", cascade="all, delete-orphan")

    @staticmethod
    async def create_project(project_name: str) -> "CraftingProject":
        project_uuid = uuid4()
        project = CraftingProjectOrm(project_uuid=project_uuid, project_name=project_name)

        async with SessionLocal() as session:
            session.add(project)
            await session.commit()
            await session.refresh(project)

            # Convert SQLAlchemy object to Pydantic model using model_validate
            # Note: target_items will be empty for a new project
            return CraftingProject.model_validate({
                "project_id": project.project_id,
                "project_uuid": project.project_uuid,
                "project_name": project.project_name,
                "target_items": [],
            })

    @staticmethod
    async def get_project(project_id: int) -> "CraftingProject | None":
        async with SessionLocal() as session:
            project = await session.get(CraftingProject, project_id)
            if project:
                await session.refresh(project)

                return CraftingProject.model_validate({
                    "project_id": project.project_id,
                    "project_uuid": project.project_uuid,
                    "project_name": project.project_name,
                    "target_items": [],
                })
            return None

    @staticmethod
    async def get_project_by_uuid(project_uuid: UUID) -> "CraftingProject | None":
        async with SessionLocal() as session:
            query = await session.execute(select(CraftingProjectOrm).where(CraftingProjectOrm.project_uuid == project_uuid))
            project = query.scalar_one_or_none()

            if project:
                await session.refresh(project)

                result: CraftingProject = CraftingProject.model_validate({
                    "project_id": project.project_id,
                    "project_uuid": project.project_uuid,
                    "project_name": project.project_name,
                })
                result.target_items = await CraftingProjectItemOrm.get_project_items(result.project_id)

                return result
            return None

class CraftingProjectItemOrm(Base):
    """SQLAlchemy model for items in crafting projects"""
    __tablename__ = "crafting_project_items"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("crafting_projects.project_id"), nullable=False)
    item_id = Column(Integer, nullable=False, index=True)  # Reference to Item.id
    count = Column(Integer, nullable=False)

    # Relationship back to project
    project = relationship("CraftingProject", back_populates="target_items")

    @staticmethod
    async def add_item_to_project(project_id: int, item_id: int, count: int) -> None:
        async with SessionLocal() as session:
            session.add(CraftingProjectItemOrm(project_id=project_id, item_id=item_id, count=count))
            await session.commit()

    @staticmethod
    async def remove_item_from_project(project_id: int, item_id: int) -> None:
        async with SessionLocal() as session:
            await session.execute(delete(CraftingProjectItemOrm).where(CraftingProjectItemOrm.project_id == project_id, CraftingProjectItemOrm.item_id == item_id))
            await session.commit()


    @staticmethod
    async def get_project_items(project_id: int) -> list["CraftingProjectItem"]:
        async with SessionLocal() as session:
            result = await session.execute(select(CraftingProjectItemOrm).where(CraftingProjectItemOrm.project_id == project_id))
            items = list(result.scalars().all())

            return [CraftingProjectItem.model_validate(item) for item in items]

    async def update_item_count(self, count: int) -> None:
        async with SessionLocal() as session:
            self.count = count
            session.add(self)
            await session.commit()
