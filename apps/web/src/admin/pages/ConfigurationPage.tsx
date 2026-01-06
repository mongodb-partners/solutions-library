/**
 * Configuration management page for admin dashboard.
 * Only accessible by super_admin users.
 */

import React, { useEffect, useState } from 'react';
import { adminApi } from '../services';
import type { ConfigResponse, ConfigCreate, ConfigUpdate, ConfigCategory, ConfigAudit, ValidationType } from '../types';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

const categoryLabels: Record<ConfigCategory, string> = {
  api_keys: 'API Keys',
  secrets: 'Secrets',
  features: 'Feature Flags',
  settings: 'Settings',
};

const validationTypeLabels: Record<ValidationType, string> = {
  none: 'None',
  api_key: 'API Key',
  url: 'URL',
  boolean: 'Boolean',
  number: 'Number',
};

interface ModalState {
  type: 'create' | 'edit' | 'delete' | 'history' | 'test' | null;
  config?: ConfigResponse;
}

export function ConfigurationPage() {
  const [configs, setConfigs] = useState<ConfigResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ConfigCategory>('api_keys');
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for create/edit
  const [formData, setFormData] = useState<{
    key: string;
    value: string;
    description: string;
    is_sensitive: boolean;
    validation_type: ValidationType;
    default_value: string;
    test_endpoint: string;
  }>({
    key: '',
    value: '',
    description: '',
    is_sensitive: false,
    validation_type: 'none',
    default_value: '',
    test_endpoint: '',
  });

  // History state
  const [history, setHistory] = useState<ConfigAudit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Test state
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    response_time_ms?: number;
    status_code?: number;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getConfigs();
      setConfigs(data.configs);
    } catch (err) {
      console.error('Failed to fetch configs:', err);
      setError('Failed to load configurations.');
    } finally {
      setLoading(false);
    }
  };

  const filteredConfigs = configs.filter(
    (config) =>
      config.category === activeTab &&
      (searchQuery === '' ||
        config.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (config.description && config.description.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleCreate = async () => {
    try {
      setError(null);
      const createData: ConfigCreate = {
        key: formData.key,
        value: formData.value,
        category: activeTab,
        description: formData.description || undefined,
        is_sensitive: formData.is_sensitive,
        validation_type: formData.validation_type,
        default_value: formData.default_value || undefined,
        metadata: formData.test_endpoint ? { test_endpoint: formData.test_endpoint } : undefined,
      };

      await adminApi.createConfig(createData);
      setSuccess('Configuration created successfully!');
      setModal({ type: null });
      resetForm();
      fetchConfigs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to create config:', err);
      const apiError = err as { detail?: string };
      setError(apiError.detail || 'Failed to create configuration.');
    }
  };

  const handleUpdate = async () => {
    if (!modal.config) return;

    try {
      setError(null);
      const updateData: ConfigUpdate = {
        value: formData.value || undefined,
        description: formData.description || undefined,
        is_sensitive: formData.is_sensitive,
        validation_type: formData.validation_type,
        default_value: formData.default_value || undefined,
        metadata: formData.test_endpoint ? { test_endpoint: formData.test_endpoint } : undefined,
      };

      await adminApi.updateConfig(modal.config.config_id, updateData);
      setSuccess('Configuration updated successfully!');
      setModal({ type: null });
      resetForm();
      fetchConfigs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to update config:', err);
      const apiError = err as { detail?: string };
      setError(apiError.detail || 'Failed to update configuration.');
    }
  };

  const handleDelete = async () => {
    if (!modal.config) return;

    try {
      setError(null);
      await adminApi.deleteConfig(modal.config.config_id);
      setSuccess('Configuration deleted successfully!');
      setModal({ type: null });
      fetchConfigs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to delete config:', err);
      const apiError = err as { detail?: string };
      setError(apiError.detail || 'Failed to delete configuration.');
    }
  };

  const handleViewHistory = async (config: ConfigResponse) => {
    setHistoryLoading(true);
    setHistory([]);
    setModal({ type: 'history', config });

    try {
      const data = await adminApi.getConfigHistory(config.config_id);
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTestConnection = async (config: ConfigResponse) => {
    setTestLoading(true);
    setTestResult(null);
    setModal({ type: 'test', config });

    try {
      const result = await adminApi.testConfigConnection(config.config_id);
      setTestResult(result);
    } catch (err) {
      console.error('Failed to test connection:', err);
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const openEditModal = async (config: ConfigResponse) => {
    // Fetch full config with unmasked value
    try {
      const fullConfig = await adminApi.getConfig(config.config_id, true);
      setFormData({
        key: fullConfig.key,
        value: fullConfig.value || '',
        description: fullConfig.description || '',
        is_sensitive: fullConfig.is_sensitive,
        validation_type: fullConfig.validation_type as ValidationType,
        default_value: fullConfig.default_value || '',
        test_endpoint: (fullConfig.metadata?.test_endpoint as string) || '',
      });
      setModal({ type: 'edit', config: fullConfig });
    } catch (err) {
      console.error('Failed to fetch config:', err);
      setError('Failed to load configuration details.');
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      value: '',
      description: '',
      is_sensitive: activeTab === 'api_keys' || activeTab === 'secrets',
      validation_type: activeTab === 'api_keys' ? 'api_key' : 'none',
      default_value: '',
      test_endpoint: '',
    });
  };

  const openCreateModal = () => {
    resetForm();
    setModal({ type: 'create' });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Configuration</h1>
          <p style={styles.subtitle}>Manage API keys, secrets, feature flags, and application settings</p>
        </div>
        <button style={styles.createButton} onClick={openCreateModal}>
          + Add Configuration
        </button>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}
      {success && <div style={styles.successMessage}>{success}</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        {(Object.keys(categoryLabels) as ConfigCategory[]).map((category) => (
          <button
            key={category}
            style={{
              ...styles.tab,
              ...(activeTab === category ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(category)}
          >
            {categoryLabels[category]}
            <span style={styles.tabBadge}>
              {configs.filter((c) => c.category === category).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search configurations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Config List */}
      <div style={styles.configList}>
        {filteredConfigs.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No configurations found in this category.</p>
            <button style={styles.emptyButton} onClick={openCreateModal}>
              Add your first {categoryLabels[activeTab].toLowerCase()}
            </button>
          </div>
        ) : (
          filteredConfigs.map((config) => (
            <div key={config.config_id} style={styles.configCard}>
              <div style={styles.configHeader}>
                <div style={styles.configInfo}>
                  <h3 style={styles.configKey}>{config.key}</h3>
                  {config.description && (
                    <p style={styles.configDescription}>{config.description}</p>
                  )}
                </div>
                <div style={styles.configBadges}>
                  {config.is_sensitive && (
                    <span style={styles.sensitiveBadge}>Sensitive</span>
                  )}
                  {config.is_encrypted && (
                    <span style={styles.encryptedBadge}>Encrypted</span>
                  )}
                </div>
              </div>

              <div style={styles.configValue}>
                <span style={styles.valueLabel}>Value:</span>
                <code style={styles.valueCode}>
                  {config.is_sensitive && config.value ? '••••••••••••' : config.value || '(empty)'}
                </code>
              </div>

              <div style={styles.configMeta}>
                <span style={styles.metaItem}>
                  Updated: {new Date(config.updated_at).toLocaleString()}
                </span>
                <span style={styles.metaItem}>By: {config.updated_by}</span>
              </div>

              <div style={styles.configActions}>
                <button
                  style={styles.actionButton}
                  onClick={() => openEditModal(config)}
                >
                  Edit
                </button>
                {activeTab === 'api_keys' && (
                  <button
                    style={styles.actionButton}
                    onClick={() => handleTestConnection(config)}
                  >
                    Test
                  </button>
                )}
                <button
                  style={styles.actionButton}
                  onClick={() => handleViewHistory(config)}
                >
                  History
                </button>
                <button
                  style={styles.deleteButton}
                  onClick={() => setModal({ type: 'delete', config })}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(modal.type === 'create' || modal.type === 'edit') && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>
              {modal.type === 'create' ? 'Create Configuration' : 'Edit Configuration'}
            </h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Key</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                style={styles.input}
                placeholder="e.g., ANTHROPIC_API_KEY"
                disabled={modal.type === 'edit'}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Value</label>
              <input
                type={formData.is_sensitive ? 'password' : 'text'}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                style={styles.input}
                placeholder="Enter value"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={styles.textarea}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_sensitive}
                    onChange={(e) => setFormData({ ...formData, is_sensitive: e.target.checked })}
                    style={styles.checkbox}
                  />
                  <span>Sensitive Value (will be encrypted)</span>
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Validation Type</label>
                <select
                  value={formData.validation_type}
                  onChange={(e) =>
                    setFormData({ ...formData, validation_type: e.target.value as ValidationType })
                  }
                  style={styles.select}
                >
                  {Object.entries(validationTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeTab === 'api_keys' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Test Endpoint (optional)</label>
                <input
                  type="url"
                  value={formData.test_endpoint}
                  onChange={(e) => setFormData({ ...formData, test_endpoint: e.target.value })}
                  style={styles.input}
                  placeholder="https://api.example.com/health"
                />
                <p style={styles.helpText}>
                  Endpoint to test API key connectivity
                </p>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Default Value (optional)</label>
              <input
                type="text"
                value={formData.default_value}
                onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                style={styles.input}
                placeholder="Fallback value"
              />
            </div>

            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setModal({ type: null })}>
                Cancel
              </button>
              <button
                style={styles.saveButton}
                onClick={modal.type === 'create' ? handleCreate : handleUpdate}
              >
                {modal.type === 'create' ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal.type === 'delete' && modal.config && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Delete Configuration</h2>
            <p style={styles.deleteWarning}>
              Are you sure you want to delete <strong>{modal.config.key}</strong>?
              This action cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setModal({ type: null })}>
                Cancel
              </button>
              <button style={styles.deleteConfirmButton} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {modal.type === 'history' && modal.config && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: 600 }}>
            <h2 style={styles.modalTitle}>Audit History: {modal.config.key}</h2>
            {historyLoading ? (
              <p style={styles.loadingText}>Loading history...</p>
            ) : history.length === 0 ? (
              <p style={styles.emptyText}>No history available.</p>
            ) : (
              <div style={styles.historyList}>
                {history.map((item) => (
                  <div key={item.audit_id} style={styles.historyItem}>
                    <div style={styles.historyAction}>
                      <span
                        style={{
                          ...styles.historyBadge,
                          backgroundColor:
                            item.action === 'create'
                              ? colors.mist
                              : item.action === 'update'
                              ? '#FEF3C7'
                              : '#FEE2E2',
                          color:
                            item.action === 'create'
                              ? colors.forestGreen
                              : item.action === 'update'
                              ? '#D97706'
                              : '#DC2626',
                        }}
                      >
                        {item.action.toUpperCase()}
                      </span>
                      <span style={styles.historyAdmin}>by {item.admin_id}</span>
                    </div>
                    <span style={styles.historyTime}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setModal({ type: null })}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Connection Modal */}
      {modal.type === 'test' && modal.config && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Test Connection: {modal.config.key}</h2>
            {testLoading ? (
              <div style={styles.testLoading}>
                <div style={styles.spinner} />
                <p>Testing connection...</p>
              </div>
            ) : testResult ? (
              <div style={styles.testResult}>
                <div
                  style={{
                    ...styles.testStatus,
                    backgroundColor: testResult.success ? colors.mist : '#FEE2E2',
                    color: testResult.success ? colors.forestGreen : '#DC2626',
                  }}
                >
                  {testResult.success ? 'SUCCESS' : 'FAILED'}
                </div>
                <p style={styles.testMessage}>{testResult.message}</p>
                {testResult.response_time_ms !== undefined && (
                  <p style={styles.testMeta}>Response time: {testResult.response_time_ms}ms</p>
                )}
                {testResult.status_code !== undefined && (
                  <p style={styles.testMeta}>Status code: {testResult.status_code}</p>
                )}
              </div>
            ) : null}
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setModal({ type: null })}>
                Close
              </button>
              {testResult && (
                <button
                  style={styles.actionButton}
                  onClick={() => handleTestConnection(modal.config!)}
                >
                  Test Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.darkSlateNavy,
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
  },
  createButton: {
    padding: '10px 16px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E7EB',
    borderTopColor: colors.forestGreen,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#6B7280',
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  successMessage: {
    padding: '12px 16px',
    backgroundColor: colors.mist,
    color: colors.forestGreen,
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    borderBottom: '1px solid #E5E7EB',
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6B7280',
    cursor: 'pointer',
    marginBottom: '-1px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tabActive: {
    color: colors.forestGreen,
    borderBottomColor: colors.forestGreen,
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 600,
  },
  searchContainer: {
    marginBottom: '24px',
  },
  searchInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
  },
  configList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  configCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
  },
  configHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  configInfo: {
    flex: 1,
  },
  configKey: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '0 0 4px',
    fontFamily: 'monospace',
  },
  configDescription: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
  },
  configBadges: {
    display: 'flex',
    gap: '8px',
  },
  sensitiveBadge: {
    padding: '4px 8px',
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  encryptedBadge: {
    padding: '4px 8px',
    backgroundColor: colors.mist,
    color: colors.forestGreen,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  configValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  valueLabel: {
    fontSize: '13px',
    color: '#6B7280',
  },
  valueCode: {
    backgroundColor: '#F3F4F6',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'monospace',
    color: colors.darkSlateNavy,
    maxWidth: '400px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  configMeta: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  metaItem: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
  configActions: {
    display: 'flex',
    gap: '8px',
    borderTop: '1px solid #E5E7EB',
    paddingTop: '12px',
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: colors.white,
    color: colors.forestGreen,
    border: `1px solid ${colors.forestGreen}`,
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: colors.white,
    color: '#DC2626',
    border: '1px solid #DC2626',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    border: '1px dashed #E5E7EB',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 16px',
  },
  emptyButton: {
    padding: '10px 16px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '0 0 20px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.darkSlateNavy,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    resize: 'vertical',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    backgroundColor: colors.white,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  helpText: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '10px 16px',
    backgroundColor: colors.white,
    color: '#6B7280',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 16px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  deleteWarning: {
    fontSize: '14px',
    color: '#6B7280',
    lineHeight: 1.6,
  },
  deleteConfirmButton: {
    padding: '10px 16px',
    backgroundColor: '#DC2626',
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  historyList: {
    maxHeight: '400px',
    overflow: 'auto',
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #E5E7EB',
  },
  historyAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  historyBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  historyAdmin: {
    fontSize: '13px',
    color: '#6B7280',
  },
  historyTime: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
  testLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
  },
  testResult: {
    textAlign: 'center',
    padding: '16px',
  },
  testStatus: {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  testMessage: {
    fontSize: '14px',
    color: colors.darkSlateNavy,
    margin: '0 0 8px',
  },
  testMeta: {
    fontSize: '13px',
    color: '#6B7280',
    margin: '4px 0',
  },
};
