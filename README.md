# bitcraft-planner
Crafting planner for Bitcraft Online

# Feedback/Feature Request
- Sub-projects: so that it's easier to organize big projects into smaller projects, but the progress feeds into the overall project as well

# Working on
- User syncing code in the user.py route
- User needs to leave group
- Need to fix deleting groups
- Do I need to save buildings/inventory/nicknames to the DB? Its a matter of seconds to get the updated version, maybe sync every 5 minutes?
- Clean up TODO

# Backlog Sorted
- Bug report button that allows people to report bugs or feature requests related to the page that they're on
- Changelog page - Can keep changelogs in MD in a specific folder so people can reference it
- Buildings/Cargo are not loading
- Proof of concept to pay for web service with Market Stall?
- Provide filters for items (tiers, completed, future - filter by related skills of your character)
- highlight items that are crafted vs gathered in the project list?
- can we cache ingredients locally so it doesnt have to query everything? set an expiration
- Link character to Discord account by saying something in chat?
- Asset list, asset search
- Crafting recommendations for your Claim - eg: does someone need an upgrade to their tool?
- Do not show item results that don't have recipes
- Figure out a better way to deal with the recipes that can use mutliple rarities of items
- When someone adds an item from a project page, it should remember what project was selected and use that as the default
- Page for offering upgrade services, allowing both an individual and a group to cover those upgrade services
- Some way of tracking a user's skills so that others can know what services they could offer
- Alerting system for completed crafting stations, character not crafting, etc
- Need to make building models like the cargo and items
- Change wording on the main page to remove filler information
- Have a "Used In" functionality to show what an item is used in
- Get the skill names from JSON as well so that we can present them in the recipes
- Add item icons (ref: https://github.com/BitCraftToolBox/brico/blob/4b2b58f66583f59988c825e9d4943cef85c6289c/frontend/src/lib/bitcraft-utils.ts#L117-L123)
- Change site title
- Split files for API endpoints
- crafting queues: let people register for specific classes that they can craft, and have a LFW / can work queue
- can people create their own groups that individuals can be invited to for LFW queues

# Backlog Unsorted
- Simple calculator on the item page that lets you set the number of items that you want to craft and shows the ingredients you need
- Using a user's character to calculate craft time
- Turn API errors into friendly user errors
- Explorer for other JSON data in the game files?
- Some sort of game TODO list - eg "reach 20 in this skill". Can resolve dependencies, so if you need to have a level in something before crafting an item, it can put both on the list
- LLM recommendations for what to do next? (lol idk sometimes i dont know what to do, it could be fun?)

# Notes
- construction_recipe_desc.json for building construction
