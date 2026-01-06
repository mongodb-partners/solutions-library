/**
 * Solutions management page for admin dashboard.
 * Supports full CRUD operations: Add, Edit, Delete solutions.
 */

import React, { useEffect, useState } from 'react';
import { adminApi, SolutionCreateRequest, SolutionUpdateRequest } from '../services';
import { SolutionCard, SolutionDetailModal } from '../components';
import type { SolutionListItem, SolutionDetail } from '../types';

// MongoDB branding colors
const colors = {
  darkSlateNavy: '#001E2B',
  springGreen: '#00ED64',
  forestGreen: '#00684A',
  mist: '#E3FCF7',
  white: '#FFFFFF',
  errorRed: '#CF4A4A',
};

type ModalMode = 'view' | 'add' | 'edit';

interface FormData {
  id: string;
  name: string;
  partner_name: string;
  partner_logo: string;
  partner_website: string;
  description: string;
  long_description: string;
  value_proposition: string;
  technologies: string;
  category: string;
  demo_url: string;
  source_url: string;
  documentation: string;
  port_api: string;
  port_ui: string;
  status: 'active' | 'inactive' | 'coming-soon';
  featured: boolean;
}

const emptyForm: FormData = {
  id: '',
  name: '',
  partner_name: '',
  partner_logo: '/logos/placeholder.svg',
  partner_website: '',
  description: '',
  long_description: '',
  value_proposition: '',
  technologies: '',
  category: '',
  demo_url: '',
  source_url: '',
  documentation: '',
  port_api: '',
  port_ui: '',
  status: 'coming-soon',
  featured: false,
};

export function SolutionsPage() {
  const [solutions, setSolutions] = useState<SolutionListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [selectedSolution, setSelectedSolution] = useState<SolutionDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [solutionToDelete, setSolutionToDelete] = useState<SolutionListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSolutions();
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchSolutions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: { category?: string; search?: string } = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;

      const response = await adminApi.getSolutions(params);
      setSolutions(response.solutions);
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to fetch solutions:', err);
      setError('Failed to load solutions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSolutionClick = async (solution: SolutionListItem) => {
    try {
      setLoadingDetail(true);
      setModalMode('view');
      setModalOpen(true);
      const detail = await adminApi.getSolution(solution.id);
      setSelectedSolution(detail);
    } catch (err) {
      console.error('Failed to fetch solution details:', err);
      setError('Failed to load solution details.');
      setModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSolution(null);
    setFormData(emptyForm);
    setModalMode('view');
  };

  const handleAddClick = () => {
    setFormData(emptyForm);
    setModalMode('add');
    setSelectedSolution(null);
    setModalOpen(true);
  };

  const handleEditClick = async (solution: SolutionListItem) => {
    try {
      setLoadingDetail(true);
      setModalMode('edit');
      setModalOpen(true);
      const detail = await adminApi.getSolution(solution.id);
      setSelectedSolution(detail);

      // Populate form with existing data
      setFormData({
        id: detail.id,
        name: detail.name,
        partner_name: detail.partner.name,
        partner_logo: detail.partner.logo,
        partner_website: detail.partner.website || '',
        description: detail.description,
        long_description: detail.longDescription || '',
        value_proposition: (detail.valueProposition || []).join('\n'),
        technologies: (detail.technologies || []).join(', '),
        category: detail.category,
        demo_url: detail.demoUrl || '',
        source_url: detail.sourceUrl || '',
        documentation: detail.documentation || '',
        port_api: detail.ports?.api?.toString() || '',
        port_ui: detail.ports?.ui?.toString() || '',
        status: detail.status as 'active' | 'inactive' | 'coming-soon',
        featured: detail.featured,
      });
    } catch (err) {
      console.error('Failed to fetch solution for editing:', err);
      setError('Failed to load solution for editing.');
      setModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteClick = (solution: SolutionListItem) => {
    setSolutionToDelete(solution);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!solutionToDelete) return;

    try {
      setDeleting(true);
      await adminApi.deleteSolution(solutionToDelete.id);
      setSuccessMessage(`Solution "${solutionToDelete.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSolutionToDelete(null);
      await fetchSolutions();
    } catch (err) {
      console.error('Failed to delete solution:', err);
      setError('Failed to delete solution. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError(null);

    try {
      if (modalMode === 'add') {
        const createData: SolutionCreateRequest = {
          id: formData.id,
          name: formData.name,
          partner_name: formData.partner_name,
          partner_logo: formData.partner_logo || undefined,
          partner_website: formData.partner_website || undefined,
          description: formData.description,
          long_description: formData.long_description || undefined,
          value_proposition: formData.value_proposition
            ? formData.value_proposition.split('\n').filter((v) => v.trim())
            : undefined,
          technologies: formData.technologies
            ? formData.technologies.split(',').map((t) => t.trim()).filter((t) => t)
            : undefined,
          category: formData.category,
          demo_url: formData.demo_url || undefined,
          source_url: formData.source_url || undefined,
          documentation: formData.documentation || undefined,
          port_api: formData.port_api ? parseInt(formData.port_api, 10) : undefined,
          port_ui: formData.port_ui ? parseInt(formData.port_ui, 10) : undefined,
          status: formData.status,
          featured: formData.featured,
        };

        await adminApi.createSolution(createData);
        setSuccessMessage(`Solution "${formData.name}" created successfully`);
      } else if (modalMode === 'edit' && selectedSolution) {
        const updateData: SolutionUpdateRequest = {
          name: formData.name,
          partner_name: formData.partner_name,
          partner_logo: formData.partner_logo || undefined,
          partner_website: formData.partner_website || undefined,
          description: formData.description,
          long_description: formData.long_description || undefined,
          value_proposition: formData.value_proposition
            ? formData.value_proposition.split('\n').filter((v) => v.trim())
            : undefined,
          technologies: formData.technologies
            ? formData.technologies.split(',').map((t) => t.trim()).filter((t) => t)
            : undefined,
          category: formData.category,
          demo_url: formData.demo_url || undefined,
          source_url: formData.source_url || undefined,
          documentation: formData.documentation || undefined,
          port_api: formData.port_api ? parseInt(formData.port_api, 10) : undefined,
          port_ui: formData.port_ui ? parseInt(formData.port_ui, 10) : undefined,
          status: formData.status,
          featured: formData.featured,
        };

        await adminApi.updateSolution(selectedSolution.id, updateData);
        setSuccessMessage(`Solution "${formData.name}" updated successfully`);
      }

      handleCloseModal();
      await fetchSolutions();
    } catch (err: any) {
      console.error('Failed to save solution:', err);
      setError(err.detail || 'Failed to save solution. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusChange = async (
    solutionId: string,
    newStatus: 'active' | 'inactive' | 'coming-soon'
  ) => {
    try {
      await adminApi.updateSolutionStatus(solutionId, newStatus);
      await fetchSolutions();
    } catch (err) {
      console.error('Failed to update solution status:', err);
      setError('Failed to update solution status.');
    }
  };

  const renderForm = () => (
    <form onSubmit={handleFormSubmit} style={styles.form}>
      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Solution ID *</label>
          <input
            type="text"
            value={formData.id}
            onChange={(e) => handleFormChange('id', e.target.value)}
            disabled={modalMode === 'edit'}
            required
            pattern="^[a-z0-9-]+$"
            placeholder="my-solution-id"
            style={{
              ...styles.input,
              backgroundColor: modalMode === 'edit' ? '#f3f4f6' : colors.white,
            }}
          />
          <small style={styles.hint}>Lowercase letters, numbers, hyphens only</small>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            required
            placeholder="My Solution Name"
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Partner Name *</label>
          <input
            type="text"
            value={formData.partner_name}
            onChange={(e) => handleFormChange('partner_name', e.target.value)}
            required
            placeholder="Partner Inc."
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Category *</label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => handleFormChange('category', e.target.value)}
            required
            placeholder="AI/LLM"
            style={styles.input}
            list="categories"
          />
          <datalist id="categories">
            {categories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleFormChange('description', e.target.value)}
          required
          placeholder="Brief description of the solution..."
          style={{ ...styles.input, minHeight: 80 }}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Long Description</label>
        <textarea
          value={formData.long_description}
          onChange={(e) => handleFormChange('long_description', e.target.value)}
          placeholder="Detailed description..."
          style={{ ...styles.input, minHeight: 100 }}
        />
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Technologies</label>
          <input
            type="text"
            value={formData.technologies}
            onChange={(e) => handleFormChange('technologies', e.target.value)}
            placeholder="Python, MongoDB, FastAPI"
            style={styles.input}
          />
          <small style={styles.hint}>Comma-separated list</small>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Value Propositions</label>
          <textarea
            value={formData.value_proposition}
            onChange={(e) => handleFormChange('value_proposition', e.target.value)}
            placeholder="One value per line..."
            style={{ ...styles.input, minHeight: 80 }}
          />
          <small style={styles.hint}>One item per line</small>
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Partner Logo URL</label>
          <input
            type="text"
            value={formData.partner_logo}
            onChange={(e) => handleFormChange('partner_logo', e.target.value)}
            placeholder="/logos/partner.svg"
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Partner Website</label>
          <input
            type="url"
            value={formData.partner_website}
            onChange={(e) => handleFormChange('partner_website', e.target.value)}
            placeholder="https://partner.com"
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Demo URL</label>
          <input
            type="text"
            value={formData.demo_url}
            onChange={(e) => handleFormChange('demo_url', e.target.value)}
            placeholder="http://localhost:8501"
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Source URL</label>
          <input
            type="url"
            value={formData.source_url}
            onChange={(e) => handleFormChange('source_url', e.target.value)}
            placeholder="https://github.com/..."
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>API Port</label>
          <input
            type="number"
            value={formData.port_api}
            onChange={(e) => handleFormChange('port_api', e.target.value)}
            placeholder="8000"
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>UI Port</label>
          <input
            type="number"
            value={formData.port_ui}
            onChange={(e) => handleFormChange('port_ui', e.target.value)}
            placeholder="8501"
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Status</label>
          <select
            value={formData.status}
            onChange={(e) =>
              handleFormChange('status', e.target.value as 'active' | 'inactive' | 'coming-soon')
            }
            style={styles.select}
          >
            <option value="coming-soon">Coming Soon</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => handleFormChange('featured', e.target.checked)}
              style={styles.checkbox}
            />
            Featured Solution
          </label>
        </div>
      </div>

      <div style={styles.formActions}>
        <button type="button" onClick={handleCloseModal} style={styles.cancelButton}>
          Cancel
        </button>
        <button type="submit" disabled={formSubmitting} style={styles.submitButton}>
          {formSubmitting ? 'Saving...' : modalMode === 'add' ? 'Create Solution' : 'Save Changes'}
        </button>
      </div>
    </form>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Solutions</h1>
          <p style={styles.subtitle}>Manage partner solutions and configurations</p>
        </div>
        <button style={styles.addButton} onClick={handleAddClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add Solution
        </button>
      </div>

      {/* Success Message */}
      {successMessage && <div style={styles.successMessage}>{successMessage}</div>}

      {/* Error Message */}
      {error && (
        <div style={styles.errorMessage}>
          {error}
          <button style={styles.dismissButton} onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.searchContainer}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#9CA3AF" style={styles.searchIcon}>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="Search solutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={styles.categorySelect}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading solutions...</p>
        </div>
      ) : solutions.length === 0 ? (
        <div style={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#D1D5DB">
            <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
          </svg>
          <h3 style={styles.emptyTitle}>No solutions found</h3>
          <p style={styles.emptyText}>
            {searchQuery || selectedCategory
              ? 'Try adjusting your search or filter'
              : 'Click "Add Solution" to create your first solution'}
          </p>
        </div>
      ) : (
        /* Solutions Grid */
        <div style={styles.grid}>
          {solutions.map((solution) => (
            <SolutionCard
              key={solution.id}
              solution={solution}
              onClick={() => handleSolutionClick(solution)}
              onStatusChange={handleStatusChange}
              onEdit={() => handleEditClick(solution)}
              onDelete={() => handleDeleteClick(solution)}
            />
          ))}
        </div>
      )}

      {/* View/Edit Modal */}
      {modalOpen && modalMode === 'view' && (
        <SolutionDetailModal
          solution={selectedSolution}
          isOpen={modalOpen}
          onClose={handleCloseModal}
        />
      )}

      {/* Add/Edit Form Modal */}
      {modalOpen && (modalMode === 'add' || modalMode === 'edit') && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modalMode === 'add' ? 'Add New Solution' : 'Edit Solution'}
              </h2>
              <button style={styles.closeButton} onClick={handleCloseModal}>
                ×
              </button>
            </div>
            {loadingDetail ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner} />
              </div>
            ) : (
              renderForm()
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && solutionToDelete && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirmOpen(false)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.confirmTitle}>Delete Solution</h3>
            <p style={styles.confirmText}>
              Are you sure you want to delete "{solutionToDelete.name}"? This action cannot be
              undone.
            </p>
            <div style={styles.confirmActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button style={styles.deleteButton} onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for detail */}
      {loadingDetail && modalOpen && modalMode === 'view' && !selectedSolution && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.darkSlateNavy,
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    minWidth: '200px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 40px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    backgroundColor: colors.white,
    outline: 'none',
  },
  categorySelect: {
    padding: '10px 32px 10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    backgroundColor: colors.white,
    cursor: 'pointer',
    outline: 'none',
    minWidth: '160px',
  },
  successMessage: {
    padding: '12px 16px',
    backgroundColor: colors.mist,
    color: colors.forestGreen,
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#DC2626',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
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
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '16px 0 8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
  modalOverlay: {
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
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #E5E7EB',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6B7280',
    padding: 0,
  },
  form: {
    padding: '24px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.darkSlateNavy,
    marginBottom: '6px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    outline: 'none',
    resize: 'vertical',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    backgroundColor: colors.white,
    cursor: 'pointer',
    outline: 'none',
  },
  hint: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: colors.darkSlateNavy,
    cursor: 'pointer',
    marginTop: '28px',
  },
  checkbox: {
    marginRight: '8px',
    width: '16px',
    height: '16px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #E5E7EB',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: colors.white,
    color: colors.darkSlateNavy,
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmModal: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
  },
  confirmTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.darkSlateNavy,
    margin: '0 0 12px',
  },
  confirmText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 24px',
    lineHeight: 1.5,
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  deleteButton: {
    padding: '10px 20px',
    backgroundColor: colors.errorRed,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
