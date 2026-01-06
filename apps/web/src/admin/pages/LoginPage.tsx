/**
 * Admin login page.
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components';
import { useAuth } from '../context';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  forestGreen: '#00684A',
  springGreen: '#00ED64',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  const handleLoginSuccess = () => {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin/dashboard';
    navigate(from, { replace: true });
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel}>
        <div style={styles.brandContent}>
          <img src="/mongodb-logo-white.png" alt="MongoDB" style={styles.logo} />
          <h1 style={styles.brandTitle}>Partner Solutions Library</h1>
          <p style={styles.brandSubtitle}>Admin Dashboard</p>

          <div style={styles.features}>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </span>
              <span>Manage partner solutions</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </span>
              <span>View analytics and metrics</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </span>
              <span>Configure dynamic settings</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.loginBox}>
          <div style={styles.loginHeader}>
            <h2 style={styles.loginTitle}>Welcome Back</h2>
            <p style={styles.loginSubtitle}>Sign in to your admin account</p>
          </div>

          <LoginForm onSuccess={handleLoginSuccess} />

          <div style={styles.footer}>
            <a href="/" style={styles.backLink}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
              Back to Solutions Library
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTopColor: colors.forestGreen,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: colors.darkSlateNavy,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  brandContent: {
    maxWidth: '400px',
    color: colors.white,
  },
  logo: {
    height: '48px',
    marginBottom: '24px',
  },
  brandTitle: {
    fontSize: '32px',
    fontWeight: 700,
    margin: '0 0 8px',
  },
  brandSubtitle: {
    fontSize: '18px',
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 40px',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '15px',
    color: 'rgba(255,255,255,0.9)',
  },
  featureIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: colors.forestGreen,
    borderRadius: '50%',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    backgroundColor: '#f9fafb',
  },
  loginBox: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: colors.white,
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 10px 15px rgba(0,0,0,0.1)',
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  loginTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.darkSlateNavy,
    margin: '0 0 8px',
  },
  loginSubtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: 0,
  },
  footer: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '14px',
  },
};
