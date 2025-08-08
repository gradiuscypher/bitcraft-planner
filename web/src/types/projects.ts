export interface Project {
  id: number;
  name: string;
  owner_id: number;
  group_id?: number | null;
}

export interface ProjectItem {
  id: number;
  item_id: number;
  name: string;
  count: number;
  target_count: number;
  tier?: number | null;
}

export interface ProjectWithItems extends Project {
  items?: ProjectItem[];
}

export interface CreateProjectRequest {
  name: string;
  group_id?: number | null;
}

export interface UpdateProjectRequest {
  name: string;
  group_id?: number | null;
} 