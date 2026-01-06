/**
 * Admin API client for authentication and dashboard operations.
 */

import { tokenStorage } from './tokenStorage';
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  AdminProfile,
  DashboardStats,
  NavItem,
  SolutionsListResponse,
  SolutionDetail,
  CategoryCount,
  AnalyticsData,
  LogsData,
  AppSettings,
  SystemInfo,
  ConfigResponse,
  ConfigListResponse,
  ConfigCreate,
  ConfigUpdate,
  ConfigAudit,
  ConfigTestResponse,
  ConfigImportRequest,
  ConfigImportResponse,
  ConfigExport,
  ConfigCategory,
} from '../types';

const API_BASE_URL = '/api/admin';

class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = 'Unknown error';
    try {
      const errorData = await response.json();
      // Handle Pydantic validation errors (array format)
      if (Array.isArray(errorData.detail)) {
        const firstError = errorData.detail[0];
        if (firstError?.msg) {
          detail = firstError.msg;
        } else {
          detail = JSON.stringify(errorData.detail);
        }
      } else if (typeof errorData.detail === 'string') {
        detail = errorData.detail;
      } else if (errorData.message) {
        detail = errorData.message;
      } else {
        detail = JSON.stringify(errorData);
      }
    } catch {
      detail = response.statusText;
    }
    throw new AdminApiError(`API Error: ${response.status}`, response.status, detail);
  }
  return response.json();
}

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStorage.getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 - try token refresh
  if (response.status === 401 && token) {
    const refreshed = await adminApi.refreshToken();
    if (refreshed) {
      // Retry with new token
      const newToken = tokenStorage.getAccessToken();
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;

      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      return handleResponse<T>(retryResponse);
    }
  }

  return handleResponse<T>(response);
}

export const adminApi = {
  /**
   * Login with username and password.
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await handleResponse<LoginResponse>(response);

    // Store tokens
    tokenStorage.setTokens(data.access_token, data.refresh_token, data.admin);

    return data;
  },

  /**
   * Logout current session.
   */
  async logout(): Promise<void> {
    try {
      await fetchWithAuth<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      tokenStorage.clearAll();
    }
  },

  /**
   * Refresh access token using refresh token.
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        tokenStorage.clearAll();
        return false;
      }

      const data: RefreshResponse = await response.json();
      tokenStorage.setAccessToken(data.access_token);
      tokenStorage.setRefreshToken(data.refresh_token);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      tokenStorage.clearAll();
      return false;
    }
  },

  /**
   * Get current admin profile.
   */
  async getProfile(): Promise<AdminProfile> {
    return fetchWithAuth<AdminProfile>('/auth/me');
  },

  /**
   * Change password.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await fetchWithAuth<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  },

  /**
   * Get dashboard statistics.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return fetchWithAuth<DashboardStats>('/dashboard/stats');
  },

  /**
   * Get analytics data.
   */
  async getAnalytics(): Promise<AnalyticsData> {
    return fetchWithAuth<AnalyticsData>('/dashboard/analytics');
  },

  /**
   * Get paginated logs.
   */
  async getLogs(params?: {
    event_type?: string;
    username?: string;
    page?: number;
    page_size?: number;
  }): Promise<LogsData> {
    const searchParams = new URLSearchParams();
    if (params?.event_type) searchParams.append('event_type', params.event_type);
    if (params?.username) searchParams.append('username', params.username);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/dashboard/logs?${queryString}` : '/dashboard/logs';

    return fetchWithAuth<LogsData>(endpoint);
  },

  /**
   * Get navigation items based on role.
   */
  async getNavigation(): Promise<NavItem[]> {
    const response = await fetchWithAuth<{ items: NavItem[] }>('/dashboard/nav');
    return response.items;
  },

  /**
   * Check API health.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  },

  // ===========================================
  // Solutions API
  // ===========================================

  /**
   * Get all solutions with optional filtering.
   */
  async getSolutions(params?: {
    category?: string;
    search?: string;
  }): Promise<SolutionsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/solutions?${queryString}` : '/solutions';

    return fetchWithAuth<SolutionsListResponse>(endpoint);
  },

  /**
   * Get solution details by ID.
   */
  async getSolution(solutionId: string): Promise<SolutionDetail> {
    return fetchWithAuth<SolutionDetail>(`/solutions/${solutionId}`);
  },

  /**
   * Get all categories with solution counts.
   */
  async getCategories(): Promise<CategoryCount[]> {
    return fetchWithAuth<CategoryCount[]>('/solutions/categories');
  },

  /**
   * Refresh solution cache.
   */
  async refreshSolutionCache(solutionId?: string): Promise<void> {
    if (solutionId) {
      await fetchWithAuth<{ message: string }>(`/solutions/${solutionId}/refresh`, {
        method: 'POST',
      });
    } else {
      await fetchWithAuth<{ message: string }>('/solutions/refresh-all', {
        method: 'POST',
      });
    }
  },

  /**
   * Update solution status.
   */
  async updateSolutionStatus(
    solutionId: string,
    status: 'active' | 'inactive' | 'coming-soon'
  ): Promise<{ solution_id: string; status: string; message: string }> {
    return fetchWithAuth<{ solution_id: string; status: string; message: string }>(
      `/solutions/${solutionId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },

  /**
   * Create a new solution.
   */
  async createSolution(data: SolutionCreateRequest): Promise<SolutionCreateResponse> {
    return fetchWithAuth<SolutionCreateResponse>('/solutions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing solution.
   */
  async updateSolution(solutionId: string, data: SolutionUpdateRequest): Promise<SolutionDetail> {
    return fetchWithAuth<SolutionDetail>(`/solutions/${solutionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a solution.
   */
  async deleteSolution(solutionId: string): Promise<{ solution_id: string; message: string }> {
    return fetchWithAuth<{ solution_id: string; message: string }>(`/solutions/${solutionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Seed solutions from solution.json files.
   */
  async seedSolutions(): Promise<{ seeded: number; message: string }> {
    return fetchWithAuth<{ seeded: number; message: string }>('/solutions/seed', {
      method: 'POST',
    });
  },

  // ===========================================
  // Admin Users API (super_admin only)
  // ===========================================

  /**
   * List all admin users.
   */
  async getAdmins(params?: {
    role?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ admins: AdminUser[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/admins?${queryString}` : '/admins';

    return fetchWithAuth<{ admins: AdminUser[]; total: number }>(endpoint);
  },

  /**
   * Create a new admin user.
   */
  async createAdmin(data: {
    username: string;
    email: string;
    password: string;
    role: string;
    display_name?: string;
  }): Promise<AdminUser> {
    return fetchWithAuth<AdminUser>('/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get admin user details.
   */
  async getAdmin(adminId: string): Promise<AdminUser> {
    return fetchWithAuth<AdminUser>(`/admins/${adminId}`);
  },

  /**
   * Update an admin user.
   */
  async updateAdmin(
    adminId: string,
    data: {
      role?: string;
      status?: string;
      display_name?: string;
    }
  ): Promise<AdminUser> {
    return fetchWithAuth<AdminUser>(`/admins/${adminId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Reset an admin's password.
   */
  async resetAdminPassword(adminId: string, newPassword: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/admins/${adminId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    });
  },

  /**
   * Unlock a locked admin account.
   */
  async unlockAdmin(adminId: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/admins/${adminId}/unlock`, {
      method: 'POST',
    });
  },

  /**
   * Delete an admin user.
   */
  async deleteAdmin(adminId: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/admins/${adminId}`, {
      method: 'DELETE',
    });
  },

  // ===========================================
  // Settings API (super_admin only)
  // ===========================================

  /**
   * Get application settings.
   */
  async getSettings(): Promise<AppSettings> {
    return fetchWithAuth<AppSettings>('/settings');
  },

  /**
   * Update application settings.
   */
  async updateSettings(settings: {
    general?: {
      app_name?: string;
      maintenance_mode?: boolean;
      maintenance_message?: string;
    };
    security?: {
      session_timeout_minutes?: number;
      max_failed_login_attempts?: number;
      lockout_duration_minutes?: number;
      require_strong_passwords?: boolean;
    };
  }): Promise<AppSettings> {
    return fetchWithAuth<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  /**
   * Reset settings to defaults.
   */
  async resetSettings(): Promise<AppSettings> {
    return fetchWithAuth<AppSettings>('/settings/reset', {
      method: 'POST',
    });
  },

  /**
   * Get system information.
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return fetchWithAuth<SystemInfo>('/settings/system-info');
  },

  // ===========================================
  // Configuration API (super_admin only)
  // ===========================================

  /**
   * List all configurations.
   */
  async getConfigs(category?: ConfigCategory): Promise<ConfigListResponse> {
    const searchParams = new URLSearchParams();
    if (category) searchParams.append('category', category);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/config?${queryString}` : '/config';

    return fetchWithAuth<ConfigListResponse>(endpoint);
  },

  /**
   * Get a configuration by ID.
   */
  async getConfig(configId: string, unmask?: boolean): Promise<ConfigResponse> {
    const searchParams = new URLSearchParams();
    if (unmask) searchParams.append('unmask', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/config/${configId}?${queryString}` : `/config/${configId}`;

    return fetchWithAuth<ConfigResponse>(endpoint);
  },

  /**
   * Create a new configuration.
   */
  async createConfig(data: ConfigCreate): Promise<ConfigResponse> {
    return fetchWithAuth<ConfigResponse>('/config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a configuration.
   */
  async updateConfig(configId: string, data: ConfigUpdate): Promise<ConfigResponse> {
    return fetchWithAuth<ConfigResponse>(`/config/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a configuration.
   */
  async deleteConfig(configId: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/config/${configId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Test an API key connection.
   */
  async testConfigConnection(configId: string, testEndpoint?: string): Promise<ConfigTestResponse> {
    return fetchWithAuth<ConfigTestResponse>(`/config/${configId}/test`, {
      method: 'POST',
      body: JSON.stringify(testEndpoint ? { test_endpoint: testEndpoint } : {}),
    });
  },

  /**
   * Get configuration audit history.
   */
  async getConfigHistory(configId: string, limit?: number): Promise<ConfigAudit[]> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.append('limit', limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/config/${configId}/history?${queryString}` : `/config/${configId}/history`;

    return fetchWithAuth<ConfigAudit[]>(endpoint);
  },

  /**
   * Export all configurations.
   */
  async exportConfigs(includeSensitive?: boolean): Promise<ConfigExport> {
    const searchParams = new URLSearchParams();
    if (includeSensitive) searchParams.append('include_sensitive', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/config/export?${queryString}` : '/config/export';

    return fetchWithAuth<ConfigExport>(endpoint);
  },

  /**
   * Import configurations.
   */
  async importConfigs(data: ConfigImportRequest): Promise<ConfigImportResponse> {
    return fetchWithAuth<ConfigImportResponse>('/config/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ===========================================
  // Telemetry API
  // ===========================================

  /**
   * Get telemetry usage statistics.
   */
  async getTelemetryStats(hours?: number): Promise<TelemetryUsageStats> {
    const searchParams = new URLSearchParams();
    if (hours) searchParams.append('hours', hours.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/telemetry/stats?${queryString}` : '/telemetry/stats';

    return fetchWithAuth<TelemetryUsageStats>(endpoint);
  },

  /**
   * Get telemetry response time percentiles.
   */
  async getTelemetryPercentiles(hours?: number): Promise<TelemetryPercentileStats> {
    const searchParams = new URLSearchParams();
    if (hours) searchParams.append('hours', hours.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/telemetry/percentiles?${queryString}` : '/telemetry/percentiles';

    return fetchWithAuth<TelemetryPercentileStats>(endpoint);
  },

  /**
   * Get telemetry usage over time.
   */
  async getTelemetryUsageOverTime(hours?: number, interval?: string): Promise<TelemetryTimeSeriesResponse> {
    const searchParams = new URLSearchParams();
    if (hours) searchParams.append('hours', hours.toString());
    if (interval) searchParams.append('interval', interval);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/telemetry/usage-over-time?${queryString}` : '/telemetry/usage-over-time';

    return fetchWithAuth<TelemetryTimeSeriesResponse>(endpoint);
  },

  /**
   * Get top endpoints by request count.
   */
  async getTelemetryTopEndpoints(hours?: number, limit?: number): Promise<TelemetryTopEndpointsResponse> {
    const searchParams = new URLSearchParams();
    if (hours) searchParams.append('hours', hours.toString());
    if (limit) searchParams.append('limit', limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/telemetry/top-endpoints?${queryString}` : '/telemetry/top-endpoints';

    return fetchWithAuth<TelemetryTopEndpointsResponse>(endpoint);
  },

  /**
   * Get telemetry stats by solution.
   */
  async getTelemetrySolutionStats(hours?: number): Promise<{ hours: number; solutions: Record<string, number>; total: number }> {
    const searchParams = new URLSearchParams();
    if (hours) searchParams.append('hours', hours.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/telemetry/solution-stats?${queryString}` : '/telemetry/solution-stats';

    return fetchWithAuth<{ hours: number; solutions: Record<string, number>; total: number }>(endpoint);
  },

  /**
   * Get paginated telemetry events.
   */
  async getTelemetryEvents(params?: {
    event_type?: string;
    solution_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<TelemetryEventsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.event_type) searchParams.append('event_type', params.event_type);
    if (params?.solution_id) searchParams.append('solution_id', params.solution_id);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/telemetry?${queryString}` : '/telemetry';

    return fetchWithAuth<TelemetryEventsResponse>(endpoint);
  },

  /**
   * Export telemetry data as JSON.
   */
  async exportTelemetry(params?: {
    event_type?: string;
    solution_id?: string;
    max_records?: number;
  }): Promise<Blob> {
    const searchParams = new URLSearchParams();
    if (params?.event_type) searchParams.append('event_type', params.event_type);
    if (params?.solution_id) searchParams.append('solution_id', params.solution_id);
    if (params?.max_records) searchParams.append('max_records', params.max_records.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/telemetry/export/json?${queryString}` : '/telemetry/export/json';

    const token = tokenStorage.getAccessToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new AdminApiError('Failed to export telemetry', response.status);
    }

    return response.blob();
  },

  // ===========================================
  // Housekeeping API
  // ===========================================

  /**
   * List all housekeeping tasks.
   */
  async getHousekeepingTasks(): Promise<HousekeepingTasksResponse> {
    return fetchWithAuth<HousekeepingTasksResponse>('/housekeeping/tasks');
  },

  /**
   * Get a housekeeping task by ID.
   */
  async getHousekeepingTask(taskId: string): Promise<HousekeepingTask> {
    return fetchWithAuth<HousekeepingTask>(`/housekeeping/tasks/${taskId}`);
  },

  /**
   * Update a housekeeping task.
   */
  async updateHousekeepingTask(taskId: string, data: {
    is_enabled?: boolean;
    config?: { retention_days?: number; max_items?: number };
  }): Promise<HousekeepingTask> {
    return fetchWithAuth<HousekeepingTask>(`/housekeeping/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Run a housekeeping task manually.
   */
  async runHousekeepingTask(taskId: string): Promise<HousekeepingTaskRunResult> {
    return fetchWithAuth<HousekeepingTaskRunResult>(`/housekeeping/tasks/${taskId}/run`, {
      method: 'POST',
    });
  },

  /**
   * Get database statistics.
   */
  async getDatabaseStats(): Promise<DatabaseStatsResponse> {
    return fetchWithAuth<DatabaseStatsResponse>('/housekeeping/db-stats');
  },
};

// Telemetry types
export interface TelemetryUsageStats {
  total_events: number;
  total_api_calls: number;
  total_demo_interactions: number;
  total_page_views: number;
  total_tokens_used: number;
  unique_sessions: number;
  avg_response_time_ms: number;
  error_count: number;
  error_rate: number;
}

export interface TelemetryPercentileStats {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface TelemetryTimeSeriesDataPoint {
  timestamp: string;
  count: number;
  avg_duration_ms: number | null;
  tokens_used: number | null;
}

export interface TelemetryTimeSeriesResponse {
  data: TelemetryTimeSeriesDataPoint[];
  interval: string;
  start_time: string;
  end_time: string;
  total_count: number;
}

export interface TelemetryTopEndpoint {
  endpoint: string;
  method: string;
  count: number;
  avg_duration_ms: number;
  error_count: number;
  error_rate: number;
}

export interface TelemetryTopEndpointsResponse {
  endpoints: TelemetryTopEndpoint[];
  time_range_hours: number;
}

export interface TelemetryEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  partner_demo: string | null;
  solution_id: string | null;
  session_id: string | null;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  duration_ms: number | null;
  tokens_used: number | null;
  model_used: string | null;
}

export interface TelemetryEventsResponse {
  events: TelemetryEvent[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Housekeeping types
export interface HousekeepingTaskConfig {
  retention_days?: number;
  max_items?: number;
}

export interface HousekeepingTask {
  task_id: string;
  name: string;
  description: string;
  task_type: string;
  schedule: string;
  config: HousekeepingTaskConfig;
  is_enabled: boolean;
  last_run: string | null;
  last_status: string;
  last_duration_ms: number | null;
  last_result: string | null;
  next_run: string | null;
}

export interface HousekeepingTasksResponse {
  tasks: HousekeepingTask[];
}

export interface HousekeepingTaskRunResult {
  task_id: string;
  task_type: string;
  status: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  items_processed: number;
  items_deleted: number;
  error_message: string | null;
}

export interface CollectionStats {
  collection_name: string;
  document_count: number;
  storage_size_mb: number;
  avg_document_size_bytes: number;
  index_count: number;
  index_size_mb: number;
}

export interface DatabaseStatsResponse {
  database_name: string;
  total_collections: number;
  total_documents: number;
  total_storage_mb: number;
  collections: CollectionStats[];
  generated_at: string;
}

// Admin user type
export interface AdminUser {
  admin_id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  display_name?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  last_login?: string;
  failed_login_attempts?: number;
}

// Solution CRUD types
export interface SolutionCreateRequest {
  id: string;
  name: string;
  partner_name: string;
  partner_logo?: string;
  partner_website?: string;
  description: string;
  long_description?: string;
  value_proposition?: string[];
  technologies?: string[];
  category: string;
  demo_url?: string;
  source_url?: string;
  documentation?: string;
  port_api?: number;
  port_ui?: number;
  status?: 'active' | 'inactive' | 'coming-soon';
  featured?: boolean;
}

export interface SolutionUpdateRequest {
  name?: string;
  partner_name?: string;
  partner_logo?: string;
  partner_website?: string;
  description?: string;
  long_description?: string;
  value_proposition?: string[];
  technologies?: string[];
  category?: string;
  demo_url?: string;
  source_url?: string;
  documentation?: string;
  port_api?: number;
  port_ui?: number;
  status?: 'active' | 'inactive' | 'coming-soon';
  featured?: boolean;
}

export interface SolutionCreateResponse {
  solution_id: string;
  name: string;
  message: string;
}

export { AdminApiError };
