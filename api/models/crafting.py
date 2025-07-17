from pydantic import UUID4, BaseModel

from models.items import Item


class CraftingProjectItem(BaseModel):
    item: Item
    count: int


class CraftingProject(BaseModel):
    project_id: int
    project_owner: UUID4
    project_name: str
    target_items: list[CraftingProjectItem]
