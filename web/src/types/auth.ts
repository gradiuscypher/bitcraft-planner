export interface User {
  id: number;
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
  created_at: string;
}

export interface LoginResponse {
  login_url: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
} 