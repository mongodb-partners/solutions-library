/**
 * Admin sidebar navigation component.
 * Uses MongoDB branding colors.
 */

import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { adminApi } from '../services';
import type { NavItem } from '../types';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

// Simple icon components
const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ),
  apps: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
    </svg>
  ),
  analytics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
    </svg>
  ),
  list: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
    </svg>
  ),
  people: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  ),
  config: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM6.5 9L10 5.5 13.5 9H11v4H9V9H6.5zm11 6L14 18.5 10.5 15H13v-4h2v4h2.5z" />
    </svg>
  ),
  logs: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  ),
  telemetry: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
    </svg>
  ),
  key: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    </svg>
  ),
  housekeeping: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z" />
    </svg>
  ),
};

export function AdminSidebar() {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNav() {
      try {
        const items = await adminApi.getNavigation();
        setNavItems(items);
      } catch (error) {
        console.error('Failed to fetch navigation:', error);
        // Fallback navigation
        setNavItems([
          { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard', enabled: true },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchNav();
  }, []);

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoContainer}>
        <img src="/mongodb-logo-white.png" alt="MongoDB" style={styles.logo} />
        <span style={styles.logoText}>Admin</span>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {loading ? (
          <div style={styles.loadingNav}>Loading...</div>
        ) : (
          navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.enabled ? item.path : '#'}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive && item.enabled ? styles.navItemActive : {}),
                ...(item.enabled ? {} : styles.navItemDisabled),
              })}
              onClick={(e) => !item.enabled && e.preventDefault()}
            >
              <span style={styles.navIcon}>{icons[item.icon] || icons.dashboard}</span>
              <span style={styles.navLabel}>{item.label}</span>
              {!item.enabled && <span style={styles.comingSoon}>Soon</span>}
            </NavLink>
          ))
        )}
      </nav>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>MongoDB Solutions Library</p>
        <p style={styles.version}>Admin v1.0</p>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    height: '100vh',
    backgroundColor: colors.darkSlateNavy,
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logo: {
    height: '32px',
    marginRight: '12px',
  },
  logoText: {
    color: colors.white,
    fontSize: '18px',
    fontWeight: 600,
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    overflowY: 'auto',
  },
  loadingNav: {
    color: 'rgba(255,255,255,0.6)',
    padding: '12px',
    fontSize: '14px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    marginBottom: '4px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  navItemActive: {
    backgroundColor: colors.mist,
    color: colors.forestGreen,
  },
  navItemDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  navIcon: {
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: '14px',
    fontWeight: 500,
    flex: 1,
  },
  comingSoon: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '4px',
    color: 'rgba(255,255,255,0.7)',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '12px',
    margin: 0,
  },
  version: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
    margin: '4px 0 0',
  },
};
