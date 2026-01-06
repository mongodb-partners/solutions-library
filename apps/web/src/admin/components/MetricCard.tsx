/**
 * Metric card component for dashboard statistics.
 */

import React from 'react';

// MongoDB branding colors
const colors = {
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  darkSlateNavy: '#001E2B',
  mist: '#E3FCF7',
};

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'green' | 'blue' | 'purple' | 'orange';
}

const colorMap = {
  green: { bg: colors.mist, accent: colors.forestGreen },
  blue: { bg: '#dbeafe', accent: '#1d4ed8' },
  purple: { bg: '#ede9fe', accent: '#7c3aed' },
  orange: { bg: '#ffedd5', accent: '#ea580c' },
};

export function MetricCard({ title, value, icon, color = 'green' }: MetricCardProps) {
  const { bg, accent } = colorMap[color];

  return (
    <div style={styles.card}>
      <div style={{ ...styles.iconContainer, backgroundColor: bg }}>
        <span style={{ ...styles.icon, color: accent }}>{icon}</span>
      </div>
      <div style={styles.content}>
        <p style={styles.title}>{title}</p>
        <p style={styles.value}>{value}</p>
      </div>
    </div>
  );
}

// Simple icons for metrics
export const MetricIcons = {
  solutions: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
    </svg>
  ),
  active: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  ),
  partners: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
  categories: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l-5.5 9h11z" />
      <circle cx="17.5" cy="17.5" r="4.5" />
      <path d="M3 13.5h8v8H3z" />
    </svg>
  ),
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  iconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    display: 'flex',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 4px',
  },
  value: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: 0,
  },
};
