from typing import Any

from pydantic import BaseModel

from helpers import (
    load_building_descriptions,
    load_cargo_descriptions,
    load_item_descriptions,
    load_item_recipes,
    load_skill_descriptions,
    load_tool_descriptions,
)

# Module-level cache for all items
_all_items_cache: dict[int, "Item"] | None = None


class RecipeItem(BaseModel):
    """Lightweight item representation for recipes - just the essential information"""
    id: int
    name: str
    count: int


class ToolRequirement(BaseModel):
    """
    """
    tool_id: int
    tool_name: str
    tier: int

    @staticmethod
    def tool_requirement(tool_id: int, tier: int) -> "ToolRequirement":
        tool_descriptions = load_tool_descriptions()
        tool_requirement_json = tool_descriptions[tool_id]
        return ToolRequirement(
            tool_id=tool_requirement_json["id"],
            tool_name=tool_requirement_json["name"],
            tier=tier,
        )


class BuildingRequirement(BaseModel):
    building_id: int
    building_name: str  # Changed from int to str
    tier: int

    @staticmethod
    def building_requirement(building_id: int, tier: int) -> "BuildingRequirement":
        building_descriptions = load_building_descriptions()
        building_requirement_json = building_descriptions[building_id]
        return BuildingRequirement(
            building_id=building_requirement_json["id"],
            building_name=building_requirement_json["name"],
            tier=tier,
        )


class ExperiencePerProgress(BaseModel):
    """
    """
    skill_name: str
    experience_per_level: float

    @staticmethod
    def experience_per_progress(skill_id: int, experience_per_level: float) -> "ExperiencePerProgress":
        skill_descriptions = load_skill_descriptions()
        skill_requirement_json = skill_descriptions[skill_id]
        return ExperiencePerProgress(
            skill_name=skill_requirement_json["name"],
            experience_per_level=experience_per_level,
        )

class LevelRequirement(BaseModel):
    skill_name: str
    level: int

    @staticmethod
    def level_requirement(skill_id: int, level: int) -> "LevelRequirement":
        skill_descriptions = load_skill_descriptions()
        skill_requirement_json = skill_descriptions[skill_id]
        return LevelRequirement(
            skill_name=skill_requirement_json["name"],
            level=level,
        )


class ItemRecipe(BaseModel):
    """
    Example:
        {'id': 210018,
        'name': 'Husk into {0}',
        'time_requirement': 1.6,
        'stamina_requirement': 0.89,
        'tool_durability_lost': 0,
        'building_requirement': [0, {'building_type': 33, 'tier': 2}],
        'level_requirements': [[11, 20]],
        'tool_requirements': [[9, 2, 1]],
        'consumed_item_stacks': [[2100016, 1, [0, []], 1, 1.0]],
        'discovery_triggers': [],
        'required_claim_tech_id': 0,
        'full_discovery_score': 1,
        'experience_per_progress': [[11, 1.76]],
        'crafted_item_stacks': [[2220023, 1, [0, []], [0, 0]]],
        'actions_required': 130,
        'tool_mesh_index': 1,
        'recipe_performance_id': 617,
        'required_knowledges': [],
        'blocking_knowledges': [],
        'hide_without_required_knowledge': False,
        'hide_with_blocking_knowledges': False,
        'allow_use_hands': False,
        'is_passive': False}
    """
    id: int
    name: str
    time_requirement: float
    stamina_requirement: float
    tool_durability_lost: int
    building_requirement: BuildingRequirement
    level_requirements: list[LevelRequirement]
    tool_requirements: list[ToolRequirement]
    consumed_items: list[RecipeItem]
    experience_per_progress: list[ExperiencePerProgress]
    crafted_items: list[RecipeItem]
    actions_required: int
    tool_mesh_index: int
    is_passive: bool

    @staticmethod
    def item_recipe(item_id: int) -> "ItemRecipe | None":
        item_recipes = load_item_recipes()

        try:
            recipe_json = item_recipes[item_id]
        except KeyError:
            return None

        # Load item descriptions to get item names
        _, item_descriptions = load_item_descriptions()

        tool_requirements = []
        for tool_id, tier, _ in recipe_json["tool_requirements"]:
            tool_requirements.append(ToolRequirement.tool_requirement(tool_id, tier))

        level_requirements = []
        for skill_id, level in recipe_json["level_requirements"]:
            level_requirements.append(LevelRequirement.level_requirement(skill_id, level))

        consumed_items = []
        for item in recipe_json["consumed_item_stacks"]:
            item_id = item[0]
            item_count = item[1]
            # Get item name from descriptions
            item_name = item_descriptions.get(item_id, {}).get("name", f"Unknown Item {item_id}")
            consumed_items.append(RecipeItem(id=item_id, name=item_name, count=item_count))

        crafted_items = []
        for item in recipe_json["crafted_item_stacks"]:
            item_id = item[0]
            item_count = item[1]
            # Get item name from descriptions
            item_name = item_descriptions.get(item_id, {}).get("name", f"Unknown Item {item_id}")
            crafted_items.append(RecipeItem(id=item_id, name=item_name, count=item_count))

        experience_per_progress = []
        for skill_id, experience in recipe_json["experience_per_progress"]:
            experience_per_progress.append(ExperiencePerProgress.experience_per_progress(skill_id, experience))

        # Handle building requirement parsing - it can be different formats
        building_req = recipe_json["building_requirement"]
        if isinstance(building_req, list) and len(building_req) > 1:
            building_info = building_req[1]
            if isinstance(building_info, dict):
                building_requirement = BuildingRequirement.building_requirement(
                    building_info["building_type"],
                    building_info["tier"],
                )
            else:
                # If second element is not a dict, use defaults
                building_requirement = BuildingRequirement.building_requirement(0, 1)
        else:
            # Use defaults for unknown formats
            building_requirement = BuildingRequirement.building_requirement(0, 1)

        return ItemRecipe(
            id=recipe_json["id"],
            name=recipe_json["name"],
            time_requirement=recipe_json["time_requirement"],
            stamina_requirement=recipe_json["stamina_requirement"],
            tool_durability_lost=recipe_json["tool_durability_lost"],
            building_requirement=building_requirement,
            level_requirements=level_requirements,
            tool_requirements=tool_requirements,
            consumed_items=consumed_items,
            experience_per_progress=experience_per_progress,
            crafted_items=crafted_items,
            actions_required=recipe_json["actions_required"],
            tool_mesh_index=recipe_json["tool_mesh_index"],
            is_passive=recipe_json["is_passive"],
        )


class Item(BaseModel):
    """
    Example:
        {'id': 1030002,
        'name': 'Rough Brick',
        'description': 'A crude brick made of dried mud made in a kiln.',
        'volume': 600,
        'durability': 0,
        'convert_to_on_durability_zero': 0,
        'secondary_knowledge_id': 0,
        'model_asset_name': '',
        'icon_asset_name': 'GeneratedIcons/Items/Brick',
        'tier': 1,
        'tag': 'Brick',
        'rarity': [1, {}],
        'compendium_entry': True,
        'item_list_id': 0}
    """
    id: int
    name: str
    description: str
    volume: int
    durability: int
    model_asset_name: str
    icon_asset_name: str
    tier: int
    tag: str
    recipe: ItemRecipe | None = None

    def get_recipe(self) -> ItemRecipe | None:
        """Lazy load the recipe for this item"""
        if self.recipe is None:
            self.recipe = ItemRecipe.item_recipe(self.id)
        return self.recipe

    def get_consumed_items(self) -> list[RecipeItem]:
        """Get the items consumed by this item's recipe"""
        recipe = self.get_recipe()
        if recipe is None:
            return []
        return recipe.consumed_items

    def get_crafted_items(self) -> list[RecipeItem]:
        """Get the items crafted by this item's recipe"""
        recipe = self.get_recipe()
        if recipe is None:
            return []
        return recipe.crafted_items

    @staticmethod
    def all_items() -> dict[int, "Item"]:
        # Use cached result if available
        global _all_items_cache
        if _all_items_cache is not None:
            return _all_items_cache

        items_by_id: dict[int, Item] = {}
        _, item_descriptions = load_item_descriptions()

        for item_id, item_obj in item_descriptions.items():
            # Don't load recipes upfront - they'll be loaded lazily when needed
            new_item = Item(
                id=item_id,
                name=item_obj["name"],
                description=item_obj["description"],
                volume=item_obj["volume"],
                durability=item_obj["durability"],
                model_asset_name=item_obj["model_asset_name"],
                icon_asset_name=item_obj["icon_asset_name"],
                tier=item_obj["tier"],
                tag=item_obj["tag"],
                recipe=None,  # Will be loaded lazily
            )
            items_by_id[item_id] = new_item

        # Cache the result
        _all_items_cache = items_by_id
        return items_by_id

    @staticmethod
    def clear_cache() -> None:
        """Clear the cached items (useful for testing or if data changes)"""
        global _all_items_cache
        _all_items_cache = None


class BuildingRecipe(BaseModel):
    """
    Example:
        {'id': 294207479,
        'name': 'Pristine Fishing Station',
        'time_requirement': 2.0,
        'stamina_requirement': 1.64,
        'consumed_building': 0,
        'required_interior_tier': -1,
        'level_requirements': [[4, 1]],
        'tool_requirements': [[14, 1, 1]],
        'consumed_item_stacks': [[1224328894, 5, [0, []], 1, 1.0],
        [606569406, 1, [0, []], 0, 1.0]],
        'consumed_cargo_stacks': [[1948570022, 4, [1, []], 1, 1.0]],
        'consumed_shards': 0,
        'experience_per_progress': [[15, 1.0]],
        'discovery_triggers': [],
        'required_knowledges': [],
        'required_claim_tech_id': 800,
        'full_discovery_score': 1,
        'tool_mesh_index': 0,
        'building_description_id': 423663333,
        'required_paving_tier': -1,
        'actions_required': 1000,
        'instantly_built': False,
        'recipe_performance_id': 538}
    """
    id: int
    name: str
    time_requirement: float
    stamina_requirement: float
    consumed_building: int
    required_interior_tier: int
    level_requirements: list[list[int]]
    tool_requirements: list[list[int]]
    consumed_item_stacks: list[list[Any]]
    consumed_cargo_stacks: list[list[Any]]
    consumed_shards: int
    experience_per_progress: list[list[Any]]
    discovery_triggers: list
    required_knowledges: list
    required_claim_tech_id: int
    full_discovery_score: int
    tool_mesh_index: int
    building_description_id: int
    required_paving_tier: int
    actions_required: int
    instantly_built: bool
    recipe_performance_id: int


class Building(BaseModel):
    """
        Example:
        {'id': 423663333,
        'functions': [[40, 8, 12, 0, 0, 0, 0, 6000, 6000, 0, [], [], 1, False, 0, 0]],
        'name': 'Pristine Fishing Station',
        'description': 'A table for a fisher to prepare fishing rods and fish at',
        'rested_buff_duration': 0,
        'light_radius': 0,
        'model_asset_name': 'Buildings/AncientFishingStation',
        'icon_asset_name': 'GeneratedIcons/Other/GeneratedIcons/Other/Buildings/Crafting/AncientFishingWorkstation',
        'unenterable': True,
        'wilderness': True,
        'footprint': [[0, 0, [0, []]],
        [-1, 0, [0, []]],
        [1, 0, [0, []]],
        [-1, -1, [0, []]],
        [-2, -1, [0, []]],
        [-1, -2, [0, []]],
        [0, -3, [0, []]],
        [1, -3, [0, []]]],
        'max_health': 120,
        'ignore_damage': False,
        'defense_level': 10000,
        'decay': 1.0,
        'maintenance': 0.0,
        'build_permission': [1, {}],
        'interact_permission': [3, {}],
        'has_action': True,
        'show_in_compendium': True,
        'is_ruins': False,
        'not_deconstructible': False}
    """
    id: int
    functions: list[list]
    name: str
    description: str
    rested_buff_duration: int
    light_radius: int
    model_asset_name: str
    icon_asset_name: str
    unenterable: bool
    wilderness: bool
    max_health: int
    ignore_damage: bool
    defense_level: int
    decay: float
    has_action: bool
    show_in_compendium: bool
    is_ruins: bool
    not_deconstructible: bool
    recipe: BuildingRecipe

    @classmethod
    def building_lookup(cls) -> dict[int, "Building"]:
        return {}


class Cargo(BaseModel):
    """
    Example:
        {'id': 1948570022,
        'name': 'Pristine Timber',
        'description': 'Can be sawed into boards or used in construction.',
        'volume': 6000,
        'secondary_knowledge_id': 0,
        'model_asset_name': 'Cargo/RoughTimber',
        'icon_asset_name': 'GeneratedIcons/Cargo/Timber',
        'carried_model_asset_name': 'Cargo/Carried/CargoPackTimber',
        'pick_up_animation_start': 'Gather-Start',
        'pick_up_animation_end': 'Gather-Finish',
        'drop_animation_start': 'Gather-Start',
        'drop_animation_end': 'Gather-Finish',
        'pick_up_time': 0.5,
        'place_time': 0.3,
        'animator_state': '',
        'movement_modifier': -0.25,
        'blocks_path': False,
        'on_destroy_yield_cargos': [],
        'despawn_time': 86400.0,
        'tier': 8,
        'tag': 'Timber',
        'rarity': [1, {}],
        'not_pickupable': False}
    """
    id: int
    name: str
    description: str
    volume: int
    secondary_knowledge_id: int
    model_asset_name: str
    icon_asset_name: str
    carried_model_asset_name: str
    pick_up_animation_start: str
    pick_up_animation_end: str
    drop_animation_start: str
    drop_animation_end: str
    pick_up_time: float
    place_time: float
    animator_state: str
    movement_modifier: float
    blocks_path: bool
    on_destroy_yield_cargos: list
    despawn_time: float
    tier: int
    tag: str
    rarity: list[Any]
    not_pickupable: bool
    recipe: ItemRecipe | None = None

    @staticmethod
    def all_cargo() -> dict[int, "Cargo"]:
        cargo_results = {}
        cargo_by_name, cargo_by_id = load_cargo_descriptions()
        for cargo_id, cargo in cargo_by_id.items():
            cargo_results[cargo_id] = Cargo(
                id=cargo["id"],
                name=cargo["name"],
                description=cargo["description"],
                volume=cargo["volume"],
                secondary_knowledge_id=cargo["secondary_knowledge_id"],
                model_asset_name=cargo["model_asset_name"],
                icon_asset_name=cargo["icon_asset_name"],
                carried_model_asset_name=cargo["carried_model_asset_name"],
                pick_up_animation_start=cargo["pick_up_animation_start"],
                pick_up_animation_end=cargo["pick_up_animation_end"],
                drop_animation_start=cargo["drop_animation_start"],
                drop_animation_end=cargo["drop_animation_end"],
                pick_up_time=cargo["pick_up_time"],
                place_time=cargo["place_time"],
                animator_state=cargo["animator_state"],
                movement_modifier=cargo["movement_modifier"],
                blocks_path=cargo["blocks_path"],
                on_destroy_yield_cargos=cargo["on_destroy_yield_cargos"],
                despawn_time=cargo["despawn_time"],
                tier=cargo["tier"],
                tag=cargo["tag"],
                rarity=cargo["rarity"],
                not_pickupable=cargo["not_pickupable"],
                recipe=ItemRecipe.item_recipe(cargo["id"]),
            )
        return cargo_results
