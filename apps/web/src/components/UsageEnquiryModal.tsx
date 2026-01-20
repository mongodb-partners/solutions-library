/**
 * Usage Enquiry Modal Component
 * Displays a form for capturing user information before launching demos.
 */

import React, { useState } from 'react';
import { submitUsageEnquiry } from '../services/usageEnquiry';

interface UsageEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  solutionId: string;
  solutionName: string;
  demoUrl: string;
}

export function UsageEnquiryModal({
  isOpen,
  onClose,
  solutionId,
  solutionName,
  demoUrl,
}: UsageEnquiryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const launchDemo = () => {
    window.open(demoUrl, '_blank');
    onClose();
  };

  const handleSkip = () => {
    // Record skip event (fire-and-forget, don't block user)
    submitUsageEnquiry({
      name: '',
      email: '',
      company: '',
      role: '',
      solution_id: solutionId,
      solution_name: solutionName,
      skipped: true,
    }).catch(() => {
      // Silently ignore errors for skip tracking
    });
    launchDemo();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.name || !formData.email || !formData.company || !formData.role) {
      setError('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      await submitUsageEnquiry({
        name: formData.name,
        email: formData.email,
        company: formData.company,
        role: formData.role,
        solution_id: solutionId,
        solution_name: solutionName,
      });
      launchDemo();
    } catch {
      setError('Failed to submit. Please try again or skip.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Try {solutionName}</h2>
            <p style={styles.subtitle}>
              Help us understand who's using our demos
            </p>
          </div>
          <button style={styles.closeButton} onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              style={styles.input}
              placeholder="Your full name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              style={styles.input}
              placeholder="your.email@company.com"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              style={styles.input}
              placeholder="Company or organization"
              value={formData.company}
              onChange={handleInputChange}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="role">Role</label>
            <input
              id="role"
              name="role"
              type="text"
              style={styles.input}
              placeholder="Your job title"
              value={formData.role}
              onChange={handleInputChange}
            />
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.skipButton}
              onClick={handleSkip}
            >
              Skip
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(submitting ? styles.submitButtonDisabled : {}),
              }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit & Launch'}
            </button>
          </div>
        </form>
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
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxWidth: 450,
    width: '100%',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
  },
  header: {
    padding: '24px 24px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: '#001E2B',
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9CA3AF',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  form: {
    padding: '20px 24px 24px',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#001E2B',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box' as const,
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
  },
  skipButton: {
    flex: 1,
    padding: '12px 20px',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#001E2B',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: '#00684A',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    cursor: 'not-allowed',
  },
  error: {
    padding: '10px 12px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
};
