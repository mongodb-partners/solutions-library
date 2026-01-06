/**
 * Solution detail modal component.
 */

import React from 'react';
import type { SolutionDetail } from '../types';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

interface SolutionDetailModalProps {
  solution: SolutionDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: colors.mist, text: colors.forestGreen },
  inactive: { bg: '#FEE2E2', text: '#DC2626' },
  maintenance: { bg: '#FEF3C7', text: '#D97706' },
};

export function SolutionDetailModal({ solution, isOpen, onClose }: SolutionDetailModalProps) {
  if (!isOpen || !solution) return null;

  const status = statusColors[solution.status] || statusColors.active;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.partnerInfo}>
              <img
                src={solution.partner.logo}
                alt={solution.partner.name}
                style={styles.partnerLogo}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span style={styles.partnerName}>{solution.partner.name}</span>
            </div>
            <button style={styles.closeButton} onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
          <h2 style={styles.title}>{solution.name}</h2>
          <div style={styles.badges}>
            {solution.featured && (
              <span style={styles.featuredBadge}>Featured</span>
            )}
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: status.bg,
                color: status.text,
              }}
            >
              {solution.status}
            </span>
            <span style={styles.categoryBadge}>{solution.category}</span>
          </div>
        </div>

        <div style={styles.body}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Description</h3>
            <p style={styles.description}>
              {solution.longDescription || solution.description}
            </p>
          </section>

          {solution.valueProposition && solution.valueProposition.length > 0 && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Value Proposition</h3>
              <ul style={styles.valueList}>
                {solution.valueProposition.map((value, idx) => (
                  <li key={idx} style={styles.valueItem}>
                    <span style={styles.checkIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </span>
                    {value}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Technologies</h3>
            <div style={styles.technologies}>
              {solution.technologies.map((tech) => (
                <span key={tech} style={styles.techBadge}>
                  {tech}
                </span>
              ))}
            </div>
          </section>

          {solution.ports && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Ports</h3>
              <div style={styles.portsGrid}>
                {solution.ports.ui && (
                  <div style={styles.portItem}>
                    <span style={styles.portLabel}>UI Port</span>
                    <span style={styles.portValue}>{solution.ports.ui}</span>
                  </div>
                )}
                {solution.ports.api && (
                  <div style={styles.portItem}>
                    <span style={styles.portLabel}>API Port</span>
                    <span style={styles.portValue}>{solution.ports.api}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Links</h3>
            <div style={styles.links}>
              <a
                href={solution.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.linkButton}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                </svg>
                Open Demo
              </a>
              <a
                href={solution.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.linkButtonSecondary}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Source Code
              </a>
              {solution.partner.website && (
                <a
                  href={solution.partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.linkButtonSecondary}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
                  </svg>
                  Partner Website
                </a>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: '16px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '24px',
    borderBottom: '1px solid #E5E7EB',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  partnerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  partnerLogo: {
    height: '28px',
    width: 'auto',
    maxWidth: '100px',
    objectFit: 'contain',
  },
  partnerName: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: 500,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9CA3AF',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.darkSlateNavy,
    margin: '0 0 12px',
  },
  badges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  featuredBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    backgroundColor: colors.springGreen,
    color: colors.darkSlateNavy,
    borderRadius: '12px',
    fontWeight: 600,
  },
  statusBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  categoryBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    borderRadius: '12px',
    fontWeight: 500,
  },
  body: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '0 0 12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  description: {
    fontSize: '15px',
    color: '#4B5563',
    lineHeight: 1.6,
    margin: 0,
  },
  valueList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  valueItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '14px',
    color: '#4B5563',
  },
  checkIcon: {
    color: colors.forestGreen,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: '2px',
  },
  technologies: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  techBadge: {
    fontSize: '13px',
    padding: '6px 12px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    borderRadius: '8px',
    fontWeight: 500,
  },
  portsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
  },
  portItem: {
    padding: '12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  portLabel: {
    fontSize: '12px',
    color: '#9CA3AF',
    fontWeight: 500,
  },
  portValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
  },
  links: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  linkButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  linkButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
};
