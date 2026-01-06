/**
 * Admin header component with user info and logout.
 */

import React from 'react';
import { useAuth } from '../context';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  forestGreen: '#00684A',
  white: '#FFFFFF',
};

export function AdminHeader() {
  const { admin, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'admin':
        return { bg: '#dbeafe', text: '#1e40af' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const roleColors = admin ? getRoleBadgeColor(admin.role) : { bg: '#f3f4f6', text: '#374151' };

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <h1 style={styles.title}>Admin Dashboard</h1>
      </div>

      <div style={styles.right}>
        {admin && (
          <div style={styles.userInfo}>
            <div style={styles.userDetails}>
              <span style={styles.userName}>{admin.display_name}</span>
              <span
                style={{
                  ...styles.roleBadge,
                  backgroundColor: roleColors.bg,
                  color: roleColors.text,
                }}
              >
                {admin.role.replace('_', ' ')}
              </span>
            </div>
            <button onClick={handleLogout} style={styles.logoutButton}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: '64px',
    backgroundColor: colors.white,
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'fixed',
    top: 0,
    left: '260px',
    right: 0,
    zIndex: 100,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.darkSlateNavy,
  },
  roleBadge: {
    fontSize: '11px',
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: '12px',
    textTransform: 'capitalize',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    color: '#6b7280',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};
