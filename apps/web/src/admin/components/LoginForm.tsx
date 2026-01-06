/**
 * Admin login form component.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  forestGreen: '#00684A',
  springGreen: '#00ED64',
  mist: '#E3FCF7',
  white: '#FFFFFF',
};

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!username.trim()) {
      setLocalError('Username is required');
      return;
    }

    if (!password) {
      setLocalError('Password is required');
      return;
    }

    try {
      await login({ username: username.trim(), password });
      onSuccess?.();
    } catch {
      // Error is handled by auth context
    }
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {displayError && (
        <div style={styles.errorBox}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={styles.errorIcon}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>{displayError}</span>
        </div>
      )}

      <div style={styles.field}>
        <label htmlFor="username" style={styles.label}>
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
          placeholder="Enter your username"
          disabled={isLoading}
          autoComplete="username"
          autoFocus
        />
      </div>

      <div style={styles.field}>
        <label htmlFor="password" style={styles.label}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          placeholder="Enter your password"
          disabled={isLoading}
          autoComplete="current-password"
        />
      </div>

      <button type="submit" style={styles.submitButton} disabled={isLoading}>
        {isLoading ? (
          <span style={styles.buttonContent}>
            <span style={styles.spinner} />
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      <div style={styles.forgotPasswordContainer}>
        <Link to="/admin/forgot-password" style={styles.forgotPasswordLink}>
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
  },
  errorIcon: {
    flexShrink: 0,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.darkSlateNavy,
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  submitButton: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginTop: '8px',
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: colors.white,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  forgotPasswordContainer: {
    textAlign: 'center',
    marginTop: '8px',
  },
  forgotPasswordLink: {
    color: colors.forestGreen,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
