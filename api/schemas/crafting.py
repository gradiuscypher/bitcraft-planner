from uuid import uuid4

from sqlalchemy import UUID, Column, ForeignKey, Integer, String, delete, select
from sqlalchemy.orm import relationship

from database import Base, SessionLocal


class CraftingProject(Base):
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
        project = CraftingProject(project_uuid=project_uuid, project_name=project_name)

        async with SessionLocal() as session:
            session.add(project)
            await session.commit()
            await session.refresh(project)
            # Access attributes while session is active
            project_id = project.project_id
            project_uuid_val = project.project_uuid
            project_name_val = project.project_name

        # Create a new object with plain values
        result = CraftingProject()
        result.project_id = project_id
        result.project_uuid = project_uuid_val
        result.project_name = project_name_val
        return result

    @staticmethod
    async def get_project(project_id: int) -> "CraftingProject | None":
        async with SessionLocal() as session:
            project = await session.get(CraftingProject, project_id)
            if project:
                await session.refresh(project)
                # Access attributes while session is active
                pid = project.project_id
                puuid = project.project_uuid
                pname = project.project_name

                # Create a new object with plain values
                result = CraftingProject()
                result.project_id = pid
                result.project_uuid = puuid
                result.project_name = pname
                return result
            return None

    @staticmethod
    async def get_project_by_uuid(project_uuid: UUID) -> "CraftingProject | None":
        async with SessionLocal() as session:
            result = await session.execute(select(CraftingProject).where(CraftingProject.project_uuid == project_uuid))
            project = result.scalar_one_or_none()
            if project:
                await session.refresh(project)
                # Access attributes while session is active
                pid = project.project_id
                puuid = project.project_uuid
                pname = project.project_name

                # Create a new object with plain values
                result = CraftingProject()
                result.project_id = pid
                result.project_uuid = puuid
                result.project_name = pname
                return result
            return None

class CraftingProjectItem(Base):
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
            session.add(CraftingProjectItem(project_id=project_id, item_id=item_id, count=count))
            await session.commit()

    @staticmethod
    async def remove_item_from_project(project_id: int, item_id: int) -> None:
        async with SessionLocal() as session:
            await session.execute(delete(CraftingProjectItem).where(CraftingProjectItem.project_id == project_id, CraftingProjectItem.item_id == item_id))
            await session.commit()


    @staticmethod
    async def get_project_items(project_id: int) -> list["CraftingProjectItem"]:
        async with SessionLocal() as session:
            result = await session.execute(select(CraftingProjectItem).where(CraftingProjectItem.project_id == project_id))
            items = list(result.scalars().all())

            # Convert to objects with plain values
            plain_items = []
            for item in items:
                plain_item = CraftingProjectItem()
                plain_item.id = item.id
                plain_item.project_id = item.project_id
                plain_item.item_id = item.item_id
                plain_item.count = item.count
                plain_items.append(plain_item)

            return plain_items


    async def update_item_count(self, count: int) -> None:
        async with SessionLocal() as session:
            self.count = count
            session.add(self)
            await session.commit()
