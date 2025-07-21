from uuid import uuid4
from datetime import datetime

from pydantic import UUID4, BaseModel, ConfigDict
from sqlalchemy import ForeignKey, Integer, String, delete, or_, select, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base, SessionLocal
from models.items import Item
from models.users import User


class CraftingProjectOwnership(Base):
    """Association object for many-to-many relationship between CraftingProject and User"""
    __tablename__ = "crafting_project_owners"
    
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("crafting_projects.project_id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("CraftingProjectOrm", back_populates="ownership_records")
    user = relationship("User", back_populates="ownership_records")


class CraftingProjectOwner(BaseModel):
    """Pydantic model for project owner information"""
    model_config = ConfigDict(from_attributes=True)
    
    user_id: int
    discord_id: str
    username: str
    global_name: str | None


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
    owners: list[CraftingProjectOwner]


class CraftingProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    project_id: int
    public_uuid: UUID4
    private_uuid: UUID4
    project_name: str
    target_items: list[CraftingProjectItem]
    owners: list[CraftingProjectOwner]
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
    
    # Relationship to ownership records
    ownership_records = relationship("CraftingProjectOwnership", back_populates="project", cascade="all, delete-orphan")
    
    # Convenient property to get owners directly
    @property
    def owners(self):
        return [ownership.user for ownership in self.ownership_records]

    @staticmethod
    async def create_project(project_name: str, owner_user_id: int) -> "CraftingProject":
        """Create a new project with the specified user as the initial owner"""
        public_uuid = uuid4()
        private_uuid = uuid4()
        project = CraftingProjectOrm(
            public_uuid=public_uuid,
            private_uuid=private_uuid,
            project_name=project_name,
        )

        async with SessionLocal() as session:
            session.add(project)
            await session.flush()  # Flush to get the project_id
            
            # Get the owner user and create ownership record
            owner = await session.get(User, owner_user_id)
            if not owner:
                raise ValueError(f"User with ID {owner_user_id} not found")
            
            ownership = CraftingProjectOwnership(project_id=project.project_id, user_id=owner_user_id)
            session.add(ownership)
            
            await session.commit()
            await session.refresh(project)

            # Convert SQLAlchemy object to Pydantic model
            return CraftingProject.model_validate({
                "project_id": project.project_id,
                "public_uuid": project.public_uuid,
                "private_uuid": project.private_uuid,
                "project_name": project.project_name,
                "target_items": [],
                "owners": [
                    CraftingProjectOwner(
                        user_id=owner.id,
                        discord_id=owner.discord_id,
                        username=owner.username,
                        global_name=owner.global_name
                    )
                ],
            })

    @staticmethod
    async def get_project(project_id: int) -> "CraftingProject | None":
        async with SessionLocal() as session:
            project = await session.get(CraftingProjectOrm, project_id)
            if project:
                await session.refresh(project)

                # Get owners through ownership records
                owners_data = [
                    CraftingProjectOwner(
                        user_id=ownership.user.id,
                        discord_id=ownership.user.discord_id,
                        username=ownership.user.username,
                        global_name=ownership.user.global_name
                    ) for ownership in project.ownership_records
                ]

                result = CraftingProject.model_validate({
                    "project_id": project.project_id,
                    "public_uuid": project.public_uuid,
                    "private_uuid": project.private_uuid,
                    "project_name": project.project_name,
                    "target_items": [],
                    "owners": owners_data,
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

                # Get owners through ownership records
                owners_data = [
                    CraftingProjectOwner(
                        user_id=ownership.user.id,
                        discord_id=ownership.user.discord_id,
                        username=ownership.user.username,
                        global_name=ownership.user.global_name
                    ) for ownership in project.ownership_records
                ]

                result: CraftingProjectResponse = CraftingProjectResponse.model_validate({
                    "project_id": project.project_id,
                    "public_uuid": project.public_uuid,
                    "private_uuid": project.private_uuid,
                    "project_name": project.project_name,
                    "target_items": [],
                    "owners": owners_data,
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

    @staticmethod
    async def add_owner_by_discord_id(project_id: int, discord_id: str, requester_user_id: int) -> bool:
        """Add a user as an owner of the project by their Discord ID. Only existing owners can add new owners."""
        async with SessionLocal() as session:
            # Check if requester is an owner of the project
            requester_ownership = await session.execute(
                select(CraftingProjectOwnership).where(
                    CraftingProjectOwnership.project_id == project_id,
                    CraftingProjectOwnership.user_id == requester_user_id
                )
            )
            if not requester_ownership.scalar_one_or_none():
                return False
            
            # Find user by discord_id
            query = await session.execute(select(User).where(User.discord_id == discord_id))
            user_to_add = query.scalar_one_or_none()
            if not user_to_add:
                return False
            
            # Check if user is already an owner
            existing_ownership = await session.execute(
                select(CraftingProjectOwnership).where(
                    CraftingProjectOwnership.project_id == project_id,
                    CraftingProjectOwnership.user_id == user_to_add.id
                )
            )
            if existing_ownership.scalar_one_or_none():
                return True  # Already an owner, consider this success
            
            # Add user as owner
            ownership = CraftingProjectOwnership(project_id=project_id, user_id=user_to_add.id)
            session.add(ownership)
            await session.commit()
            return True

    @staticmethod
    async def remove_owner_by_discord_id(project_id: int, discord_id: str, requester_user_id: int) -> bool:
        """Remove a user as an owner of the project by their Discord ID. Only existing owners can remove owners."""
        async with SessionLocal() as session:
            # Check if requester is an owner of the project
            requester_ownership = await session.execute(
                select(CraftingProjectOwnership).where(
                    CraftingProjectOwnership.project_id == project_id,
                    CraftingProjectOwnership.user_id == requester_user_id
                )
            )
            if not requester_ownership.scalar_one_or_none():
                return False
            
            # Find user by discord_id
            query = await session.execute(select(User).where(User.discord_id == discord_id))
            user_to_remove = query.scalar_one_or_none()
            if not user_to_remove:
                return False
            
            # Check if there would be no owners left
            ownership_count = await session.execute(
                select(CraftingProjectOwnership).where(CraftingProjectOwnership.project_id == project_id)
            )
            if len(list(ownership_count.scalars().all())) <= 1:
                return False  # Cannot remove the last owner
            
            # Remove ownership record
            ownership_to_remove = await session.execute(
                select(CraftingProjectOwnership).where(
                    CraftingProjectOwnership.project_id == project_id,
                    CraftingProjectOwnership.user_id == user_to_remove.id
                )
            )
            ownership = ownership_to_remove.scalar_one_or_none()
            if ownership:
                await session.delete(ownership)
                await session.commit()
            
            return True

    @staticmethod
    async def get_user_projects(user_id: int) -> list["CraftingProject"]:
        """Get all projects owned by a specific user"""
        async with SessionLocal() as session:
            query = await session.execute(
                select(CraftingProjectOrm)
                .join(CraftingProjectOwnership)
                .where(CraftingProjectOwnership.user_id == user_id)
            )
            projects = query.scalars().all()
            
            result = []
            for project in projects:
                await session.refresh(project)
                
                # Get owners through ownership records
                owners_data = [
                    CraftingProjectOwner(
                        user_id=ownership.user.id,
                        discord_id=ownership.user.discord_id,
                        username=ownership.user.username,
                        global_name=ownership.user.global_name
                    ) for ownership in project.ownership_records
                ]
                
                project_data = CraftingProject.model_validate({
                    "project_id": project.project_id,
                    "public_uuid": project.public_uuid,
                    "private_uuid": project.private_uuid,
                    "project_name": project.project_name,
                    "target_items": [],
                    "owners": owners_data,
                })
                
                project_items = await CraftingProjectItemOrm.get_project_items(project.project_id)
                project_data.target_items = [
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
                        ),
                        count=item.count
                    ) for item in project_items
                ]
                
                result.append(project_data)
            
            return result

    @staticmethod
    async def user_is_owner(project_id: int, user_id: int) -> bool:
        """Check if a user is an owner of the project"""
        async with SessionLocal() as session:
            query = await session.execute(
                select(CraftingProjectOwnership)
                .where(
                    CraftingProjectOwnership.project_id == project_id,
                    CraftingProjectOwnership.user_id == user_id
                )
            )
            return query.scalar_one_or_none() is not None


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
    async def add_item_to_project(project_id: int, item_id: int, count: int, user_id: int) -> bool:
        """Add an item to project. Only project owners can add items."""
        # Check if user is an owner of the project
        if not await CraftingProjectOrm.user_is_owner(project_id, user_id):
            return False
            
        async with SessionLocal() as session:
            session.add(CraftingProjectItemOrm(project_id=project_id, item_id=item_id, count=count))
            await session.commit()
            return True

    @staticmethod
    async def remove_item_from_project(project_id: int, item_id: int, user_id: int) -> bool:
        """Remove an item from project. Only project owners can remove items."""
        # Check if user is an owner of the project
        if not await CraftingProjectOrm.user_is_owner(project_id, user_id):
            return False
            
        async with SessionLocal() as session:
            await session.execute(delete(CraftingProjectItemOrm).where(
                CraftingProjectItemOrm.project_id == project_id, 
                CraftingProjectItemOrm.item_id == item_id
            ))
            await session.commit()
            return True

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

    async def update_item_count(self, count: int, user_id: int) -> bool:
        """Update item count. Only project owners can update items."""
        # Check if user is an owner of the project
        if not await CraftingProjectOrm.user_is_owner(self.project_id, user_id):
            return False
            
        async with SessionLocal() as session:
            self.count = count
            session.add(self)
            await session.commit()
            return True
