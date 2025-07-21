import { API_BASE_URL, API_ENDPOINTS, LOCAL_STORAGE_KEYS } from './config';
import type { User, LoginResponse, AuthTokenResponse } from '@/types/auth';
import type { 
  CraftingProject, 
  CraftingProjectResponse, 
  CreateProjectRequest, 
  CreateProjectResponse,
  AddItemRequest,
  ProjectItemResponse
} from '@/types/crafting';

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Helper method for making authenticated API requests
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getStoredToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid, clear it
        this.clearStoredAuth();
        throw new Error('Authentication required');
      }
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Get login URL from the backend
  async getLoginUrl(): Promise<string> {
    const response = await this.makeRequest<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN);
    return response.login_url;
  }

  // Handle OAuth callback with authorization code
  async handleCallback(code: string): Promise<AuthTokenResponse> {
    const response = await this.makeRequest<AuthTokenResponse>(
      `${API_ENDPOINTS.AUTH_CALLBACK}?code=${encodeURIComponent(code)}`
    );
    
    // Store the token and user data
    this.storeAuth(response.access_token, response.user);
    
    return response;
  }

  // Get current user information
  async getCurrentUser(): Promise<User> {
    return this.makeRequest<User>(API_ENDPOINTS.AUTH_ME);
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await this.makeRequest(API_ENDPOINTS.AUTH_LOGOUT, {
        method: 'POST',
      });
    } catch (error) {
      // Even if the API call fails, we should clear local storage
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearStoredAuth();
    }
  }

  // Token management
  getStoredToken(): string | null {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
  }

  getStoredUser(): User | null {
    const userData = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  storeAuth(token: string, user: User): void {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  clearStoredAuth(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_DATA);
  }

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  // Test endpoints for demonstration
  async testPublicEndpoint(): Promise<any> {
    return this.makeRequest(API_ENDPOINTS.TEST_PUBLIC);
  }

  async testProtectedEndpoint(): Promise<any> {
    return this.makeRequest(API_ENDPOINTS.TEST_PROTECTED);
  }

  async testAdminEndpoint(): Promise<any> {
    return this.makeRequest(API_ENDPOINTS.TEST_ADMIN);
  }

  // Crafting project methods
  async createProject(request: CreateProjectRequest): Promise<CreateProjectResponse> {
    return this.makeRequest<CreateProjectResponse>(API_ENDPOINTS.CRAFTING_PROJECTS, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getUserProjects(): Promise<CraftingProject[]> {
    return this.makeRequest<CraftingProject[]>(API_ENDPOINTS.CRAFTING_PROJECTS);
  }

  async getProjectByUuid(uuid: string): Promise<CraftingProjectResponse> {
    return this.makeRequest<CraftingProjectResponse>(API_ENDPOINTS.CRAFTING_PROJECT_BY_UUID(uuid));
  }

  async addItemToProject(uuid: string, request: AddItemRequest): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.CRAFTING_PROJECT_ITEMS(uuid), {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getProjectItems(uuid: string): Promise<ProjectItemResponse[]> {
    return this.makeRequest<ProjectItemResponse[]>(API_ENDPOINTS.CRAFTING_PROJECT_ITEMS(uuid));
  }

  async removeItemFromProject(uuid: string, itemId: number): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`${API_ENDPOINTS.CRAFTING_PROJECT_ITEMS(uuid)}/${itemId}`, {
      method: 'DELETE',
    });
  }

  async updateItemCount(uuid: string, itemId: number, count: number): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`${API_ENDPOINTS.CRAFTING_PROJECT_ITEMS(uuid)}/${itemId}/count`, {
      method: 'PUT',
      body: JSON.stringify({ count }),
    });
  }

  async deleteProject(uuid: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.CRAFTING_PROJECT_BY_UUID(uuid), {
      method: 'DELETE',
    });
  }
}

// Export a singleton instance
export const authService = new AuthService(); 