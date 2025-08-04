# bitcraft-planner
Crafting planner for Bitcraft Online

# Working on
- Page for offering upgrade services, allowing both an individual and a group to cover those upgrade services
- Some way of tracking a user's skills so that others can know what services they could offer
- Alerting system for completed crafting stations, character not crafting, etc
- Clean up TODO
- Don't enable logger in dev
- Start over with groups / projects models and endpoints, something's defintely gotten too complex
- Create group UI
- Test project item endpoints
- Group crafting planner, allow there to be an owner link and viewer links
- Need to make building models like the cargo and items
- Change wording on the main page to remove filler information
- Have a "Used In" functionality to show what an item is used in
- Get the skill names from JSON as well so that we can present them in the recipes
- SQLA implementation, example alembic setup - basic models for recipe sharing
- Add item icons
- Items (eg: pickaxe) don't have their use details (eg: power)
- Change site title

# Backlog Sorted
- Split files for API endpoints
- crafting queues: let people register for specific classes that they can craft, and have a LFW / can work queue
- can people create their own groups that individuals can be invited to for LFW queues

# Backlog Unsorted
- Speed up API startup
- Review possible overuse of @staticmethod
- Metadata for unfurler
- Explorer for other JSON data in the game files?
- Some sort of game TODO list - eg "reach 20 in this skill". Can resolve dependencies, so if you need to have a level in something before crafting an item, it can put both on the list
- LLM recommendations for what to do next? (lol idk sometimes i dont know what to do, it could be fun?)

# Notes
- construction_recipe_desc.json for building construction
