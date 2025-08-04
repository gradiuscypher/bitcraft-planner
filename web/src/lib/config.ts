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
  
  // Groups endpoints
  GROUPS: '/groups/',
  GROUPS_BY_ID: (id: number) => `/groups/${id}`,
  GROUPS_ADD_USER: (groupId: number, discordId: string) => `/groups/${groupId}/users/${discordId}`,
  GROUPS_REMOVE_USER: (groupId: number, discordId: string) => `/groups/${groupId}/users/${discordId}`,
  GROUPS_PROMOTE_USER: (groupId: number, discordId: string) => `/groups/${groupId}/co-owners/${discordId}`,
  GROUPS_DEMOTE_USER: (groupId: number, discordId: string) => `/groups/${groupId}/co-owners/${discordId}`,
  
  // Projects endpoints
  PROJECTS: '/projects/',
  PROJECTS_BY_ID: (id: number) => `/projects/${id}`,
} as const;

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'bitcraft_auth_token',
  USER_DATA: 'bitcraft_user_data',
} as const; 