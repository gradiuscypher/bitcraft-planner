from datetime import datetime

from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base, SessionLocal


class Guild(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class UserGuildMembership(Base):
    __tablename__ = "user_guild_memberships"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    guild_id: Mapped[int] = mapped_column(ForeignKey("guilds.id"), primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="guild_memberships")
    guild = relationship("Guild", back_populates="user_memberships")


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

    guild_memberships = relationship("UserGuildMembership", back_populates="user", cascade="all, delete-orphan")

    @property
    def owned_projects(self):
        return [ownership.project for ownership in self.ownership_records]

    @property
    def guilds(self):
        return [membership.guild for membership in self.guild_memberships]


class GuildOrm(Base):
    __tablename__ = "guilds"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    guild_owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    user_memberships = relationship("UserGuildMembership", back_populates="guild", cascade="all, delete-orphan")
    guild_owner = relationship("User", back_populates="owned_guilds")

    @property
    def members(self):
        return [membership.user for membership in self.user_memberships]

    @staticmethod
    async def get_guild(guild_id: int) -> "GuildOrm":
        async with SessionLocal() as session:
            return await session.get(GuildOrm, guild_id)

    @staticmethod
    async def create_guild(name: str) -> "GuildOrm":
        async with SessionLocal() as session:
            session.add(GuildOrm(name=name))
            await session.commit()
            return GuildOrm(id=session.get(GuildOrm, name=name).id, name=name)
