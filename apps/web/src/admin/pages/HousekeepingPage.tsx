/**
 * Housekeeping Page - Database maintenance and cleanup tasks
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

interface TaskConfig {
  retention_days?: number;
  max_items?: number;
}

interface Task {
  task_id: string;
  name: string;
  description: string;
  task_type: string;
  schedule: string;
  config: TaskConfig;
  is_enabled: boolean;
  last_run: string | null;
  last_status: string;
  last_duration_ms: number | null;
  last_result: string | null;
  next_run: string | null;
}

interface CollectionStats {
  collection_name: string;
  document_count: number;
  storage_size_mb: number;
  avg_document_size_bytes: number;
  index_count: number;
  index_size_mb: number;
}

interface DatabaseStats {
  database_name: string;
  total_collections: number;
  total_documents: number;
  total_storage_mb: number;
  collections: CollectionStats[];
  generated_at: string;
}

type TabType = 'tasks' | 'database';

export function HousekeepingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [runningTask, setRunningTask] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.getHousekeepingTasks();
      setTasks(response.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDbStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stats = await adminApi.getDatabaseStats();
      setDbStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch database stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    } else {
      fetchDbStats();
    }
  }, [activeTab, fetchTasks, fetchDbStats]);

  const handleRunTask = async (taskId: string) => {
    setRunningTask(taskId);
    setError(null);

    try {
      await adminApi.runHousekeepingTask(taskId);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run task');
    } finally {
      setRunningTask(null);
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      await adminApi.updateHousekeepingTask(task.task_id, {
        is_enabled: !task.is_enabled,
      });
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(mb * 1024).toFixed(2)} KB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return colors.forestGreen;
      case 'failed':
        return colors.errorRed;
      case 'running':
        return colors.warningYellow;
      default:
        return colors.slate;
    }
  };

  const renderTasks = () => (
    <div>
      {tasks.map((task) => (
        <div key={task.task_id} style={styles.taskCard}>
          <div style={styles.taskHeader}>
            <div>
              <h3 style={styles.taskName}>{task.name}</h3>
              <p style={styles.taskDescription}>{task.description}</p>
            </div>
            <div style={styles.taskActions}>
              <button
                style={{
                  ...styles.toggleButton,
                  backgroundColor: task.is_enabled ? colors.mist : colors.lightGray,
                  color: task.is_enabled ? colors.forestGreen : colors.slate,
                }}
                onClick={() => handleToggleTask(task)}
              >
                {task.is_enabled ? 'Enabled' : 'Disabled'}
              </button>
              <button
                style={styles.runButton}
                onClick={() => handleRunTask(task.task_id)}
                disabled={runningTask === task.task_id}
              >
                {runningTask === task.task_id ? 'Running...' : 'Run Now'}
              </button>
            </div>
          </div>

          <div style={styles.taskDetails}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Schedule</span>
              <span style={styles.detailValue}>{task.schedule}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Last Run</span>
              <span style={styles.detailValue}>{formatDate(task.last_run)}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Status</span>
              <span style={{ ...styles.detailValue, color: getStatusColor(task.last_status) }}>
                {task.last_status}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Duration</span>
              <span style={styles.detailValue}>{formatDuration(task.last_duration_ms)}</span>
            </div>
            {task.config.retention_days && (
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Retention</span>
                <span style={styles.detailValue}>{task.config.retention_days} days</span>
              </div>
            )}
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Next Run</span>
              <span style={styles.detailValue}>{formatDate(task.next_run)}</span>
            </div>
          </div>

          {task.last_result && (
            <div style={styles.resultBox}>
              <span style={styles.resultLabel}>Last Result:</span> {task.last_result}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderDatabase = () => (
    <div>
      {dbStats && (
        <>
          {/* Overview Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Database</div>
              <div style={styles.statValue}>{dbStats.database_name}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Collections</div>
              <div style={styles.statValue}>{dbStats.total_collections}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Documents</div>
              <div style={styles.statValue}>{dbStats.total_documents.toLocaleString()}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Storage</div>
              <div style={styles.statValue}>{formatBytes(dbStats.total_storage_mb)}</div>
            </div>
          </div>

          {/* Collections Table */}
          <h3 style={styles.sectionTitle}>Collection Details</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Collection</th>
                <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Documents</th>
                <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Storage</th>
                <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Avg Doc Size</th>
                <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Indexes</th>
                <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Index Size</th>
              </tr>
            </thead>
            <tbody>
              {dbStats.collections.map((coll, index) => (
                <tr key={coll.collection_name} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                  <td style={{ ...styles.tableCell, fontWeight: 500 }}>{coll.collection_name}</td>
                  <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                    {coll.document_count.toLocaleString()}
                  </td>
                  <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                    {formatBytes(coll.storage_size_mb)}
                  </td>
                  <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                    {coll.avg_document_size_bytes.toFixed(0)} B
                  </td>
                  <td style={{ ...styles.tableCell, textAlign: 'right' }}>{coll.index_count}</td>
                  <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                    {formatBytes(coll.index_size_mb)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={styles.generatedAt}>
            Generated at: {formatDate(dbStats.generated_at)}
          </p>
        </>
      )}
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Housekeeping</h1>
          <p style={styles.subtitle}>Database maintenance and cleanup tasks</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button style={styles.dismissButton} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'tasks' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('tasks')}
        >
          Maintenance Tasks
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'database' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('database')}
        >
          Database Stats
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : (
          <>
            {activeTab === 'tasks' && renderTasks()}
            {activeTab === 'database' && renderDatabase()}
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
  errorBanner: {
    backgroundColor: '#FDECEA',
    color: colors.errorRed,
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: colors.errorRed,
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
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskName: {
    fontSize: 18,
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: 0,
  },
  taskDescription: {
    color: colors.slate,
    fontSize: 14,
    margin: '4px 0 0 0',
  },
  taskActions: {
    display: 'flex',
    gap: 8,
  },
  toggleButton: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  runButton: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  taskDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.slate,
  },
  detailValue: {
    fontSize: 14,
    color: colors.darkSlateNavy,
    fontWeight: 500,
  },
  resultBox: {
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 4,
    fontSize: 13,
    color: colors.slate,
  },
  resultLabel: {
    fontWeight: 500,
    color: colors.darkSlateNavy,
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
    fontSize: 24,
    fontWeight: 600,
    color: colors.darkSlateNavy,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: colors.darkSlateNavy,
    marginBottom: 16,
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
  generatedAt: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'right',
  },
};
