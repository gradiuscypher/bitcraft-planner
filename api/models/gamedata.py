from sqlalchemy import ForeignKey, Integer, String, Text, select
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base, SessionLocal


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

    @classmethod
    async def get_by_id(cls, item_id: int) -> "GameItemOrm":
        async with SessionLocal() as session:
            result = await session.execute(
                select(cls).filter(cls.item_id == item_id),
            )
            return result.scalar_one_or_none()


class GameItemRecipeConsumedOrm(Base):
    __tablename__ = "game_item_recipe_consumed"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(Integer, nullable=False)
    recipe_id: Mapped[int] = mapped_column(Integer, ForeignKey("game_item_recipes.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)


class GameItemRecipeProducedOrm(Base):
    __tablename__ = "game_item_recipe_produced"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(Integer, nullable=False)
    recipe_id: Mapped[int] = mapped_column(Integer, ForeignKey("game_item_recipes.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)


class GameItemRecipeOrm(Base):
    __tablename__ = "game_item_recipes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    time_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    stamina_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    building_tier_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    building_type_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    tool_tier_requirement: Mapped[int | None] = mapped_column(Integer)
    tool_type_requirement: Mapped[int | None] = mapped_column(Integer)
    consumed_items: Mapped[list["GameItemRecipeConsumedOrm"]] = relationship("GameItemRecipeConsumedOrm", cascade="all, delete-orphan")
    produced_items: Mapped[list["GameItemRecipeProducedOrm"]] = relationship("GameItemRecipeProducedOrm", cascade="all, delete-orphan")


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


class GameBuildingOrm(Base):
    __tablename__ = "game_buildings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    building_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class GameBuildingRecipeOrm(Base):
    __tablename__ = "game_building_recipes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)


async def init_game_data() -> None:
    from database import SessionLocal  # noqa: PLC0415
    from helpers import (  # noqa: F401, PLC0415
        load_building_recipes,
        load_item_descriptions,
        load_item_recipes,
    )

    item_recipes = load_item_recipes()
    _, item_by_id = load_item_descriptions()

    # fill out the item data
    async with SessionLocal() as db:
        for item_id, item_obj in item_by_id.items():
            skip_recipe = False
            try:
                item_recipes_for_item = item_recipes[item_id]
            except KeyError:
                skip_recipe = True

            # create the GameItemOrm first
            item_orm = GameItemOrm(
                item_id=item_id,
                name=item_obj["name"],
                description=item_obj["description"],
                tier=item_obj["tier"],
                rarity=item_obj["rarity"][0],
                tag=item_obj["tag"],
                volume=item_obj["volume"],
                durability=item_obj["durability"],
                icon_asset_name=item_obj["icon_asset_name"],
            )

            if not skip_recipe:
                for recipe in item_recipes_for_item:
                    building_requirement = recipe.get("building_requirement", None)
                    tool_requirement = recipe.get("tool_requirement", None)
                    if building_requirement:
                        building_tier_requirement = building_requirement[1]["tier"]
                        building_type_requirement = building_requirement[1]["building_type"]
                    else:
                        building_tier_requirement = None
                        building_type_requirement = None
                    if tool_requirement:
                        tool_type_requirement = tool_requirement[0][0]
                        tool_tier_requirement = tool_requirement[0][1]
                    else:
                        tool_type_requirement = None
                        tool_tier_requirement = None

                    recipe_orm = GameItemRecipeOrm(
                        time_requirement=recipe["time_requirement"],
                        stamina_requirement=recipe["stamina_requirement"],
                        building_tier_requirement=building_tier_requirement,
                        building_type_requirement=building_type_requirement,
                        tool_tier_requirement=tool_tier_requirement,
                        tool_type_requirement=tool_type_requirement,
                    )

                    consumed_items = recipe.get("consumed_item_stacks", [])
                    for consumed_item in consumed_items:
                        consumed_item_orm = GameItemRecipeConsumedOrm(
                            item_id=consumed_item[0],
                            amount=consumed_item[1],
                        )
                        recipe_orm.consumed_items.append(consumed_item_orm)
                    produced_items = recipe.get("crafted_item_stacks", [])
                    for produced_item in produced_items:
                        produced_item_orm = GameItemRecipeProducedOrm(
                            item_id=produced_item[0],
                            amount=produced_item[1],
                        )
                        recipe_orm.produced_items.append(produced_item_orm)

                    db.add(recipe_orm)
            db.add(item_orm)
        await db.commit()
