/**
 * Solution card component for displaying solution summary.
 * Includes Edit and Delete action buttons.
 */

import React, { useState } from 'react';
import type { SolutionListItem } from '../types';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
  errorRed: '#CF4A4A',
};

interface SolutionCardProps {
  solution: SolutionListItem;
  onClick?: () => void;
  onStatusChange?: (solutionId: string, newStatus: 'active' | 'inactive' | 'coming-soon') => Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: colors.mist, text: colors.forestGreen },
  inactive: { bg: '#FEE2E2', text: '#DC2626' },
  maintenance: { bg: '#FEF3C7', text: '#D97706' },
  'coming-soon': { bg: '#F3F4F6', text: '#6B7280' },
};

export function SolutionCard({ solution, onClick, onStatusChange, onEdit, onDelete }: SolutionCardProps) {
  const [isChanging, setIsChanging] = useState(false);
  const status = statusColors[solution.status] || statusColors.active;

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (!onStatusChange || isChanging) return;

    const newStatus = e.target.value as 'active' | 'inactive' | 'coming-soon';
    if (newStatus === solution.status) return;

    setIsChanging(true);
    try {
      await onStatusChange(solution.id, newStatus);
    } finally {
      setIsChanging(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.header}>
        <div style={styles.partnerInfo}>
          <img
            src={solution.partner_logo}
            alt={solution.partner_name}
            style={styles.partnerLogo}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span style={styles.partnerName}>{solution.partner_name}</span>
        </div>
        <div style={styles.headerRight}>
          {solution.featured && (
            <span style={styles.featuredBadge}>Featured</span>
          )}
          {(onEdit || onDelete) && (
            <div style={styles.actions}>
              {onEdit && (
                <button
                  style={styles.actionButton}
                  onClick={handleEditClick}
                  title="Edit solution"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  style={{ ...styles.actionButton, ...styles.deleteAction }}
                  onClick={handleDeleteClick}
                  title="Delete solution"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <h3 style={styles.title}>{solution.name}</h3>

      <p style={styles.description}>{solution.description}</p>

      <div style={styles.technologies}>
        {solution.technologies.slice(0, 4).map((tech) => (
          <span key={tech} style={styles.techBadge}>
            {tech}
          </span>
        ))}
        {solution.technologies.length > 4 && (
          <span style={styles.techBadge}>+{solution.technologies.length - 4}</span>
        )}
      </div>

      <div style={styles.footer}>
        <span style={styles.category}>{solution.category}</span>
        <div style={styles.footerRight}>
          {onStatusChange ? (
            <select
              value={solution.status}
              onChange={handleStatusChange}
              onClick={(e) => e.stopPropagation()}
              disabled={isChanging}
              style={{
                ...styles.statusSelect,
                backgroundColor: status.bg,
                color: status.text,
                opacity: isChanging ? 0.6 : 1,
              }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="coming-soon">Coming Soon</option>
            </select>
          ) : (
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: status.bg,
                color: status.text,
              }}
            >
              {solution.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  partnerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  partnerLogo: {
    height: '24px',
    width: 'auto',
    maxWidth: '80px',
    objectFit: 'contain',
  },
  partnerName: {
    fontSize: '13px',
    color: '#6B7280',
    fontWeight: 500,
  },
  featuredBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: colors.springGreen,
    color: colors.darkSlateNavy,
    borderRadius: '12px',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
  actionButton: {
    padding: '6px',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  deleteAction: {
    backgroundColor: '#FEE2E2',
    color: colors.errorRed,
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '0 0 8px',
    lineHeight: 1.3,
  },
  description: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 16px',
    lineHeight: 1.5,
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  technologies: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '16px',
  },
  techBadge: {
    fontSize: '11px',
    padding: '3px 8px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    borderRadius: '6px',
    fontWeight: 500,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #E5E7EB',
  },
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  category: {
    fontSize: '12px',
    color: '#9CA3AF',
    fontWeight: 500,
  },
  statusSelect: {
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='%236B7280'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 6px center',
    paddingRight: '20px',
    transition: 'all 0.2s',
  },
  statusBadge: {
    fontSize: '11px',
    padding: '3px 10px',
    borderRadius: '12px',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
};
