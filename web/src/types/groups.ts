export interface BasicUser {
  id: number;
  discord_id: string;
  username: string;
  discriminator?: string;
  global_name?: string;
  avatar?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface BasicUserWithRole extends BasicUser {
  role: 'member' | 'co_owner' | 'owner';
}

export interface UserGroup {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  can_create_projects?: boolean;
}

export interface GroupMember {
  id: number;
  user_id: number;
  group_id: number;
  joined_at: string;
  // User info for display
  username?: string;
  global_name?: string;
  avatar?: string;
  discord_id?: string;
}

export interface CreateGroupRequest {
  group_name: string;
}

export interface UpdateGroupRequest {
  name: string;
}

export interface GroupWithMembers extends UserGroup {
  members?: GroupMember[];
  member_count?: number;
}

export interface GroupWithDetails extends UserGroup {
  users: BasicUserWithRole[];
} 