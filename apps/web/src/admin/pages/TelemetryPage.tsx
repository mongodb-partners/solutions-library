/**
 * Telemetry Page - Usage Analytics Dashboard
 * Displays usage statistics, response times, and trends.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../services';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
  slate: '#5C6C75',
  lightGray: '#E8EDEB',
  errorRed: '#CF4A4A',
  warningYellow: '#FFC010',
};

interface UsageStats {
  total_events: number;
  total_api_calls: number;
  total_demo_interactions: number;
  total_page_views: number;
  total_tokens_used: number;
  unique_sessions: number;
  avg_response_time_ms: number;
  error_count: number;
  error_rate: number;
}

interface PercentileStats {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

interface TimeSeriesDataPoint {
  timestamp: string;
  count: number;
  avg_duration_ms: number | null;
  tokens_used: number | null;
}

interface TopEndpoint {
  endpoint: string;
  method: string;
  count: number;
  avg_duration_ms: number;
  error_count: number;
  error_rate: number;
}

interface TelemetryEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  partner_demo: string | null;
  solution_id: string | null;
  session_id: string | null;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  duration_ms: number | null;
  tokens_used: number | null;
  model_used: string | null;
}

type TabType = 'overview' | 'endpoints' | 'events';
type TimeRange = 1 | 6 | 24 | 168 | 720;

export function TelemetryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats data
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [percentileStats, setPercentileStats] = useState<PercentileStats | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [topEndpoints, setTopEndpoints] = useState<TopEndpoint[]>([]);
  const [solutionStats, setSolutionStats] = useState<Record<string, number>>({});

  // Events data
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventFilter, setEventFilter] = useState<string>('');

  const fetchOverviewData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, percentilesRes, timeSeriesRes, solutionsRes] = await Promise.all([
        adminApi.getTelemetryStats(timeRange),
        adminApi.getTelemetryPercentiles(timeRange),
        adminApi.getTelemetryUsageOverTime(timeRange, timeRange > 24 ? 'day' : 'hour'),
        adminApi.getTelemetrySolutionStats(timeRange),
      ]);

      setUsageStats(statsRes);
      setPercentileStats(percentilesRes);
      setTimeSeriesData(timeSeriesRes.data || []);
      setSolutionStats(solutionsRes.solutions || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch telemetry data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const fetchEndpointsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await adminApi.getTelemetryTopEndpoints(timeRange, 50);
      setTopEndpoints(res.endpoints || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch endpoints data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const fetchEventsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await adminApi.getTelemetryEvents({
        event_type: eventFilter || undefined,
        page: eventsPage,
        page_size: 50,
      });

      setEvents(res.events || []);
      setEventsTotal(res.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [eventsPage, eventFilter]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewData();
    } else if (activeTab === 'endpoints') {
      fetchEndpointsData();
    } else if (activeTab === 'events') {
      fetchEventsData();
    }
  }, [activeTab, fetchOverviewData, fetchEndpointsData, fetchEventsData]);

  const handleExport = async () => {
    try {
      const blob = await adminApi.exportTelemetry({ max_records: 10000 });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telemetry_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export telemetry');
    }
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null || ms === undefined) return '-';
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const renderOverview = () => (
    <div>
      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Events</div>
          <div style={styles.statValue}>{formatNumber(usageStats?.total_events || 0)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>API Calls</div>
          <div style={styles.statValue}>{formatNumber(usageStats?.total_api_calls || 0)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Page Views</div>
          <div style={styles.statValue}>{formatNumber(usageStats?.total_page_views || 0)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Unique Sessions</div>
          <div style={styles.statValue}>{formatNumber(usageStats?.unique_sessions || 0)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Avg Response Time</div>
          <div style={styles.statValue}>{formatDuration(usageStats?.avg_response_time_ms || 0)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Error Rate</div>
          <div style={{ ...styles.statValue, color: (usageStats?.error_rate || 0) > 5 ? colors.errorRed : colors.forestGreen }}>
            {(usageStats?.error_rate || 0).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Response Time Percentiles */}
      {percentileStats && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Response Time Distribution</h3>
          <div style={styles.percentilesGrid}>
            <div style={styles.percentileCard}>
              <div style={styles.percentileLabel}>P50 (Median)</div>
              <div style={styles.percentileValue}>{formatDuration(percentileStats.p50)}</div>
            </div>
            <div style={styles.percentileCard}>
              <div style={styles.percentileLabel}>P75</div>
              <div style={styles.percentileValue}>{formatDuration(percentileStats.p75)}</div>
            </div>
            <div style={styles.percentileCard}>
              <div style={styles.percentileLabel}>P90</div>
              <div style={styles.percentileValue}>{formatDuration(percentileStats.p90)}</div>
            </div>
            <div style={styles.percentileCard}>
              <div style={styles.percentileLabel}>P95</div>
              <div style={styles.percentileValue}>{formatDuration(percentileStats.p95)}</div>
            </div>
            <div style={styles.percentileCard}>
              <div style={styles.percentileLabel}>P99</div>
              <div style={styles.percentileValue}>{formatDuration(percentileStats.p99)}</div>
            </div>
            <div style={styles.percentileCard}>
              <div style={styles.percentileLabel}>Max</div>
              <div style={styles.percentileValue}>{formatDuration(percentileStats.max)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Over Time Chart */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Usage Over Time</h3>
        <div style={styles.chartContainer}>
          {timeSeriesData.length > 0 ? (
            <div style={styles.barChart}>
              {timeSeriesData.map((point, index) => {
                const maxCount = Math.max(...timeSeriesData.map(d => d.count));
                const height = maxCount > 0 ? (point.count / maxCount) * 100 : 0;
                return (
                  <div
                    key={index}
                    style={styles.barWrapper}
                    title={`${new Date(point.timestamp).toLocaleString()}: ${point.count} events`}
                  >
                    <div
                      style={{
                        ...styles.bar,
                        height: `${height}%`,
                      }}
                    />
                    <div style={styles.barLabel}>{point.count}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyState}>No data available for the selected time range</div>
          )}
        </div>
      </div>

      {/* Solution Stats */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Events by Solution</h3>
        <div style={styles.solutionList}>
          {Object.entries(solutionStats).length > 0 ? (
            Object.entries(solutionStats)
              .sort(([, a], [, b]) => b - a)
              .map(([solution, count]) => (
                <div key={solution} style={styles.solutionItem}>
                  <span style={styles.solutionName}>{solution}</span>
                  <span style={styles.solutionCount}>{formatNumber(count)}</span>
                </div>
              ))
          ) : (
            <div style={styles.emptyState}>No solution data available</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderEndpoints = () => (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Top Endpoints</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>Method</th>
            <th style={styles.tableHeader}>Endpoint</th>
            <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Requests</th>
            <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Avg Time</th>
            <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Errors</th>
            <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Error Rate</th>
          </tr>
        </thead>
        <tbody>
          {topEndpoints.map((endpoint, index) => (
            <tr key={index} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
              <td style={styles.tableCell}>
                <span style={{
                  ...styles.methodBadge,
                  backgroundColor: endpoint.method === 'GET' ? colors.mist :
                    endpoint.method === 'POST' ? '#E3F5FF' :
                    endpoint.method === 'PUT' ? '#FFF4E3' :
                    endpoint.method === 'DELETE' ? '#FFE3E3' : colors.lightGray,
                  color: endpoint.method === 'GET' ? colors.forestGreen :
                    endpoint.method === 'POST' ? '#0066CC' :
                    endpoint.method === 'PUT' ? '#CC7700' :
                    endpoint.method === 'DELETE' ? colors.errorRed : colors.slate,
                }}>
                  {endpoint.method}
                </span>
              </td>
              <td style={{ ...styles.tableCell, fontFamily: 'monospace', fontSize: 13 }}>
                {endpoint.endpoint}
              </td>
              <td style={{ ...styles.tableCell, textAlign: 'right' }}>{formatNumber(endpoint.count)}</td>
              <td style={{ ...styles.tableCell, textAlign: 'right' }}>{formatDuration(endpoint.avg_duration_ms)}</td>
              <td style={{ ...styles.tableCell, textAlign: 'right' }}>{endpoint.error_count}</td>
              <td style={{
                ...styles.tableCell,
                textAlign: 'right',
                color: endpoint.error_rate > 5 ? colors.errorRed : colors.slate,
              }}>
                {endpoint.error_rate.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {topEndpoints.length === 0 && (
        <div style={styles.emptyState}>No endpoint data available</div>
      )}
    </div>
  );

  const renderEvents = () => (
    <div>
      {/* Filter */}
      <div style={styles.filterBar}>
        <select
          style={styles.select}
          value={eventFilter}
          onChange={(e) => {
            setEventFilter(e.target.value);
            setEventsPage(1);
          }}
        >
          <option value="">All Event Types</option>
          <option value="api_call">API Call</option>
          <option value="page_view">Page View</option>
          <option value="demo_interaction">Demo Interaction</option>
          <option value="solution_view">Solution View</option>
          <option value="demo_launch">Demo Launch</option>
          <option value="search">Search</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Events Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>Timestamp</th>
            <th style={styles.tableHeader}>Type</th>
            <th style={styles.tableHeader}>Endpoint</th>
            <th style={styles.tableHeader}>Method</th>
            <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Status</th>
            <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Duration</th>
            <th style={styles.tableHeader}>Solution</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => (
            <tr key={event.event_id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
              <td style={styles.tableCell}>
                {new Date(event.timestamp).toLocaleString()}
              </td>
              <td style={styles.tableCell}>
                <span style={{
                  ...styles.eventTypeBadge,
                  backgroundColor: event.event_type === 'api_call' ? colors.mist :
                    event.event_type === 'page_view' ? '#E3F5FF' :
                    event.event_type === 'error' ? '#FFE3E3' : colors.lightGray,
                }}>
                  {event.event_type}
                </span>
              </td>
              <td style={{ ...styles.tableCell, fontFamily: 'monospace', fontSize: 12 }}>
                {event.endpoint || '-'}
              </td>
              <td style={styles.tableCell}>{event.method || '-'}</td>
              <td style={{
                ...styles.tableCell,
                textAlign: 'right',
                color: event.status_code && event.status_code >= 400 ? colors.errorRed : colors.slate,
              }}>
                {event.status_code || '-'}
              </td>
              <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                {formatDuration(event.duration_ms)}
              </td>
              <td style={styles.tableCell}>{event.solution_id || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {events.length === 0 && (
        <div style={styles.emptyState}>No events found</div>
      )}

      {/* Pagination */}
      {eventsTotal > 50 && (
        <div style={styles.pagination}>
          <button
            style={styles.paginationButton}
            disabled={eventsPage === 1}
            onClick={() => setEventsPage(p => p - 1)}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {eventsPage} of {Math.ceil(eventsTotal / 50)}
          </span>
          <button
            style={styles.paginationButton}
            disabled={eventsPage >= Math.ceil(eventsTotal / 50)}
            onClick={() => setEventsPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Telemetry</h1>
          <p style={styles.subtitle}>Usage analytics and performance metrics</p>
        </div>
        <div style={styles.headerActions}>
          <select
            style={styles.select}
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value) as TimeRange)}
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last 7 Days</option>
            <option value={720}>Last 30 Days</option>
          </select>
          <button style={styles.exportButton} onClick={handleExport}>
            Export JSON
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'endpoints', 'events'] as TabType[]).map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>Loading telemetry data...</div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'endpoints' && renderEndpoints()}
            {activeTab === 'events' && renderEvents()}
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: 0,
  },
  subtitle: {
    color: colors.slate,
    marginTop: 4,
    fontSize: 14,
  },
  headerActions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  select: {
    padding: '8px 12px',
    fontSize: 14,
    border: `1px solid ${colors.lightGray}`,
    borderRadius: 6,
    backgroundColor: colors.white,
    cursor: 'pointer',
  },
  exportButton: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  errorBanner: {
    backgroundColor: '#FDECEA',
    color: colors.errorRed,
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    borderBottom: `1px solid ${colors.lightGray}`,
    marginBottom: 24,
  },
  tab: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: colors.slate,
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: colors.forestGreen,
    borderBottomColor: colors.forestGreen,
  },
  content: {
    minHeight: 400,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    color: colors.slate,
    fontSize: 16,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statLabel: {
    fontSize: 13,
    color: colors.slate,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 600,
    color: colors.darkSlateNavy,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: colors.darkSlateNavy,
    marginBottom: 16,
  },
  percentilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 12,
  },
  percentileCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  percentileLabel: {
    fontSize: 12,
    color: colors.slate,
    marginBottom: 4,
  },
  percentileValue: {
    fontSize: 20,
    fontWeight: 600,
    color: colors.darkSlateNavy,
  },
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    height: 200,
    overflow: 'hidden',
  },
  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    backgroundColor: colors.forestGreen,
    borderRadius: '4px 4px 0 0',
    minHeight: 2,
    transition: 'height 0.3s',
  },
  barLabel: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 4,
  },
  solutionList: {
    backgroundColor: colors.white,
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  solutionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.lightGray}`,
  },
  solutionName: {
    fontWeight: 500,
    color: colors.darkSlateNavy,
  },
  solutionCount: {
    color: colors.slate,
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center',
    padding: 40,
    color: colors.slate,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: colors.white,
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableHeader: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 600,
    color: colors.slate,
    backgroundColor: colors.lightGray,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableCell: {
    padding: '12px 16px',
    fontSize: 14,
    color: colors.darkSlateNavy,
    borderBottom: `1px solid ${colors.lightGray}`,
  },
  tableRowEven: {
    backgroundColor: colors.white,
  },
  tableRowOdd: {
    backgroundColor: '#FAFBFC',
  },
  methodBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  eventTypeBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
  },
  filterBar: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  paginationButton: {
    padding: '8px 16px',
    fontSize: 14,
    backgroundColor: colors.white,
    color: colors.darkSlateNavy,
    border: `1px solid ${colors.lightGray}`,
    borderRadius: 6,
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: 14,
    color: colors.slate,
  },
};
