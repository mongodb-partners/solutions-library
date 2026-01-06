/**
 * Analytics page for admin dashboard.
 * Shows solution statistics and auth events.
 */

import React, { useEffect, useState } from 'react';
import { adminApi } from '../services';
import type { AnalyticsData } from '../types';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

// Chart colors
const chartColors = [
  '#00684A', // Forest Green
  '#00ED64', // Spring Green
  '#13AA52', // MongoDB Green
  '#116149', // Dark Green
  '#1C2D38', // Slate
  '#3D7E5C', // Olive Green
  '#5DAF7B', // Light Green
  '#8ECAA6', // Pale Green
];

const statusColors: Record<string, string> = {
  active: '#00684A',
  inactive: '#6B7280',
  'coming-soon': '#F59E0B',
};

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div style={styles.container}>
        <div style={styles.errorMessage}>
          {error || 'Failed to load analytics data.'}
        </div>
      </div>
    );
  }

  // Calculate max for bar charts
  const maxCategory = Math.max(...analytics.solutions_by_category.map(c => c.count), 1);
  const maxPartner = Math.max(...analytics.solutions_by_partner.map(p => p.count), 1);
  const totalSolutions = analytics.solutions_by_status.reduce((sum, s) => sum + s.count, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Analytics</h1>
          <p style={styles.subtitle}>
            Solution statistics and authentication activity
          </p>
        </div>
        <button style={styles.refreshButton} onClick={fetchAnalytics}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Auth Events Summary Cards */}
      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={colors.forestGreen}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div style={styles.summaryContent}>
            <div style={styles.summaryValue}>{analytics.total_logins_24h}</div>
            <div style={styles.summaryLabel}>Logins (24h)</div>
          </div>
        </div>

        <div style={{ ...styles.summaryCard, borderColor: '#DC2626' }}>
          <div style={styles.summaryIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#DC2626">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <div style={styles.summaryContent}>
            <div style={{ ...styles.summaryValue, color: '#DC2626' }}>{analytics.failed_logins_24h}</div>
            <div style={styles.summaryLabel}>Failed Logins (24h)</div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={colors.forestGreen}>
              <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
            </svg>
          </div>
          <div style={styles.summaryContent}>
            <div style={styles.summaryValue}>{totalSolutions}</div>
            <div style={styles.summaryLabel}>Total Solutions</div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={colors.forestGreen}>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
          </div>
          <div style={styles.summaryContent}>
            <div style={styles.summaryValue}>{analytics.solutions_by_category.length}</div>
            <div style={styles.summaryLabel}>Categories</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={styles.chartsGrid}>
        {/* Solutions by Status */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Solutions by Status</h3>
          <div style={styles.statusChart}>
            {analytics.solutions_by_status.map((item, index) => {
              const percentage = totalSolutions > 0 ? (item.count / totalSolutions) * 100 : 0;
              return (
                <div key={item.status} style={styles.statusItem}>
                  <div style={styles.statusHeader}>
                    <span
                      style={{
                        ...styles.statusDot,
                        backgroundColor: statusColors[item.status] || chartColors[index % chartColors.length],
                      }}
                    />
                    <span style={styles.statusLabel}>{item.status}</span>
                    <span style={styles.statusCount}>{item.count}</span>
                  </div>
                  <div style={styles.statusBarContainer}>
                    <div
                      style={{
                        ...styles.statusBar,
                        width: `${percentage}%`,
                        backgroundColor: statusColors[item.status] || chartColors[index % chartColors.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Solutions by Category */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Solutions by Category</h3>
          <div style={styles.barChart}>
            {analytics.solutions_by_category.map((item, index) => (
              <div key={item.category} style={styles.barItem}>
                <div style={styles.barLabel}>{item.category}</div>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${(item.count / maxCategory) * 100}%`,
                      backgroundColor: chartColors[index % chartColors.length],
                    }}
                  />
                  <span style={styles.barValue}>{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Solutions by Partner */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Solutions by Partner</h3>
          <div style={styles.barChart}>
            {analytics.solutions_by_partner.map((item, index) => (
              <div key={item.partner} style={styles.barItem}>
                <div style={styles.barLabel}>{item.partner}</div>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${(item.count / maxPartner) * 100}%`,
                      backgroundColor: chartColors[index % chartColors.length],
                    }}
                  />
                  <span style={styles.barValue}>{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auth Events */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Auth Events (24h)</h3>
          {analytics.auth_events_24h.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No authentication events in the last 24 hours.</p>
            </div>
          ) : (
            <div style={styles.eventsList}>
              {analytics.auth_events_24h.map((item) => (
                <div key={item.event_type} style={styles.eventItem}>
                  <span style={styles.eventType}>{formatEventType(item.event_type)}</span>
                  <span style={styles.eventCount}>{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          Last updated: {new Date(analytics.generated_at).toLocaleString()}
        </p>
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
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: colors.white,
    color: colors.darkSlateNavy,
    border: '1px solid #E5E7EB',
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
    fontSize: '14px',
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  summaryIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: colors.mist,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.darkSlateNavy,
    lineHeight: 1,
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#6B7280',
    marginTop: '4px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '0 0 16px',
  },
  statusChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  statusLabel: {
    fontSize: '14px',
    color: colors.darkSlateNavy,
    textTransform: 'capitalize',
    flex: 1,
  },
  statusCount: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
  },
  statusBarContainer: {
    height: '8px',
    backgroundColor: '#F3F4F6',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  statusBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  barChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  barItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  barLabel: {
    fontSize: '13px',
    color: colors.darkSlateNavy,
  },
  barContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bar: {
    height: '24px',
    borderRadius: '4px',
    minWidth: '4px',
    transition: 'width 0.3s ease',
  },
  barValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  eventItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
  },
  eventType: {
    fontSize: '14px',
    color: colors.darkSlateNavy,
  },
  eventCount: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.forestGreen,
    backgroundColor: colors.mist,
    padding: '4px 10px',
    borderRadius: '12px',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
};
