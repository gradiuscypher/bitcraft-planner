import json
import os
from typing import Any

from dotenv import load_dotenv
from rapidfuzz import fuzz, process

load_dotenv()

BITCRAFT_GAMEDATA_DIR = os.getenv("BITCRAFT_GAMEDATA_DIR")
BUILDING_RECIPES_FILE = f"{BITCRAFT_GAMEDATA_DIR}/construction_recipe_desc.json"
BUILDING_DESCRIPTIONS_FILE = f"{BITCRAFT_GAMEDATA_DIR}/building_desc.json"
BUILDING_TYPES_FILE = f"{BITCRAFT_GAMEDATA_DIR}/building_type_desc.json"
CRAFTING_RECIPES_FILE = f"{BITCRAFT_GAMEDATA_DIR}/crafting_recipe_desc.json"
CARGO_DESCRIPTIONS_FILE = f"{BITCRAFT_GAMEDATA_DIR}/cargo_desc.json"
ITEM_DESCRIPTIONS_FILE = f"{BITCRAFT_GAMEDATA_DIR}/item_desc.json"
TOOL_DESCRIPTIONS_FILE = f"{BITCRAFT_GAMEDATA_DIR}/tool_type_desc.json"
SKILL_DESCRIPTIONS_FILE = f"{BITCRAFT_GAMEDATA_DIR}/skill_desc.json"


def load_building_recipes() -> tuple[dict[str, Any], dict[int, Any]]:
    buildings_by_name: dict[str, Any] = {}
    buildings_by_id: dict[int, Any] = {}

    with open(BUILDING_RECIPES_FILE) as f:
        building_recipes = json.load(f)
        for b in building_recipes:
            buildings_by_name[b["name"]] = b
            buildings_by_id[b["id"]] = b
        return buildings_by_name, buildings_by_id


def load_building_descriptions() -> dict[int, Any]:
    building_by_id: dict[int, Any] = {}
    with open(BUILDING_DESCRIPTIONS_FILE) as f:
        building_descriptions = json.load(f)
        for b in building_descriptions:
            building_by_id[b["id"]] = b
        return building_by_id

def load_building_types() -> dict[int, Any]:

    with open(BUILDING_TYPES_FILE) as f:
        building_types = json.load(f)
        building_types_by_id: dict[str, Any] = {}
        for b in building_types:
            building_types_by_id[b["id"]] = b
        return building_types_by_id


def load_cargo_descriptions() -> tuple[dict[str, Any], dict[int, Any]]:
    cargo_by_name: dict[str, Any] = {}
    cargo_by_id: dict[int, Any] = {}

    with open(CARGO_DESCRIPTIONS_FILE) as f:
        cargo_json = json.load(f)
        for cargo_obj in cargo_json:
            cargo_by_name[cargo_obj["name"]] = cargo_obj
            cargo_by_id[cargo_obj["id"]] = cargo_obj
    return cargo_by_name, cargo_by_id


def load_item_recipes() -> dict[int, Any]:
    """
    Note: these are also valid for cargo recipes.
    """
    item_recipes: dict[int, Any] = {}
    with open(CRAFTING_RECIPES_FILE) as f:
        crafting_recipes = json.load(f)
        for recipe in crafting_recipes:
            crafted_item_stacks = recipe["crafted_item_stacks"]
            if crafted_item_stacks:
                for crafted_item in crafted_item_stacks:
                    crafted_id = crafted_item[0]
                    if crafted_id not in item_recipes:
                        item_recipes[crafted_id] = [recipe]
                    else:
                        item_recipes[crafted_id].append(recipe)
    return item_recipes


def load_item_descriptions() -> tuple[dict[str, Any], dict[int, Any]]:
    item_by_name: dict[str, Any] = {}
    item_by_id: dict[int, Any] = {}
    with open(ITEM_DESCRIPTIONS_FILE) as f:
        item_json = json.load(f)
        for item_obj in item_json:
            item_by_name[item_obj["name"]] = item_obj
            item_by_id[item_obj["id"]] = item_obj

    return item_by_name, item_by_id


def load_skill_descriptions() -> dict[int, Any]:
    skill_by_id: dict[int, Any] = {}
    with open(SKILL_DESCRIPTIONS_FILE) as f:
        skill_json = json.load(f)
        for skill_obj in skill_json:
            skill_by_id[skill_obj["id"]] = skill_obj
    return skill_by_id

def load_tool_descriptions() -> dict[int, Any]:
    tool_by_id: dict[int, Any] = {}
    with open(TOOL_DESCRIPTIONS_FILE) as f:
        tool_json = json.load(f)
        for tool_obj in tool_json:
            tool_by_id[tool_obj["id"]] = tool_obj
    return tool_by_id


def calculate_building_needs(building_name: str) -> None:
    building_recipes, _ = load_building_recipes()
    cargo_by_name, _ = load_cargo_descriptions()
    item_by_name, _ = load_item_descriptions()

    building_recipes = building_recipes[building_name]
    item_stacks = building_recipes["consumed_item_stacks"]
    cargo_stacks = building_recipes["consumed_cargo_stacks"]

    for item_stack in item_stacks:
        stack_id = item_stack[0]
        stack_count = item_stack[1]
        stack_name = item_by_name[stack_id]["name"]
        print(f"{stack_name}: {stack_count}")

    print(f"Cargo needs for {building_name}:")
    for cargo_stack in cargo_stacks:
        stack_id = cargo_stack[0]
        stack_count = cargo_stack[1]
        stack_name = cargo_by_name[stack_id]["name"]
        print(f"{stack_name}: {stack_count}")


def fuzzy_search_items(query: str, limit: int = 5, score_cutoff: float = 60.0) -> list[tuple[str, float, int]]:
    """
    Perform fuzzy search on item names.
    Args:
        query: Search query string
        limit: Maximum number of results to return
        score_cutoff: Minimum similarity score (0-100)
    Returns:
        List of tuples: (item_name, similarity_score, item_id)
    """
    item_by_name, item_by_id = load_item_descriptions()

    # Create a mapping of item names to their IDs
    item_names = {item_data["name"]: item_id for item_id, item_data in item_by_id.items()}

    # Perform fuzzy matching
    results = process.extract(
        query,
        item_names.keys(),
        scorer=fuzz.WRatio,  # Weighted ratio for better matching
        limit=limit,
        score_cutoff=score_cutoff,
    )

    # Return results with item IDs
    return [(name, score, item_names[name]) for name, score, _ in results]


def fuzzy_search_buildings(query: str, limit: int = 5, score_cutoff: float = 60.0) -> list[tuple[str, float, int]]:
    """
    Perform fuzzy search on building names.
    Args_:
        query: Search query string
        limit: Maximum number of results to return
        score_cutoff: Minimum similarity score (0-100)
    Returns:
        List of tuples: (building_name, similarity_score, building_id)
    """
    buildings_by_name, _ = load_building_recipes()

    # Create a mapping of building names to their IDs
    building_names = {building_data["name"]: building_data["id"] for building_data in buildings_by_name.values()}

    # Perform fuzzy matching
    results = process.extract(
        query,
        building_names.keys(),
        scorer=fuzz.WRatio,
        limit=limit,
        score_cutoff=score_cutoff,
    )

    # Return results with building IDs
    return [(name, score, building_names[name]) for name, score, _ in results]


def fuzzy_search_cargo(query: str, limit: int = 5, score_cutoff: float = 60.0) -> list[tuple[str, float, int]]:
    """
    Perform fuzzy search on cargo names.
    Args:
        query: Search query string
        limit: Maximum number of results to return
        score_cutoff: Minimum similarity score (0-100)
    Returns:
        List of tuples: (cargo_name, similarity_score, cargo_id)
    """
    cargo_by_name, cargo_by_id = load_cargo_descriptions()

    # Create a mapping of cargo names to their IDs
    cargo_names = {cargo_data["name"]: cargo_id for cargo_id, cargo_data in cargo_by_id.items()}

    # Perform fuzzy matching
    results = process.extract(
        query,
        cargo_names.keys(),
        scorer=fuzz.WRatio,
        limit=limit,
        score_cutoff=score_cutoff,
    )

    # Return results with cargo IDs
    return [(name, score, cargo_names[name]) for name, score, _ in results]


def fuzzy_search_all(query: str, limit: int = 5, score_cutoff: float = 60.0) -> dict[str, list[tuple[str, float, int]]]:
    """
    Perform fuzzy search across all categories (items, buildings, cargo).
    Args:
        query: Search query string
        limit: Maximum number of results per category
        score_cutoff: Minimum similarity score (0-100)
    Returns:
        Dictionary with keys 'items', 'buildings', 'cargo' and their respective results
    """
    return {
        "items": fuzzy_search_items(query, limit, score_cutoff),
        "buildings": fuzzy_search_buildings(query, limit, score_cutoff),
        "cargo": fuzzy_search_cargo(query, limit, score_cutoff),
    }


def get_best_match(query: str, search_type: str = "all") -> tuple[str, float, int, str] | None:
    """
    Get the single best match across specified search type.
    Args:
        query: Search query string
        search_type: 'items', 'buildings', 'cargo', or 'all'
    Returns:
        Tuple of (name, score, id, type) or None if no match found
    """
    best_match = None
    best_score = 0.0

    if search_type in ["items", "all"]:
        item_results = fuzzy_search_items(query, limit=1, score_cutoff=0)
        if item_results and item_results[0][1] > best_score:
            best_match = (*item_results[0], "item")
            best_score = item_results[0][1]

    if search_type in ["buildings", "all"]:
        building_results = fuzzy_search_buildings(query, limit=1, score_cutoff=0)
        if building_results and building_results[0][1] > best_score:
            best_match = (*building_results[0], "building")
            best_score = building_results[0][1]

    if search_type in ["cargo", "all"]:
        cargo_results = fuzzy_search_cargo(query, limit=1, score_cutoff=0)
        if cargo_results and cargo_results[0][1] > best_score:
            best_match = (*cargo_results[0], "cargo")
            best_score = cargo_results[0][1]

    return best_match
