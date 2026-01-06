/**
 * Admin dashboard page with metrics overview.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetricCard, MetricIcons } from '../components';
import { adminApi } from '../services';
import { useAuth } from '../context';
import type { DashboardStats } from '../types';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  forestGreen: '#00684A',
  springGreen: '#00ED64',
  mist: '#E3FCF7',
};

export function DashboardPage() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await adminApi.getDashboardStats();
        setStats(data);
      } catch (err) {
        setError('Failed to load dashboard statistics');
        console.error('Dashboard stats error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div style={styles.container}>
      {/* Welcome Section */}
      <div style={styles.welcomeSection}>
        <h1 style={styles.welcomeTitle}>
          Welcome back, {admin?.display_name || 'Admin'}
        </h1>
        <p style={styles.welcomeSubtitle}>
          Here&apos;s an overview of the Partner Solutions Library
        </p>
      </div>

      {/* Metrics Grid */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading dashboard...</p>
        </div>
      ) : error ? (
        <div style={styles.errorBox}>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={styles.retryButton}
          >
            Retry
          </button>
        </div>
      ) : stats ? (
        <>
          <div style={styles.metricsGrid}>
            <MetricCard
              title="Total Solutions"
              value={stats.total_solutions}
              icon={MetricIcons.solutions}
              color="green"
            />
            <MetricCard
              title="Active Solutions"
              value={stats.active_solutions}
              icon={MetricIcons.active}
              color="blue"
            />
            <MetricCard
              title="Partners"
              value={stats.total_partners}
              icon={MetricIcons.partners}
              color="purple"
            />
            <MetricCard
              title="Categories"
              value={stats.total_categories}
              icon={MetricIcons.categories}
              color="orange"
            />
          </div>

          {/* Quick Access Section */}
          <div style={styles.quickAccessSection}>
            <h2 style={styles.sectionTitle}>Quick Access</h2>
            <div style={styles.quickAccessGrid}>
              <div
                style={styles.quickAccessCard}
                onClick={() => navigate('/admin/solutions')}
                onMouseOver={(e) => e.currentTarget.style.borderColor = colors.forestGreen}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div style={styles.quickAccessIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
                  </svg>
                </div>
                <h3 style={styles.quickAccessTitle}>Solutions</h3>
                <p style={styles.quickAccessDesc}>
                  Enable/disable solutions, manage status and demo configurations
                </p>
              </div>

              <div
                style={styles.quickAccessCard}
                onClick={() => navigate('/admin/logs')}
                onMouseOver={(e) => e.currentTarget.style.borderColor = colors.forestGreen}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div style={styles.quickAccessIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                </div>
                <h3 style={styles.quickAccessTitle}>System Logs</h3>
                <p style={styles.quickAccessDesc}>
                  View HTTP request logs, filter by level, and export data
                </p>
              </div>

              <div
                style={styles.quickAccessCard}
                onClick={() => navigate('/admin/telemetry')}
                onMouseOver={(e) => e.currentTarget.style.borderColor = colors.forestGreen}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div style={styles.quickAccessIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
                  </svg>
                </div>
                <h3 style={styles.quickAccessTitle}>Telemetry</h3>
                <p style={styles.quickAccessDesc}>
                  Usage statistics, response times, and API analytics
                </p>
              </div>

              <div
                style={styles.quickAccessCard}
                onClick={() => navigate('/admin/configuration')}
                onMouseOver={(e) => e.currentTarget.style.borderColor = colors.forestGreen}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div style={styles.quickAccessIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                  </svg>
                </div>
                <h3 style={styles.quickAccessTitle}>Configuration</h3>
                <p style={styles.quickAccessDesc}>
                  Manage feature flags, secrets, and app settings
                </p>
              </div>

              <div
                style={styles.quickAccessCard}
                onClick={() => navigate('/admin/housekeeping')}
                onMouseOver={(e) => e.currentTarget.style.borderColor = colors.forestGreen}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div style={styles.quickAccessIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z" />
                  </svg>
                </div>
                <h3 style={styles.quickAccessTitle}>Housekeeping</h3>
                <p style={styles.quickAccessDesc}>
                  Database maintenance tasks and storage statistics
                </p>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div style={styles.footer}>
            <p style={styles.lastUpdated}>
              Last updated: {new Date(stats.last_updated).toLocaleString()}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  welcomeSection: {
    marginBottom: '32px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.darkSlateNavy,
    margin: '0 0 8px',
  },
  welcomeSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#6b7280',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e0e0e0',
    borderTopColor: colors.forestGreen,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    color: '#dc2626',
  },
  retryButton: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: colors.forestGreen,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  quickAccessSection: {
    marginTop: '20px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    marginBottom: '20px',
  },
  quickAccessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
  },
  quickAccessCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  quickAccessIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: colors.mist,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.forestGreen,
    marginBottom: '16px',
  },
  quickAccessTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '0 0 8px',
  },
  quickAccessDesc: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
  lastUpdated: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
  },
};
