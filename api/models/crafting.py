from uuid import uuid4

from pydantic import UUID4, BaseModel, ConfigDict
from sqlalchemy import ForeignKey, Integer, String, delete, or_, select
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base, SessionLocal
from models.items import Item


class CraftingProjectItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item: Item
    count: int


class CraftingProject(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    public_uuid: UUID4
    private_uuid: UUID4
    project_name: str
    target_items: list[CraftingProjectItem]


class CraftingProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    project_id: int
    public_uuid: UUID4
    private_uuid: UUID4
    project_name: str
    target_items: list[CraftingProjectItem]
    is_private: bool


class CraftingProjectOrm(Base):
    """SQLAlchemy model for crafting projects"""
    __tablename__ = "crafting_projects"

    project_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    public_uuid: Mapped[UUID4] = mapped_column(UUID, nullable=False, index=True)
    private_uuid: Mapped[UUID4] = mapped_column(UUID, nullable=False, index=True)
    project_name: Mapped[str] = mapped_column(String, nullable=False)

    # Relationship to project items
    target_items = relationship("CraftingProjectItemOrm", back_populates="project", cascade="all, delete-orphan")

    @staticmethod
    async def create_project(project_name: str) -> "CraftingProject":
        public_uuid = uuid4()
        private_uuid = uuid4()
        project = CraftingProjectOrm(
            public_uuid=public_uuid,
            private_uuid=private_uuid,
            project_name=project_name,
        )

        async with SessionLocal() as session:
            session.add(project)
            await session.commit()
            await session.refresh(project)

            # Convert SQLAlchemy object to Pydantic model using model_validate
            # Note: target_items will be empty for a new project
            return CraftingProject.model_validate({
                "project_id": project.project_id,
                "public_uuid": project.public_uuid,
                "private_uuid": project.private_uuid,
                "project_name": project.project_name,
                "target_items": [],
            })

    @staticmethod
    async def get_project(project_id: int) -> "CraftingProject | None":
        async with SessionLocal() as session:
            project = await session.get(CraftingProjectOrm, project_id)
            if project:
                await session.refresh(project)

                result = CraftingProject.model_validate({
                    "project_id": project.project_id,
                    "public_uuid": project.public_uuid,
                    "private_uuid": project.private_uuid,
                    "project_name": project.project_name,
                    "target_items": [],
                })
                project_items = await CraftingProjectItemOrm.get_project_items(result.project_id)
                # Convert CraftingProjectItemOrm to simple dict with item_id and count
                result.target_items = [
                    CraftingProjectItem(
                        item=Item(
                            id=item.item_id, 
                            name="", 
                            description="",
                            volume=0,
                            durability=0,
                            model_asset_name="",
                            icon_asset_name="",
                            tier=0,
                            tag=""
                        ),  # Minimal item for validation
                        count=item.count
                    ) for item in project_items
                ]
                return result
            return None

    @staticmethod
    async def get_project_by_uuid(project_uuid: str) -> "CraftingProjectResponse | None":
        project_uuid = UUID4(project_uuid) # type: ignore[assignment]
        async with SessionLocal() as session:
            # Search for the UUID in both public_uuid and private_uuid fields
            query = await session.execute(
                select(CraftingProjectOrm).where(
                    or_(
                        CraftingProjectOrm.public_uuid == project_uuid,
                        CraftingProjectOrm.private_uuid == project_uuid,
                    ),
                ),
            )
            project = query.scalar_one_or_none()

            if project:
                await session.refresh(project)

                result: CraftingProjectResponse = CraftingProjectResponse.model_validate({
                    "project_id": project.project_id,
                    "public_uuid": project.public_uuid,
                    "private_uuid": project.private_uuid,
                    "project_name": project.project_name,
                    "target_items": [],
                    "is_private": project.private_uuid == project_uuid,
                })
                project_items = await CraftingProjectItemOrm.get_project_items(result.project_id)
                # Convert CraftingProjectItemOrm to simple dict with item_id and count
                result.target_items = [
                    CraftingProjectItem(
                        item=Item(
                            id=item.item_id, 
                            name="", 
                            description="",
                            volume=0,
                            durability=0,
                            model_asset_name="",
                            icon_asset_name="",
                            tier=0,
                            tag=""
                        ),  # Minimal item for validation
                        count=item.count
                    ) for item in project_items
                ]

                return result
            return None

class CraftingProjectItemOrm(Base):
    """SQLAlchemy model for items in crafting projects"""
    __tablename__ = "crafting_project_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("crafting_projects.project_id"), nullable=False)
    item_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)  # Reference to Item.id
    count: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationship back to project
    project = relationship("CraftingProjectOrm", back_populates="target_items")

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
    async def get_project_items(project_id: int) -> list["CraftingProjectItemOrm"]:
        async with SessionLocal() as session:
            query = select(CraftingProjectItemOrm).where(
                CraftingProjectItemOrm.project_id == project_id,
            )
            result = await session.execute(query)
            return list(result.scalars().all())

    @staticmethod
    async def get_project_item(project_id: int, item_id: int) -> "CraftingProjectItemOrm | None":
        async with SessionLocal() as session:
            query = select(CraftingProjectItemOrm).where(
                CraftingProjectItemOrm.project_id == project_id,
                CraftingProjectItemOrm.item_id == item_id,
            )
            result = await session.execute(query)
            return result.scalar_one_or_none()

    async def update_item_count(self, count: int) -> None:
        async with SessionLocal() as session:
            self.count = count
            session.add(self)
            await session.commit()
