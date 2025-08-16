// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH_LOGIN: '/auth/login',
  AUTH_CALLBACK: '/auth/callback',
  AUTH_ME: '/auth/me',
  AUTH_LOGOUT: '/auth/logout',
  
  // Search endpoints (backend routes live under /items)
  SEARCH_ITEMS: '/items/search',
  SEARCH_ALL: '/items/search/all',
  SEARCH_BEST: '/items/search/best',
  
  // Groups endpoints
  GROUPS: '/groups/',
  GROUPS_BY_ID: (id: number) => `/groups/${id}`,
  GROUPS_ADD_USER: (groupId: number, discordId: string) => `/groups/${groupId}/users/${discordId}`,
  GROUPS_REMOVE_USER: (groupId: number, discordId: string) => `/groups/${groupId}/users/${discordId}`,
  GROUPS_PROMOTE_USER: (groupId: number, discordId: string) => `/groups/${groupId}/co-owners/${discordId}`,
  GROUPS_DEMOTE_USER: (groupId: number, discordId: string) => `/groups/${groupId}/co-owners/${discordId}`,
  
  // Group invite endpoints
  GROUPS_CREATE_INVITE: (groupId: number) => `/groups/${groupId}/invites`,
  GROUPS_LIST_INVITES: (groupId: number) => `/groups/${groupId}/invites`,
  GROUPS_DELETE_INVITE: (inviteId: number) => `/groups/invites/${inviteId}`,
  GROUPS_JOIN_INVITE: (inviteCode: string) => `/groups/invites/${inviteCode}/join`,
  GROUPS_MY_INVITES: '/groups/invites/my',
  
  // Projects endpoints
  PROJECTS: '/projects/',
  PROJECTS_BY_ID: (id: number) => `/projects/${id}`,
} as const;

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'bitcraft_auth_token',
  USER_DATA: 'bitcraft_user_data',
} as const; 