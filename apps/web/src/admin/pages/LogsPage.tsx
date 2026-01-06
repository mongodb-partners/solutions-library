/**
 * Authentication Logs page for admin dashboard.
 * Shows paginated auth events with filtering.
 */

import React, { useEffect, useState } from 'react';
import { adminApi } from '../services';
import type { LogEntry } from '../types';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

const eventTypeColors: Record<string, { bg: string; text: string }> = {
  login_success: { bg: '#D1FAE5', text: '#065F46' },
  login_failed: { bg: '#FEE2E2', text: '#DC2626' },
  logout: { bg: '#F3F4F6', text: '#6B7280' },
  token_refresh: { bg: '#DBEAFE', text: '#1D4ED8' },
  password_change: { bg: '#FEF3C7', text: '#D97706' },
  lockout: { bg: '#FEE2E2', text: '#DC2626' },
};

const eventTypes = [
  { value: '', label: 'All Events' },
  { value: 'login_success', label: 'Login Success' },
  { value: 'login_failed', label: 'Login Failed' },
  { value: 'logout', label: 'Logout' },
  { value: 'token_refresh', label: 'Token Refresh' },
  { value: 'password_change', label: 'Password Change' },
  { value: 'lockout', label: 'Account Lockout' },
];

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, eventTypeFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getLogs({
        event_type: eventTypeFilter || undefined,
        username: usernameFilter || undefined,
        page,
        page_size: 25,
      });
      setLogs(data.logs);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to load logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const truncateUserAgent = (ua: string, maxLength = 50) => {
    if (ua.length <= maxLength) return ua;
    return ua.substring(0, maxLength) + '...';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Authentication Logs</h1>
          <p style={styles.subtitle}>
            View and filter authentication events
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Event Type</label>
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value);
              setPage(1);
            }}
            style={styles.select}
          >
            {eventTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Username</label>
          <div style={styles.searchGroup}>
            <input
              type="text"
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              placeholder="Filter by username..."
              style={styles.input}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button style={styles.searchButton} onClick={handleSearch}>
              Search
            </button>
          </div>
        </div>

        <div style={styles.totalCount}>
          <strong>{total}</strong> events found
        </div>
      </div>

      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div style={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#D1D5DB">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
          <h3 style={styles.emptyTitle}>No logs found</h3>
          <p style={styles.emptyText}>No authentication events match your filters.</p>
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Event</th>
                  <th style={styles.th}>Username</th>
                  <th style={styles.th}>IP Address</th>
                  <th style={styles.th}>User Agent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.event_id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.timestamp}>
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.eventBadge,
                          backgroundColor: eventTypeColors[log.event_type]?.bg || '#F3F4F6',
                          color: eventTypeColors[log.event_type]?.text || '#6B7280',
                        }}
                      >
                        {formatEventType(log.event_type)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.username}>{log.username}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.ipAddress}>{log.ip_address}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.userAgent} title={log.user_agent}>
                        {truncateUserAgent(log.user_agent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={styles.pagination}>
            <button
              style={{
                ...styles.pageButton,
                opacity: page === 1 ? 0.5 : 1,
              }}
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              style={{
                ...styles.pageButton,
                opacity: page === totalPages ? 0.5 : 1,
              }}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </>
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
  filters: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    backgroundColor: colors.white,
    minWidth: '150px',
    cursor: 'pointer',
  },
  searchGroup: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    minWidth: '200px',
  },
  searchButton: {
    padding: '10px 16px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  totalCount: {
    marginLeft: 'auto',
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
    padding: '12px 16px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
  },
  timestamp: {
    color: '#6B7280',
    fontSize: '13px',
  },
  eventBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  username: {
    fontWeight: 500,
  },
  ipAddress: {
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  userAgent: {
    fontSize: '13px',
    color: '#6B7280',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  pageButton: {
    padding: '8px 16px',
    backgroundColor: colors.white,
    color: colors.darkSlateNavy,
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6B7280',
  },
};
