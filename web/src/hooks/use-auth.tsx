import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authService } from '@/lib/auth-service';
import type { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from stored data
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔐 Auth: Starting initialization');
      try {
        const storedUser = authService.getStoredUser();
        const token = authService.getStoredToken();
        console.log('🔐 Auth: Stored data check', { hasToken: !!token, hasUser: !!storedUser });

        if (token && storedUser) {
          // Verify the token is still valid by fetching current user
          try {
            console.log('🔐 Auth: Verifying token with API...');
            const currentUser = await authService.getCurrentUser();
            console.log('🔐 Auth: ✅ Token valid, user authenticated', { userEmail: currentUser.email });
            setUser(currentUser);
          } catch (error) {
            // Token is invalid, clear stored auth
            console.warn('🔐 Auth: ❌ Token invalid:', error);
            authService.clearStoredAuth();
            setUser(null);
          }
        } else {
          console.log('🔐 Auth: No stored credentials, user not authenticated');
          setUser(null);
        }
      } catch (error) {
        console.error('🔐 Auth: ❌ Initialization failed:', error);
        authService.clearStoredAuth();
        setUser(null);
      } finally {
        console.log('🔐 Auth: Initialization complete, loading = false');
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (): Promise<void> => {
    try {
      const loginUrl = await authService.getLoginUrl();
      // Redirect to Discord OAuth
      window.location.href = loginUrl;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = (): void => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    try {
      if (authService.isAuthenticated()) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const isAuthenticated = !!user && authService.isAuthenticated();

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for handling OAuth callback
export function useAuthCallback() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCallback = useCallback(async (code: string): Promise<User | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await authService.handleCallback(code);
      return response.user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('OAuth callback error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    handleCallback,
    isProcessing,
    error,
  };
} 