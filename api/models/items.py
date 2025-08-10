from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ConsumedItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    item_id: int
    amount: int
    recipe_id: int


class ProducedItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    item_id: int
    recipe_id: int
    amount: int


class ToolRequirement(BaseModel):
    """ """

    tool_id: int
    tool_name: str
    tier: int


class BuildingRequirement(BaseModel):
    building_id: int
    building_name: str
    tier: int


class ExperiencePerProgress(BaseModel):
    """ """

    skill_name: str
    experience_per_level: float


class LevelRequirement(BaseModel):
    skill_name: str
    level: int


class BuildingType(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: int = Field(alias="building_id")
    name: str
    category: int


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

    model_config = ConfigDict(from_attributes=True)
    id: int
    actions_required: int
    building_tier_requirement: int
    building_type_requirement: int
    consumed_items: list[ConsumedItem]
    produced_items: list[ProducedItem]
    stamina_requirement: float
    time_requirement: float
    tool_tier_requirement: int | None
    tool_type_requirement: int | None


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

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: int = Field(alias="item_id")
    name: str
    description: str
    volume: int
    durability: int
    icon_asset_name: str
    tier: int
    tag: str
    recipe: ItemRecipe | None = None


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

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: int = Field(alias="cargo_id")
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
