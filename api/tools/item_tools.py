from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class GameItemOrm(Base):
    __tablename__ = "game_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tier: Mapped[int] = mapped_column(Integer, nullable=False)
    rarity: Mapped[int] = mapped_column(Integer, nullable=False)
    tag: Mapped[str] = mapped_column(String(255), nullable=False)
    volume: Mapped[int] = mapped_column(Integer)
    durability: Mapped[int] = mapped_column(Integer)
    icon_asset_name: Mapped[str] = mapped_column(String(255))


class GameItemRecipeOrm(Base):
    __tablename__ = "game_item_recipes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)


class GameCargoOrm(Base):
    __tablename__ = "game_cargos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cargo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tier: Mapped[int] = mapped_column(Integer, nullable=False)
    rarity: Mapped[int] = mapped_column(Integer, nullable=False)
    tag: Mapped[str] = mapped_column(String(255), nullable=False)
    volume: Mapped[int] = mapped_column(Integer)


class GameCargoRecipeOrm(Base):
    __tablename__ = "game_cargo_recipes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)


class GameBuildingOrm(Base):
    __tablename__ = "game_buildings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    building_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class GameBuildingRecipeOrm(Base):
    __tablename__ = "game_building_recipes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
