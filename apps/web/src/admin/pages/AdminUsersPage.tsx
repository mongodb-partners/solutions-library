/**
 * Admin Users management page.
 * Only accessible by super_admin.
 */

import React, { useEffect, useState } from 'react';
import { adminApi, AdminUser, AdminApiError } from '../services';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

const roleColors: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: '#FEE2E2', text: '#DC2626' },
  admin: { bg: colors.mist, text: colors.forestGreen },
  viewer: { bg: '#F3F4F6', text: '#6B7280' },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: colors.mist, text: colors.forestGreen },
  inactive: { bg: '#F3F4F6', text: '#6B7280' },
  locked: { bg: '#FEE2E2', text: '#DC2626' },
};

export function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAdmins();
      setAdmins(response.admins);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
      setError('Failed to load admin users. You may not have permission.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: {
    username: string;
    email: string;
    password: string;
    role: string;
    display_name?: string;
  }) => {
    try {
      await adminApi.createAdmin(data);
      setShowCreateModal(false);
      await fetchAdmins();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        throw new Error(err.detail || err.message);
      }
      throw new Error('Failed to create admin');
    }
  };

  const handleUpdate = async (adminId: string, data: {
    role?: string;
    status?: string;
    display_name?: string;
  }) => {
    try {
      await adminApi.updateAdmin(adminId, data);
      setEditingAdmin(null);
      await fetchAdmins();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        throw new Error(err.detail || err.message);
      }
      throw new Error('Failed to update admin');
    }
  };

  const handleDelete = async (adminId: string) => {
    try {
      await adminApi.deleteAdmin(adminId);
      setShowDeleteConfirm(null);
      await fetchAdmins();
    } catch (err) {
      console.error('Failed to delete admin:', err);
      setError('Failed to delete admin user.');
    }
  };

  const handleUnlock = async (adminId: string) => {
    try {
      await adminApi.unlockAdmin(adminId);
      await fetchAdmins();
    } catch (err) {
      console.error('Failed to unlock admin:', err);
      setError('Failed to unlock admin account.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Users</h1>
          <p style={styles.subtitle}>
            Manage admin accounts and permissions
          </p>
        </div>
        <button style={styles.createButton} onClick={() => setShowCreateModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add Admin
        </button>
      </div>

      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading admin users...</p>
        </div>
      ) : admins.length === 0 ? (
        <div style={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#D1D5DB">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <h3 style={styles.emptyTitle}>No admin users found</h3>
          <p style={styles.emptyText}>Create your first admin user to get started.</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Login</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.admin_id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userInfo}>
                      <div style={styles.avatar}>
                        {(admin.display_name || admin.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={styles.userName}>{admin.display_name || admin.username}</div>
                        <div style={styles.userEmail}>{admin.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: roleColors[admin.role]?.bg || '#F3F4F6',
                        color: roleColors[admin.role]?.text || '#6B7280',
                      }}
                    >
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: statusColors[admin.status]?.bg || '#F3F4F6',
                        color: statusColors[admin.status]?.text || '#6B7280',
                      }}
                    >
                      {admin.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.lastLogin}>
                      {admin.last_login
                        ? new Date(admin.last_login).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => setEditingAdmin(admin)}
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      {admin.status === 'locked' && (
                        <button
                          style={styles.actionButton}
                          onClick={() => handleUnlock(admin.admin_id)}
                          title="Unlock"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z" />
                          </svg>
                        </button>
                      )}
                      <button
                        style={{ ...styles.actionButton, color: '#DC2626' }}
                        onClick={() => setShowDeleteConfirm(admin.admin_id)}
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <AdminModal
          title="Create Admin User"
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (data) => {
            if (!data.username || !data.email || !data.password || !data.role) {
              throw new Error('Please fill in all required fields');
            }
            await handleCreate({
              username: data.username,
              email: data.email,
              password: data.password,
              role: data.role,
              display_name: data.display_name,
            });
          }}
        />
      )}

      {/* Edit Modal */}
      {editingAdmin && (
        <AdminModal
          title="Edit Admin User"
          admin={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onSubmit={(data) => handleUpdate(editingAdmin.admin_id, data)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.confirmModal}>
            <h3 style={styles.confirmTitle}>Delete Admin User?</h3>
            <p style={styles.confirmText}>
              This action cannot be undone. The admin user will be permanently deleted.
            </p>
            <div style={styles.confirmActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                style={styles.deleteButton}
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Admin Modal Component
function AdminModal({
  title,
  admin,
  onClose,
  onSubmit,
}: {
  title: string;
  admin?: AdminUser;
  onClose: () => void;
  onSubmit: (data: {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    status?: string;
    display_name?: string;
  }) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    username: admin?.username || '',
    email: admin?.email || '',
    password: '',
    role: admin?.role || 'viewer',
    status: admin?.status || 'active',
    display_name: admin?.display_name || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!admin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isEdit) {
        await onSubmit({
          role: formData.role,
          status: formData.status,
          display_name: formData.display_name,
        });
      } else {
        if (!formData.username || !formData.email || !formData.password) {
          throw new Error('Please fill in all required fields');
        }
        await onSubmit({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          display_name: formData.display_name || undefined,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{title}</h2>
          <button style={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {error && (
          <div style={styles.modalError}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {!isEdit && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  style={styles.input}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={styles.input}
                  placeholder="Enter email"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={styles.input}
                  placeholder="Enter password (min 8 characters)"
                  minLength={8}
                  required
                />
              </div>
            </>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              style={styles.input}
              placeholder="Enter display name"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={styles.select}
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {isEdit && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={styles.select}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <div style={styles.modalActions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={styles.submitButton} disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
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
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '16px 0 8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
  },
  tableContainer: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  tr: {
    borderBottom: '1px solid #E5E7EB',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '16px',
  },
  userName: {
    fontWeight: 500,
    marginBottom: '2px',
  },
  userEmail: {
    fontSize: '13px',
    color: '#6B7280',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  lastLogin: {
    color: '#6B7280',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px',
    backgroundColor: 'transparent',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: 0,
  },
  closeButton: {
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6B7280',
  },
  modalError: {
    padding: '12px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  formGroup: {
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
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    backgroundColor: colors.white,
    cursor: 'pointer',
    outline: 'none',
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
    color: colors.darkSlateNavy,
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 16px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmModal: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
  },
  confirmTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '0 0 12px',
  },
  confirmText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 24px',
    lineHeight: 1.5,
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  deleteButton: {
    padding: '10px 16px',
    backgroundColor: '#DC2626',
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
