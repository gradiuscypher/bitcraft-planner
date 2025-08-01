from rapidfuzz import fuzz, process
from sqlalchemy import Float, ForeignKey, Integer, String, Text, select, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Mapped, mapped_column, relationship, selectinload

from database import AsyncSession, Base, SessionLocal


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

    @classmethod
    async def get_by_item_id(cls, item_id: int) -> list["GameItemRecipeProducedOrm"]:
        async with SessionLocal() as session:
            result = await session.execute(
                select(cls).filter(cls.item_id == item_id),
            )
            return result.scalars().all()


class GameItemRecipeOrm(Base):
    __tablename__ = "game_item_recipes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actions_required: Mapped[int] = mapped_column(Integer, nullable=False)
    building_tier_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    building_type_requirement: Mapped[int] = mapped_column(Integer, nullable=False)
    consumed_items: Mapped[list["GameItemRecipeConsumedOrm"]] = relationship("GameItemRecipeConsumedOrm", cascade="all, delete-orphan")
    produced_items: Mapped[list["GameItemRecipeProducedOrm"]] = relationship("GameItemRecipeProducedOrm", cascade="all, delete-orphan")
    stamina_requirement: Mapped[float] = mapped_column(Float, nullable=False)
    time_requirement: Mapped[float] = mapped_column(Float, nullable=False)
    tool_tier_requirement: Mapped[int | None] = mapped_column(Integer)
    tool_type_requirement: Mapped[int | None] = mapped_column(Integer)

    @classmethod
    async def get_by_id(cls, recipe_id: int) -> "GameItemRecipeOrm":
        async with SessionLocal() as session:
            result = await session.execute(
                select(cls)
                .options(
                    selectinload(cls.consumed_items),
                    selectinload(cls.produced_items),
                )
                .filter(cls.id == recipe_id),
            )
            return result.scalar_one_or_none()


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


class SearchResult:
    def __init__(self, name: str, score: float, id: int, type: str) -> None:
        self.name = name
        self.score = score
        self.id = id
        self.type = type


class SearchService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def search_items(self, query: str, limit: int = 5, score_cutoff: float = 60.0) -> list[SearchResult]:
        """Search items using SQLite FTS5 + fuzzy matching"""

        fts_results = []

        # Try FTS search first, but handle gracefully if FTS table doesn't exist
        try:
            # First, try exact/prefix matches using SQLite FTS5
            fts_query = """
            SELECT game_items.id, game_items.name, game_items.item_id,
                   bm25(items_fts) as rank_score
            FROM game_items
            LEFT JOIN items_fts ON game_items.id = items_fts.rowid
            WHERE items_fts MATCH :query OR game_items.name LIKE :like_query
            ORDER BY rank_score ASC, game_items.name
            LIMIT :limit
            """

            # Execute FTS search
            result = await self.db.execute(
                text(fts_query),
                {"query": query, "like_query": f"%{query}%", "limit": limit * 2},
            )
            fts_results = result.fetchall()
        except (OperationalError, ProgrammingError):
            # FTS table doesn't exist or there's an issue, fall back to regular search
            simple_query = """
            SELECT id, name, item_id, 100.0 as rank_score
            FROM game_items
            WHERE name LIKE :like_query
            ORDER BY name
            LIMIT :limit
            """
            result = await self.db.execute(
                text(simple_query),
                {"like_query": f"%{query}%", "limit": limit * 2},
            )
            fts_results = result.fetchall()

        # If FTS doesn't return enough results, fall back to fuzzy search
        if len(fts_results) < limit:
            # Get all items for fuzzy matching
            all_items_result = await self.db.execute(
                text("SELECT id, name, item_id FROM game_items"),
            )
            all_items = all_items_result.fetchall()

            item_names = {item.name: (item.id, item.item_id) for item in all_items}
            fuzzy_results = process.extract(
                query,
                item_names.keys(),
                scorer=fuzz.WRatio,
                limit=limit,
                score_cutoff=score_cutoff,
            )

            # Combine and deduplicate results
            combined_results = []
            seen_ids = set()

            # Add FTS results first
            for row in fts_results:
                if row.id not in seen_ids:
                    # Convert bm25 score (negative, lower is better) to positive score (higher is better)
                    # bm25 scores are typically between -10 and 0, so we transform them to 0-100 range
                    normalized_score = max(0, 100 + (row.rank_score or -10))
                    combined_results.append(SearchResult(
                        name=row.name,
                        score=normalized_score,
                        id=row.item_id,
                        type="item",
                    ))
                    seen_ids.add(row.id)

            # Add fuzzy results
            for name, score, _ in fuzzy_results:
                item_id, db_item_id = item_names[name]
                if item_id not in seen_ids:
                    combined_results.append(SearchResult(
                        name=name,
                        score=score,
                        id=db_item_id,
                        type="item",
                    ))
                    seen_ids.add(item_id)

            return combined_results[:limit]

        # Return FTS results
        return [
            SearchResult(
                name=row.name,
                score=row.rank_score or 100.0,
                id=row.item_id,
                type="item",
            )
            for row in fts_results[:limit]
        ]

    async def search_buildings(self, query: str, limit: int = 5, score_cutoff: float = 60.0) -> list[SearchResult]:
        """Search for buildings using hybrid FTS + fuzzy matching"""

    async def search_cargo(self, query: str, limit: int = 5, score_cutoff: float = 60.0) -> list[SearchResult]:
        """Search for cargo using hybrid FTS + fuzzy matching"""


async def init_game_data() -> None:
    from database import SessionLocal  # noqa: PLC0415
    from helpers import (  # noqa: F401, PLC0415
        load_building_recipes,
        load_item_descriptions,
        load_item_recipes,
    )

    item_recipes = load_item_recipes()
    _, item_by_id = load_item_descriptions()
    await create_fts_tables()

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
                    actions_required = recipe.get("actions_required", None)
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
                        actions_required=actions_required,
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


async def create_fts_tables() -> None:
    """Create FTS5 virtual tables for search"""
    async with SessionLocal() as conn:
        # Create FTS table for items
        await conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
                name, description, tag,
                content='game_items',
                content_rowid='id'
            )
        """))

        # Create FTS table for buildings
        await conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS buildings_fts USING fts5(
                name,
                content='game_buildings',
                content_rowid='id'
            )
        """))

        # Create FTS table for cargo
        await conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS cargo_fts USING fts5(
                name, description, tag,
                content='game_cargos',
                content_rowid='id'
            )
        """))

        # Clear existing FTS data and repopulate
        await conn.execute(text("DELETE FROM items_fts"))
        await conn.execute(text("DELETE FROM buildings_fts"))
        await conn.execute(text("DELETE FROM cargo_fts"))

        # Populate FTS tables
        await conn.execute(text("""
            INSERT INTO items_fts(rowid, name, description, tag)
            SELECT id, name, description, tag FROM game_items
        """))

        await conn.execute(text("""
            INSERT INTO buildings_fts(rowid, name)
            SELECT id, name FROM game_buildings
        """))

        await conn.execute(text("""
            INSERT INTO cargo_fts(rowid, name, description, tag)
            SELECT id, name, description, tag FROM game_cargos
        """))

        # Commit the changes
        await conn.commit()
