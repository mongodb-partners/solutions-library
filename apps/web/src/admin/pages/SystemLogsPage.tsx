/**
 * System Logs page for admin dashboard.
 * Full-featured HTTP request log viewer with filtering and real-time updates.
 */

import React, { useEffect, useState, useCallback } from 'react';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

const levelColors: Record<string, { bg: string; text: string }> = {
  debug: { bg: '#E5E7EB', text: '#6B7280' },
  info: { bg: '#DBEAFE', text: '#1D4ED8' },
  warning: { bg: '#FEF3C7', text: '#D97706' },
  error: { bg: '#FEE2E2', text: '#DC2626' },
  critical: { bg: '#FDE8E8', text: '#991B1B' },
};

interface LogEntry {
  log_id: string;
  timestamp: string;
  level: string;
  message: string;
  service: string;
  request_id?: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  ip_address?: string;
  user_agent?: string;
  admin_id?: string;
  error_type?: string;
  error_message?: string;
  extra?: Record<string, unknown>;
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ErrorAgg {
  error_type: string;
  count: number;
  last_occurrence: string;
  sample_message?: string;
  sample_endpoint?: string;
}

export function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'errors'>('logs');

  // Filters
  const [filters, setFilters] = useState({
    level: '',
    method: '',
    endpoint: '',
    search: '',
    hasError: '',
  });

  // Error aggregations
  const [errorAggs, setErrorAggs] = useState<ErrorAgg[]>([]);
  const [errorLoading, setErrorLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      if (filters.level) params.append('level', filters.level);
      if (filters.method) params.append('method', filters.method);
      if (filters.endpoint) params.append('endpoint', filters.endpoint);
      if (filters.search) params.append('search', filters.search);
      if (filters.hasError === 'true') params.append('has_error', 'true');
      else if (filters.hasError === 'false') params.append('has_error', 'false');

      const response = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data: LogsResponse = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  const fetchErrorAggs = useCallback(async () => {
    try {
      setErrorLoading(true);
      const response = await fetch('/api/admin/logs/errors/aggregate?hours=24', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch error aggregations');
      }

      const data = await response.json();
      setErrorAggs(data.errors || []);
    } catch (err) {
      console.error('Failed to fetch error aggregations:', err);
    } finally {
      setErrorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else {
      fetchErrorAggs();
    }
  }, [activeTab, fetchLogs, fetchErrorAggs]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && activeTab === 'logs') {
      const interval = setInterval(fetchLogs, autoRefresh * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchLogs, activeTab]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('max_records', '1000');
      if (filters.level) params.append('level', filters.level);
      if (filters.method) params.append('method', filters.method);
      if (filters.endpoint) params.append('endpoint', filters.endpoint);

      const response = await fetch(`/api/admin/logs/export/json?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export logs.');
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const formatDuration = (ms?: number) => {
    if (ms === undefined || ms === null) return '-';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading && logs.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>System Logs</h1>
          <p style={styles.subtitle}>View and analyze HTTP request logs</p>
        </div>
        <div style={styles.headerActions}>
          <select
            value={autoRefresh || ''}
            onChange={(e) => setAutoRefresh(e.target.value ? parseInt(e.target.value) : null)}
            style={styles.select}
          >
            <option value="">Auto-refresh: Off</option>
            <option value="5">Every 5s</option>
            <option value="10">Every 10s</option>
            <option value="30">Every 30s</option>
          </select>
          <button style={styles.exportButton} onClick={handleExport}>
            Export JSON
          </button>
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'logs' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('logs')}
        >
          Request Logs
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'errors' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('errors')}
        >
          Error Summary
        </button>
      </div>

      {activeTab === 'logs' && (
        <>
          {/* Filters */}
          <div style={styles.filters}>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={filters.method}
              onChange={(e) => handleFilterChange('method', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <select
              value={filters.hasError}
              onChange={(e) => handleFilterChange('hasError', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Requests</option>
              <option value="true">Errors Only</option>
              <option value="false">Successful Only</option>
            </select>

            <input
              type="text"
              placeholder="Search endpoint or message..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={styles.searchInput}
            />

            <button
              style={styles.refreshButton}
              onClick={fetchLogs}
              title="Refresh"
            >
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div style={styles.stats}>
            <span>Total: {total} logs</span>
            <span>Page {page} of {totalPages}</span>
          </div>

          {/* Log Table */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Level</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Endpoint</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <React.Fragment key={log.log_id}>
                    <tr
                      style={{
                        ...styles.tr,
                        ...(expandedLog === log.log_id ? styles.trExpanded : {}),
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        setExpandedLog(expandedLog === log.log_id ? null : log.log_id)
                      }
                    >
                      <td style={styles.td}>
                        <span style={styles.timestamp}>{formatTimestamp(log.timestamp)}</span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.levelBadge,
                            backgroundColor: levelColors[log.level]?.bg || '#E5E7EB',
                            color: levelColors[log.level]?.text || '#6B7280',
                          }}
                        >
                          {log.level.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.method}>{log.method || '-'}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.endpoint}>{log.endpoint || '-'}</span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusCode,
                            color:
                              log.status_code && log.status_code >= 500
                                ? '#DC2626'
                                : log.status_code && log.status_code >= 400
                                ? '#D97706'
                                : colors.forestGreen,
                          }}
                        >
                          {log.status_code || '-'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.duration}>{formatDuration(log.duration_ms)}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.ip}>{log.ip_address || '-'}</span>
                      </td>
                    </tr>
                    {expandedLog === log.log_id && (
                      <tr>
                        <td colSpan={7} style={styles.expandedContent}>
                          <div style={styles.expandedGrid}>
                            <div style={styles.expandedField}>
                              <span style={styles.expandedLabel}>Request ID</span>
                              <span style={styles.expandedValue}>{log.request_id || '-'}</span>
                            </div>
                            <div style={styles.expandedField}>
                              <span style={styles.expandedLabel}>Admin ID</span>
                              <span style={styles.expandedValue}>{log.admin_id || '-'}</span>
                            </div>
                            <div style={styles.expandedField}>
                              <span style={styles.expandedLabel}>User Agent</span>
                              <span style={styles.expandedValue}>
                                {log.user_agent?.substring(0, 100) || '-'}
                              </span>
                            </div>
                            {log.error_type && (
                              <div style={styles.expandedField}>
                                <span style={styles.expandedLabel}>Error Type</span>
                                <span style={{ ...styles.expandedValue, color: '#DC2626' }}>
                                  {log.error_type}
                                </span>
                              </div>
                            )}
                            {log.error_message && (
                              <div style={{ ...styles.expandedField, gridColumn: '1 / -1' }}>
                                <span style={styles.expandedLabel}>Error Message</span>
                                <pre style={styles.errorPre}>{log.error_message}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={styles.pagination}>
            <button
              style={styles.pageButton}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              style={styles.pageButton}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}

      {activeTab === 'errors' && (
        <div style={styles.errorsTab}>
          <p style={styles.errorsSummary}>
            Error aggregation for the last 24 hours
          </p>
          {errorLoading ? (
            <p style={styles.loadingText}>Loading error summary...</p>
          ) : errorAggs.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No errors in the last 24 hours</p>
            </div>
          ) : (
            <div style={styles.errorList}>
              {errorAggs.map((err, idx) => (
                <div key={idx} style={styles.errorCard}>
                  <div style={styles.errorHeader}>
                    <span style={styles.errorType}>{err.error_type}</span>
                    <span style={styles.errorCount}>{err.count} occurrences</span>
                  </div>
                  <div style={styles.errorMeta}>
                    <span>Last: {formatTimestamp(err.last_occurrence)}</span>
                    {err.sample_endpoint && <span>Endpoint: {err.sample_endpoint}</span>}
                  </div>
                  {err.sample_message && (
                    <p style={styles.errorSample}>{err.sample_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
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
  headerActions: {
    display: 'flex',
    gap: '12px',
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
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '8px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    backgroundColor: colors.white,
  },
  exportButton: {
    padding: '8px 16px',
    backgroundColor: colors.white,
    color: colors.forestGreen,
    border: `1px solid ${colors.forestGreen}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '13px',
    color: '#6B7280',
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
    padding: '12px 16px',
    textAlign: 'left',
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
  trExpanded: {
    backgroundColor: '#F9FAFB',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: colors.darkSlateNavy,
    verticalAlign: 'middle',
  },
  timestamp: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#6B7280',
  },
  levelBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  method: {
    fontFamily: 'monospace',
    fontWeight: 600,
    fontSize: '12px',
  },
  endpoint: {
    fontFamily: 'monospace',
    fontSize: '12px',
    maxWidth: '250px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  },
  statusCode: {
    fontWeight: 600,
    fontSize: '13px',
  },
  duration: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#6B7280',
  },
  ip: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#6B7280',
  },
  expandedContent: {
    backgroundColor: '#F9FAFB',
    padding: '16px',
  },
  expandedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  expandedField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  expandedLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  expandedValue: {
    fontSize: '13px',
    color: colors.darkSlateNavy,
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  errorPre: {
    margin: 0,
    padding: '8px',
    backgroundColor: '#FEE2E2',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    color: '#DC2626',
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
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6B7280',
  },
  errorsTab: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    padding: '24px',
  },
  errorsSummary: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6B7280',
  },
  errorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  errorCard: {
    padding: '16px',
    backgroundColor: '#FEF2F2',
    borderRadius: '8px',
    borderLeft: '4px solid #DC2626',
  },
  errorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  errorType: {
    fontWeight: 600,
    color: '#DC2626',
  },
  errorCount: {
    fontSize: '14px',
    color: '#6B7280',
  },
  errorMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '8px',
  },
  errorSample: {
    fontSize: '13px',
    color: '#991B1B',
    margin: 0,
    fontFamily: 'monospace',
  },
};
