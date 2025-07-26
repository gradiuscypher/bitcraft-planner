export interface Project {
  id: number;
  name: string;
  owner_id: number;
  group_id?: number | null;
}

export interface ProjectItem {
  id: number;
  name: string;
  count: number;
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