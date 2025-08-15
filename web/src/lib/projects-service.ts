import { authService } from './auth-service';
import { API_BASE_URL, API_ENDPOINTS } from './config';
import type { Project, ProjectWithItems, CreateProjectRequest } from '@/types/projects';

class ProjectsService {
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

    // Log redirect information for debugging
    if (response.redirected) {
      console.warn(`API request was redirected: ${API_BASE_URL}${endpoint} -> ${response.url}`);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      if (response.status === 403) {
        throw new Error('You do not have permission to perform this action');
      }
      if (response.status === 307 || response.status === 308) {
        throw new Error(`Request redirected (${response.status}). Check API endpoint configuration.`);
      }
      
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unable to read error response';
      }
      
      const fullUrl = `${API_BASE_URL}${endpoint}`;
      console.error(`API Error Details:`, {
        status: response.status,
        statusText: response.statusText,
        url: fullUrl,
        redirected: response.redirected,
        finalUrl: response.url,
        errorText
      });
      
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    // Handle empty responses for DELETE operations
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return response.json();
  }

  // Get all user projects
  async getUserProjects(): Promise<ProjectWithItems[]> {
    return this.makeRequest<ProjectWithItems[]>(API_ENDPOINTS.PROJECTS);
  }

  // Get a single project by ID
  async getProject(projectId: number): Promise<ProjectWithItems> {
    return this.makeRequest<ProjectWithItems>(API_ENDPOINTS.PROJECTS_BY_ID(projectId));
  }

  // Create a new project
  async createProject(projectData: CreateProjectRequest): Promise<Project> {
    return this.makeRequest<Project>(API_ENDPOINTS.PROJECTS, {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  // Update a project
  async updateProject(projectId: number, projectData: CreateProjectRequest): Promise<ProjectWithItems> {
    return this.makeRequest<ProjectWithItems>(API_ENDPOINTS.PROJECTS_BY_ID(projectId), {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  // Delete a project
  async deleteProject(projectId: number): Promise<void> {
    return this.makeRequest<void>(API_ENDPOINTS.PROJECTS_BY_ID(projectId), {
      method: 'DELETE',
    });
  }

  // Add item to project
  async addItemToProject(projectId: number, itemId: number, amount: number, itemType = 'item'): Promise<ProjectWithItems> {
    // Validate inputs
    if (itemId === undefined || itemId === null || isNaN(itemId)) {
      throw new Error(`Invalid itemId: ${itemId}`);
    }
    
    if (projectId === undefined || projectId === null || isNaN(projectId)) {
      throw new Error(`Invalid projectId: ${projectId}`);
    }
    
    return this.makeRequest<ProjectWithItems>(`${API_ENDPOINTS.PROJECTS_BY_ID(projectId)}/items`, {
      method: 'POST',
      body: JSON.stringify({
        item_id: itemId,
        amount: amount,
        item_type: itemType,
      }),
    });
  }

  // Remove item from project
  async removeItemFromProject(projectId: number, itemId: number): Promise<ProjectWithItems> {
    return this.makeRequest<ProjectWithItems>(`${API_ENDPOINTS.PROJECTS_BY_ID(projectId)}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Update item count in project
  async updateProjectItemCount(projectId: number, itemId: number, count: number): Promise<ProjectWithItems> {
    return this.makeRequest<ProjectWithItems>(`${API_ENDPOINTS.PROJECTS_BY_ID(projectId)}/items/${itemId}/count`, {
      method: 'PUT',
      body: JSON.stringify({
        count: count,
      }),
    });
  }
}

// Export a singleton instance
export const projectsService = new ProjectsService(); 