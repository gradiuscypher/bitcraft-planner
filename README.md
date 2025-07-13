# bitcraft-planner
Crafting planner for Bitcraft Online

# Working on
- Build the model methods that create our lookup dictionaies and then refactor API to return those objects
- Create proper Pydantic API response objects
- Get the skill names from JSON as well so that we can present them in the recipes
- SQLA implementation, example alembic setup - basic models for recipe sharing
- Group crafting planner, allow there to be an owner link and viewer links
- Add item icons
- Items (eg: pickaxe) don't have their use details (eg: power)

# Backlog Sorted
- Split files for API endpoints

# Backlog Unsorted
- Explorer for other JSON data in the game files?
- Some sort of game TODO list - eg "reach 20 in this skill". Can resolve dependencies, so if you need to have a level in something before crafting an item, it can put both on the list
- LLM recommendations for what to do next? (lol idk sometimes i dont know what to do, it could be fun?)

# Notes
- construction_recipe_desc.json for building construction