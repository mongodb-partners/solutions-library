/**
 * Admin layout component with sidebar and header.
 * Wraps admin pages with consistent layout.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export function AdminLayout() {
  return (
    <div style={styles.container}>
      <AdminSidebar />
      <div style={styles.mainArea}>
        <AdminHeader />
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  },
  mainArea: {
    flex: 1,
    marginLeft: '260px', // Sidebar width
  },
  content: {
    paddingTop: '64px', // Header height
    padding: '88px 24px 24px', // Top padding includes header + spacing
    minHeight: 'calc(100vh - 64px)',
  },
};
