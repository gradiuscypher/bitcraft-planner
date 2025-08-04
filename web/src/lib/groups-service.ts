import { authService } from './auth-service';
import { API_BASE_URL, API_ENDPOINTS } from './config';
import type { UserGroup, GroupWithDetails } from '@/types/groups';

class GroupsService {
  // Helper method for making authenticated API requests
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = authService.getStoredToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      if (response.status === 403) {
        throw new Error('You do not have permission to perform this action');
      }
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    // Handle empty responses for DELETE operations
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return response.json();
  }

  // Get all user groups
  async getUserGroups(): Promise<UserGroup[]> {
    return this.makeRequest<UserGroup[]>(API_ENDPOINTS.GROUPS);
  }

  // Get a single group by ID with members
  async getGroup(groupId: number): Promise<GroupWithDetails> {
    return this.makeRequest<GroupWithDetails>(API_ENDPOINTS.GROUPS_BY_ID(groupId));
  }

  // Create a new group
  async createGroup(groupName: string): Promise<void> {
    const params = new URLSearchParams();
    params.append('group_name', groupName);
    
    return this.makeRequest<void>(`${API_ENDPOINTS.GROUPS}?${params}`, {
      method: 'POST',
    });
  }

  // Delete a group
  async deleteGroup(groupId: number): Promise<void> {
    return this.makeRequest<void>(API_ENDPOINTS.GROUPS_BY_ID(groupId), {
      method: 'DELETE',
    });
  }

  // Add user to group
  async addUserToGroup(groupId: number, discordId: string): Promise<void> {
    return this.makeRequest<void>(API_ENDPOINTS.GROUPS_ADD_USER(groupId, discordId), {
      method: 'POST',
    });
  }

  // Remove user from group
  async removeUserFromGroup(groupId: number, discordId: string): Promise<void> {
    return this.makeRequest<void>(API_ENDPOINTS.GROUPS_REMOVE_USER(groupId, discordId), {
      method: 'DELETE',
    });
  }

  // Promote user to co-owner
  async promoteUserToCoOwner(groupId: number, discordId: string): Promise<void> {
    return this.makeRequest<void>(API_ENDPOINTS.GROUPS_PROMOTE_USER(groupId, discordId), {
      method: 'POST',
    });
  }

  // Demote co-owner to member
  async demoteCoOwnerToMember(groupId: number, discordId: string): Promise<void> {
    return this.makeRequest<void>(API_ENDPOINTS.GROUPS_DEMOTE_USER(groupId, discordId), {
      method: 'DELETE',
    });
  }
}

// Export a singleton instance
export const groupsService = new GroupsService(); 