/**
 * Authentication context for admin dashboard.
 * Provides auth state and methods throughout the admin section.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { adminApi, tokenStorage } from '../services';
import type { AdminProfile, AuthState, LoginRequest } from '../types';

// Action types
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { admin: AdminProfile; accessToken: string; refreshToken: string } }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: { admin: AdminProfile; accessToken: string; refreshToken: string } }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  admin: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // Start loading to check for existing session
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        admin: action.payload.admin,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_ERROR':
      return {
        ...state,
        admin: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        admin: action.payload.admin,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Context types
interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create context
const AuthContext = createContext<AuthContextValue | null>(null);

// Provider component
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();
      const storedProfile = tokenStorage.getAdminProfile<AdminProfile>();

      if (accessToken && refreshToken && storedProfile) {
        try {
          // Verify token is still valid by fetching profile
          const profile = await adminApi.getProfile();
          dispatch({
            type: 'RESTORE_SESSION',
            payload: {
              admin: profile,
              accessToken,
              refreshToken,
            },
          });
        } catch {
          // Token invalid or expired
          tokenStorage.clearAll();
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    }

    checkSession();
  }, []);

  // Login handler
  const login = useCallback(async (credentials: LoginRequest) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await adminApi.login(credentials);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          admin: response.admin,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      // Extract detail from AdminApiError
      const detail = (error as { detail?: string }).detail || message;
      dispatch({ type: 'LOGIN_ERROR', payload: detail });
      throw error;
    }
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // Clear error handler
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
