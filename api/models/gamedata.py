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
    consumed_in_recipes: Mapped[list["GameItemRecipeConsumedOrm"]] = relationship("GameItemRecipeConsumedOrm", back_populates="consumed_item", cascade="all, delete-orphan")
    produced_in_recipes: Mapped[list["GameItemRecipeProducedOrm"]] = relationship("GameItemRecipeProducedOrm", back_populates="produced_item", cascade="all, delete-orphan")

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
    consumed_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("game_items.id"), nullable=False)
    recipe_id: Mapped[int] = mapped_column(Integer, ForeignKey("game_item_recipes.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    consumed_item: Mapped["GameItemOrm"] = relationship("GameItemOrm", back_populates="consumed_in_recipes")
    recipe: Mapped["GameItemRecipeOrm"] = relationship("GameItemRecipeOrm", back_populates="consumed_items")


class GameItemRecipeProducedOrm(Base):
    __tablename__ = "game_item_recipe_produced"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    produced_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("game_items.id"), nullable=False)
    recipe_id: Mapped[int] = mapped_column(Integer, ForeignKey("game_item_recipes.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    produced_item: Mapped["GameItemOrm"] = relationship("GameItemOrm", back_populates="produced_in_recipes")
    recipe: Mapped["GameItemRecipeOrm"] = relationship("GameItemRecipeOrm", back_populates="produced_items")


class GameItemRecipeOrm(Base):
    __tablename__ = "game_item_recipes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    time_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    stamina_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    building_tier_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    building_type_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    tool_tier_requirement: Mapped[int | None] = mapped_column(Integer)
    tool_type_requirement: Mapped[int | None] = mapped_column(Integer)
    consumed_items: Mapped[list[GameItemRecipeConsumedOrm]] = relationship("GameItemRecipeConsumedOrm", back_populates="recipe", cascade="all, delete-orphan")
    produced_items: Mapped[list[GameItemRecipeProducedOrm]] = relationship("GameItemRecipeProducedOrm", back_populates="recipe", cascade="all, delete-orphan")


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

        async with SessionLocal() as db:
            db.add(item_orm)
            await db.commit()  # Commit item first to get the ID
            await db.refresh(item_orm)  # Refresh to get the assigned ID

            # add the GameItemRecipeOrm to the GameItemOrm after
            if not skip_recipe:
                for recipe in item_recipes_for_item:
                    time_requirement = recipe["time_requirement"]
                    stamina_requirement = recipe["stamina_requirement"]
                    building_tier_requirement = recipe["building_requirement"][1]["tier"]
                    building_type_requirement = recipe["building_requirement"][1]["building_type"]

                    tool_requirement = recipe.get("tool_requirement", [])
                    tool_tier_requirement = tool_requirement[1] if tool_requirement else None
                    tool_type_requirement = tool_requirement[0] if tool_requirement else None

                    recipe_orm = GameItemRecipeOrm(
                        time_requirement=time_requirement,
                        stamina_requirement=stamina_requirement,
                        building_tier_requirement=building_tier_requirement,
                        building_type_requirement=building_type_requirement,
                        tool_tier_requirement=tool_tier_requirement,
                        tool_type_requirement=tool_type_requirement,
                    )

                    db.add(recipe_orm)
                    await db.commit()  # Commit recipe to get the ID
                    await db.refresh(recipe_orm)

                    recipe_consumed_items = recipe.get("consumed_item_stacks", [])
                    recipe_produced_items = recipe.get("crafted_item_stacks", [])

                    for c_item in recipe_consumed_items:
                        consumed_item_id = c_item[0]
                        consumed_item_amount = c_item[1]
                        consumed_item = await GameItemOrm.get_by_id(consumed_item_id)

                        if consumed_item:
                            consumed_orm = GameItemRecipeConsumedOrm(
                                consumed_item_id=consumed_item.id,
                                recipe_id=recipe_orm.id,
                                amount=consumed_item_amount,
                            )
                            db.add(consumed_orm)

                    for p_item in recipe_produced_items:
                        produced_item_id = p_item[0]
                        produced_item_amount = p_item[1]
                        produced_item = await GameItemOrm.get_by_id(produced_item_id)

                        if produced_item:
                            produced_orm = GameItemRecipeProducedOrm(
                                produced_item_id=produced_item.id,
                                recipe_id=recipe_orm.id,
                                amount=produced_item_amount,
                            )
                            db.add(produced_orm)

                    await db.commit()

    # fill out the cargo data

    # fill out the building data
