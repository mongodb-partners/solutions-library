/**
 * Settings page for admin dashboard.
 * Only accessible by super_admin users.
 */

import React, { useEffect, useState } from 'react';
import { adminApi } from '../services';
import type { AppSettings, SystemInfo } from '../types';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'system'>('general');

  // Form state
  const [formData, setFormData] = useState({
    app_name: '',
    maintenance_mode: false,
    maintenance_message: '',
    session_timeout_minutes: 60,
    max_failed_login_attempts: 5,
    lockout_duration_minutes: 15,
    require_strong_passwords: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsData, sysInfo] = await Promise.all([
        adminApi.getSettings(),
        adminApi.getSystemInfo(),
      ]);
      setSettings(settingsData);
      setSystemInfo(sysInfo);
      setFormData({
        app_name: settingsData.general.app_name,
        maintenance_mode: settingsData.general.maintenance_mode,
        maintenance_message: settingsData.general.maintenance_message,
        session_timeout_minutes: settingsData.security.session_timeout_minutes,
        max_failed_login_attempts: settingsData.security.max_failed_login_attempts,
        lockout_duration_minutes: settingsData.security.lockout_duration_minutes,
        require_strong_passwords: settingsData.security.require_strong_passwords,
      });
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updated = await adminApi.updateSettings({
        general: {
          app_name: formData.app_name,
          maintenance_mode: formData.maintenance_mode,
          maintenance_message: formData.maintenance_message,
        },
        security: {
          session_timeout_minutes: formData.session_timeout_minutes,
          max_failed_login_attempts: formData.max_failed_login_attempts,
          lockout_duration_minutes: formData.lockout_duration_minutes,
          require_strong_passwords: formData.require_strong_passwords,
        },
      });

      setSettings(updated);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const reset = await adminApi.resetSettings();
      setSettings(reset);
      setFormData({
        app_name: reset.general.app_name,
        maintenance_mode: reset.general.maintenance_mode,
        maintenance_message: reset.general.maintenance_message,
        session_timeout_minutes: reset.security.session_timeout_minutes,
        max_failed_login_attempts: reset.security.max_failed_login_attempts,
        lockout_duration_minutes: reset.security.lockout_duration_minutes,
        require_strong_passwords: reset.security.require_strong_passwords,
      });
      setSuccess('Settings reset to defaults!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to reset settings:', err);
      setError('Failed to reset settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>
            Configure application settings and security options
          </p>
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}
      {success && <div style={styles.successMessage}>{success}</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'general' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'security' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'system' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('system')}
        >
          System Info
        </button>
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'general' && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>General Settings</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Application Name</label>
              <input
                type="text"
                value={formData.app_name}
                onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                style={styles.input}
                placeholder="Enter application name"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.maintenance_mode}
                  onChange={(e) => setFormData({ ...formData, maintenance_mode: e.target.checked })}
                  style={styles.checkbox}
                />
                <span>Maintenance Mode</span>
              </label>
              <p style={styles.helpText}>
                When enabled, users will see a maintenance message instead of the application.
              </p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Maintenance Message</label>
              <textarea
                value={formData.maintenance_message}
                onChange={(e) => setFormData({ ...formData, maintenance_message: e.target.value })}
                style={styles.textarea}
                placeholder="Enter maintenance message"
                rows={3}
              />
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Security Settings</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Session Timeout (minutes)</label>
              <input
                type="number"
                value={formData.session_timeout_minutes}
                onChange={(e) => setFormData({ ...formData, session_timeout_minutes: parseInt(e.target.value) || 60 })}
                style={styles.input}
                min={5}
                max={1440}
              />
              <p style={styles.helpText}>
                How long until an inactive session expires (5-1440 minutes).
              </p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Max Failed Login Attempts</label>
              <input
                type="number"
                value={formData.max_failed_login_attempts}
                onChange={(e) => setFormData({ ...formData, max_failed_login_attempts: parseInt(e.target.value) || 5 })}
                style={styles.input}
                min={3}
                max={20}
              />
              <p style={styles.helpText}>
                Number of failed attempts before account lockout (3-20).
              </p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Lockout Duration (minutes)</label>
              <input
                type="number"
                value={formData.lockout_duration_minutes}
                onChange={(e) => setFormData({ ...formData, lockout_duration_minutes: parseInt(e.target.value) || 15 })}
                style={styles.input}
                min={5}
                max={1440}
              />
              <p style={styles.helpText}>
                How long accounts are locked after too many failed attempts (5-1440 minutes).
              </p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.require_strong_passwords}
                  onChange={(e) => setFormData({ ...formData, require_strong_passwords: e.target.checked })}
                  style={styles.checkbox}
                />
                <span>Require Strong Passwords</span>
              </label>
              <p style={styles.helpText}>
                Passwords must contain uppercase, lowercase, and digits.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'system' && systemInfo && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>System Information</h2>

            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>App Version</span>
                <span style={styles.infoValue}>{systemInfo.app_version}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Environment</span>
                <span style={styles.infoValue}>{systemInfo.environment}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Database</span>
                <span style={styles.infoValue}>
                  {systemInfo.database.name}
                  <span style={{
                    marginLeft: 8,
                    color: systemInfo.database.connected ? colors.forestGreen : '#DC2626',
                  }}>
                    ({systemInfo.database.connected ? 'Connected' : 'Disconnected'})
                  </span>
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Platform</span>
                <span style={styles.infoValue}>{systemInfo.platform}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Python Version</span>
                <span style={styles.infoValue}>{systemInfo.python_version.split(' ')[0]}</span>
              </div>
            </div>

            <h3 style={styles.sectionTitle}>Enabled Features</h3>
            <div style={styles.featuresGrid}>
              {Object.entries(systemInfo.features).map(([feature, enabled]) => (
                <div key={feature} style={styles.featureItem}>
                  <span style={{
                    ...styles.featureStatus,
                    backgroundColor: enabled ? colors.mist : '#FEE2E2',
                    color: enabled ? colors.forestGreen : '#DC2626',
                  }}>
                    {enabled ? '✓' : '✗'}
                  </span>
                  <span style={styles.featureName}>
                    {feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>

            {settings?.updated_at && (
              <p style={styles.lastUpdated}>
                Last updated: {new Date(settings.updated_at).toLocaleString()}
                {settings.updated_by && ` by ${settings.updated_by}`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {activeTab !== 'system' && (
        <div style={styles.actions}>
          <button
            style={styles.resetButton}
            onClick={handleReset}
            disabled={saving}
          >
            Reset to Defaults
          </button>
          <button
            style={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
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
  },
  tabActive: {
    color: colors.forestGreen,
    borderBottomColor: colors.forestGreen,
  },
  tabContent: {
    marginBottom: '24px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #E5E7EB',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '0 0 24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.darkSlateNavy,
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
  },
  textarea: {
    width: '100%',
    maxWidth: '600px',
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    resize: 'vertical',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.darkSlateNavy,
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  helpText: {
    fontSize: '13px',
    color: '#6B7280',
    marginTop: '6px',
    marginLeft: '26px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: '14px',
    color: colors.darkSlateNavy,
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '24px 0 16px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  featureStatus: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
  },
  featureName: {
    fontSize: '14px',
    color: colors.darkSlateNavy,
  },
  lastUpdated: {
    fontSize: '13px',
    color: '#6B7280',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #E5E7EB',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: colors.white,
    color: '#DC2626',
    border: '1px solid #DC2626',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
