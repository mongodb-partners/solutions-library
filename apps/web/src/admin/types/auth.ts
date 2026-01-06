/**
 * Authentication types for admin dashboard.
 */

export type AdminRole = 'super_admin' | 'admin' | 'viewer';

export interface AdminPermissions {
  can_manage_admins: boolean;
  can_manage_solutions: boolean;
  can_view_analytics: boolean;
  can_manage_settings: boolean;
}

export interface AdminProfile {
  admin_id: string;
  username: string;
  email: string;
  role: AdminRole;
  display_name: string;
  permissions: AdminPermissions;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  admin: AdminProfile;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthError {
  detail: string;
}

export interface DashboardStats {
  total_solutions: number;
  active_solutions: number;
  total_partners: number;
  total_categories: number;
  last_updated: string;
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  enabled: boolean;
}

export interface AuthState {
  admin: AdminProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Analytics types
export interface CategoryStats {
  category: string;
  count: number;
}

export interface StatusStats {
  status: string;
  count: number;
}

export interface PartnerStats {
  partner: string;
  count: number;
}

export interface AuthEventStats {
  event_type: string;
  count: number;
}

export interface AnalyticsData {
  solutions_by_category: CategoryStats[];
  solutions_by_status: StatusStats[];
  solutions_by_partner: PartnerStats[];
  auth_events_24h: AuthEventStats[];
  total_logins_24h: number;
  failed_logins_24h: number;
  generated_at: string;
}

// Logs types
export interface LogEntry {
  event_id: string;
  event_type: string;
  username: string;
  admin_id?: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface LogsData {
  logs: LogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Settings types
export interface GeneralSettings {
  app_name: string;
  maintenance_mode: boolean;
  maintenance_message: string;
}

export interface SecuritySettings {
  session_timeout_minutes: number;
  max_failed_login_attempts: number;
  lockout_duration_minutes: number;
  require_strong_passwords: boolean;
}

export interface AppSettings {
  general: GeneralSettings;
  security: SecuritySettings;
  updated_at?: string;
  updated_by?: string;
}

export interface SystemInfo {
  app_version: string;
  python_version: string;
  platform: string;
  environment: string;
  database: {
    name: string;
    connected: boolean;
  };
  features: Record<string, boolean>;
}
