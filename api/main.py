import json
from sys import argv
from typing import Any

BITCRAFT_GAMEDATA_DIR = "/Users/gradius/git/BitCraft_GameData/server/region"


def load_building_recipes() -> list:
    BUILDING_RECIPES_FILE = f"{BITCRAFT_GAMEDATA_DIR}/construction_recipe_desc.json"
    with open(BUILDING_RECIPES_FILE, "r") as f:
        return json.load(f)


def load_cargo_descriptions() -> dict[str, Any]:
    CARGO_DESCRIPTIONS_FILE = f"{BITCRAFT_GAMEDATA_DIR}/cargo_desc.json"
    cargo_descriptions = {}
    with open(CARGO_DESCRIPTIONS_FILE, "r") as f:
        cargo_json = json.load(f)
        for cargo_obj in cargo_json:
            cargo_descriptions[cargo_obj["id"]] = cargo_obj
    return cargo_descriptions

def load_item_descriptions() -> dict[str, Any]:
    ITEM_DESCRIPTIONS_FILE = f"{BITCRAFT_GAMEDATA_DIR}/item_desc.json"
    item_descriptions = {}
    with open(ITEM_DESCRIPTIONS_FILE, "r") as f:
        item_json = json.load(f)
        for item_obj in item_json:
            item_descriptions[item_obj["id"]] = item_obj
    return item_descriptions


def calculate_building_needs(building_name: str):
    building_recipes = load_building_recipes()
    cargo_descriptions = load_cargo_descriptions()
    item_descriptions = load_item_descriptions()

    for b in building_recipes:
        if b["name"] == building_name:
            item_stacks = b["consumed_item_stacks"]
            cargo_stacks = b["consumed_cargo_stacks"]

    for item_stack in item_stacks:
        stack_id = item_stack[0]
        stack_count = item_stack[1]
        stack_name = item_descriptions[stack_id]["name"]
        print(f"{stack_name}: {stack_count}")

    print(f"Cargo needs for {building_name}:")
    for cargo_stack in cargo_stacks:
        stack_id = cargo_stack[0]
        stack_count = cargo_stack[1]
        stack_name = cargo_descriptions[stack_id]["name"]
        print(f"{stack_name}: {stack_count}")




if __name__ == "__main__":
    calculate_building_needs(argv[1])