export interface User {
  user_id: number;
  discord_id: string;
  username: string;
  global_name: string | null;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  volume: number;
  durability: number;
  model_asset_name: string;
  icon_asset_name: string;
  tier: number;
  tag: string;
}

export interface CraftingProjectItem {
  item: Item;
  count: number;
}

export interface CraftingProjectOwner {
  user_id: number;
  discord_id: string;
  username: string;
  global_name: string | null;
}

export interface CraftingProject {
  project_id: number;
  public_uuid: string;
  private_uuid: string;
  project_name: string;
  target_items: CraftingProjectItem[];
  owners: CraftingProjectOwner[];
}

export interface CraftingProjectResponse extends CraftingProject {
  is_private: boolean;
}

export interface CreateProjectRequest {
  project_name: string;
}

export interface CreateProjectResponse {
  public_uuid: string;
  private_uuid: string;
  project_name: string;
}

export interface AddItemRequest {
  item_id: number;
  count: number;
}

export interface ProjectItemResponse {
  item_id: number;
  count: number;
} 