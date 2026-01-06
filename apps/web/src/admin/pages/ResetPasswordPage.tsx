/**
 * Reset Password page for admin dashboard.
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      return;
    }

    // Verify the token
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/admin/auth/verify-reset-token/${token}`);
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
          setEmail(data.email || '');
        }
      } catch (err) {
        console.error('Token verification error:', err);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <img src="/mongodb-logo.svg" alt="MongoDB" style={{ height: 40 }} />
          </div>

          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#DC2626">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>

            <h1 style={styles.title}>Invalid or Expired Link</h1>

            <p style={styles.errorText}>
              This password reset link is invalid or has expired.
              Please request a new password reset link.
            </p>
          </div>

          <Link to="/admin/forgot-password" style={styles.primaryLink}>
            Request New Link
          </Link>

          <Link to="/admin/login" style={styles.backLink}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <img src="/mongodb-logo.svg" alt="MongoDB" style={{ height: 40 }} />
          </div>

          <div style={styles.successContainer}>
            <div style={styles.successIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill={colors.forestGreen}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>

            <h1 style={styles.title}>Password Reset Successful</h1>

            <p style={styles.successText}>
              Your password has been successfully reset.
              You can now log in with your new password.
            </p>
          </div>

          <button
            style={styles.submitButton}
            onClick={() => navigate('/admin/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <img src="/mongodb-logo.svg" alt="MongoDB" style={{ height: 40 }} />
        </div>

        <h1 style={styles.title}>Reset Password</h1>
        <p style={styles.subtitle}>
          Enter a new password for <strong>{email}</strong>
        </p>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={styles.input}
              required
              minLength={8}
              autoFocus
              disabled={loading}
            />
            <p style={styles.helpText}>Minimum 8 characters</p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={styles.input}
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <Link to="/admin/login" style={styles.backLink}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    padding: '20px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  logo: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.darkSlateNavy,
    margin: '0 0 8px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 24px',
    textAlign: 'center',
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.darkSlateNavy,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    boxSizing: 'border-box',
  },
  helpText: {
    fontSize: '12px',
    color: '#6B7280',
    margin: '4px 0 0',
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: '16px',
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    color: colors.forestGreen,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  primaryLink: {
    display: 'block',
    width: '100%',
    padding: '12px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: '16px',
    textAlign: 'center',
    textDecoration: 'none',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
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
  successContainer: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  successIcon: {
    width: '80px',
    height: '80px',
    backgroundColor: colors.mist,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  successText: {
    fontSize: '14px',
    color: '#6B7280',
    lineHeight: 1.6,
    margin: 0,
  },
  errorContainer: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  errorIcon: {
    width: '80px',
    height: '80px',
    backgroundColor: '#FEE2E2',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  errorText: {
    fontSize: '14px',
    color: '#6B7280',
    lineHeight: 1.6,
    margin: 0,
  },
};
