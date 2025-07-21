// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH_LOGIN: '/auth/login',
  AUTH_CALLBACK: '/auth/callback',
  AUTH_ME: '/auth/me',
  AUTH_LOGOUT: '/auth/logout',
  
  // Test endpoints
  TEST_PUBLIC: '/test/public',
  TEST_PROTECTED: '/test/protected',
  TEST_ADMIN: '/test/admin',
  
  // Search endpoints
  SEARCH_ITEMS: '/search/items',
  SEARCH_ALL: '/search/all',
  SEARCH_BEST: '/search/best',
  
  // Crafting project endpoints
  CRAFTING_PROJECTS: '/crafting/projects',
  CRAFTING_PROJECT_BY_UUID: (uuid: string) => `/crafting/projects/${uuid}`,
  CRAFTING_PROJECT_ITEMS: (uuid: string) => `/crafting/projects/${uuid}/items`,
  CRAFTING_PROJECT_OWNERS: (uuid: string) => `/crafting/projects/${uuid}/owners`,
} as const;

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'bitcraft_auth_token',
  USER_DATA: 'bitcraft_user_data',
} as const; 