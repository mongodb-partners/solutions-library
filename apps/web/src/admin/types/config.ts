/**
 * TypeScript types for Configuration management.
 */

export type ConfigCategory = 'api_keys' | 'secrets' | 'features' | 'settings';
export type ValidationType = 'none' | 'api_key' | 'url' | 'boolean' | 'number';

export interface ConfigResponse {
  config_id: string;
  key: string;
  value: string | null;
  category: ConfigCategory;
  description?: string;
  is_sensitive: boolean;
  is_encrypted: boolean;
  validation_type: ValidationType;
  default_value?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface ConfigListResponse {
  configs: ConfigResponse[];
  total: number;
}

export interface ConfigCreate {
  key: string;
  value: string;
  category: ConfigCategory;
  description?: string;
  is_sensitive?: boolean;
  validation_type?: ValidationType;
  default_value?: string;
  metadata?: Record<string, unknown>;
}

export interface ConfigUpdate {
  value?: string;
  description?: string;
  is_sensitive?: boolean;
  validation_type?: ValidationType;
  default_value?: string;
  metadata?: Record<string, unknown>;
}

export interface ConfigAudit {
  audit_id: string;
  config_id: string;
  config_key: string;
  action: 'create' | 'update' | 'delete';
  admin_id: string;
  timestamp: string;
}

export interface ConfigTestRequest {
  test_endpoint?: string;
}

export interface ConfigTestResponse {
  success: boolean;
  message: string;
  response_time_ms?: number;
  status_code?: number;
}

export interface ConfigImportRequest {
  configs: ConfigCreate[];
  overwrite?: boolean;
}

export interface ConfigImportResponse {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ConfigExport {
  exported_at: string;
  configs: Array<{
    key: string;
    value: string | null;
    category: string;
    description?: string;
    is_sensitive: boolean;
    validation_type: string;
    default_value?: string;
    metadata?: Record<string, unknown>;
  }>;
}
