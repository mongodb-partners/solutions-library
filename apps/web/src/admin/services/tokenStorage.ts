/**
 * Token storage utilities for admin authentication.
 * Uses localStorage for persistence across browser sessions.
 */

const ACCESS_TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';
const ADMIN_PROFILE_KEY = 'admin_profile';

export const tokenStorage = {
  /**
   * Get the stored access token.
   */
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Set the access token.
   */
  setAccessToken(token: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store access token:', error);
    }
  },

  /**
   * Get the stored refresh token.
   */
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Set the refresh token.
   */
  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store refresh token:', error);
    }
  },

  /**
   * Get the stored admin profile.
   */
  getAdminProfile<T>(): T | null {
    try {
      const profile = localStorage.getItem(ADMIN_PROFILE_KEY);
      return profile ? JSON.parse(profile) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set the admin profile.
   */
  setAdminProfile<T>(profile: T): void {
    try {
      localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to store admin profile:', error);
    }
  },

  /**
   * Store all tokens and profile after successful login.
   */
  setTokens(accessToken: string, refreshToken: string, profile: unknown): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
    this.setAdminProfile(profile);
  },

  /**
   * Clear all stored auth data (logout).
   */
  clearAll(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(ADMIN_PROFILE_KEY);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  },

  /**
   * Check if tokens exist (basic auth check).
   */
  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  },
};
