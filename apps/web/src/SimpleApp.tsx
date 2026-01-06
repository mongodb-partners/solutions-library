import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { solutions as allSolutions, filterSolutions } from './data/solutions'
import type { Solution } from './types'
import { getDemoUrl } from './utils/getDemoUrl'
import { UsageEnquiryModal } from './components/UsageEnquiryModal'

// Admin imports
import { AuthProvider } from './admin/context'
import { ProtectedRoute, AdminLayout } from './admin/components'
import { LoginPage, DashboardPage, SolutionsPage, AdminUsersPage, AnalyticsPage, SystemLogsPage, TelemetryPage, HousekeepingPage, SettingsPage, ConfigurationPage, ForgotPasswordPage, ResetPasswordPage } from './admin/pages'

// Status context for fetched solution statuses
const StatusContext = createContext<{
  statuses: Record<string, string>
  loading: boolean
}>({ statuses: {}, loading: true })

// Maintenance context
const MaintenanceContext = createContext<{
  maintenanceMode: boolean
  maintenanceMessage: string
}>({ maintenanceMode: false, maintenanceMessage: '' })

// Filter context
const FilterContext = createContext<{
  partner: string | null
  setPartner: (p: string | null) => void
}>({ partner: null, setPartner: () => {} })

// Header Component
function Header() {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      padding: '16px 24px',
      backgroundColor: '#001e2b',
      borderBottom: '1px solid #1c2d38',
    }}>
      <img src="/mongodb-logo.svg" alt="MongoDB" style={{ height: 32 }} />
      <div style={{ width: 1, height: 32, backgroundColor: '#3d4f58', margin: '0 16px' }} />
      <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>
        Partner Solutions Library
      </h1>
    </header>
  )
}

// Solution Card Component
function SolutionCard({ solution }: { solution: Solution }) {
  const navigate = useNavigate()
  const { statuses } = useContext(StatusContext)
  const [showEnquiryModal, setShowEnquiryModal] = useState(false)

  // Get effective status: use admin override if available, otherwise use solution's default status
  const effectiveStatus = statuses[solution.id] || solution.status
  const isComingSoon = effectiveStatus === 'coming-soon' || !solution.demoUrl

  const handleLaunchDemo = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowEnquiryModal(true)
  }

  return (
    <>
      <div
        onClick={() => navigate(`/solutions/${solution.id}`)}
        style={{
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 24,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
        onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <img
            src={solution.partner.logo}
            alt={solution.partner.name}
            style={{ width: 48, height: 48, objectFit: 'contain', backgroundColor: '#f5f6f7', borderRadius: 8, padding: 8 }}
            onError={(e) => { e.currentTarget.src = '/logos/placeholder.svg' }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{solution.name}</h3>
            <span style={{ color: '#5c6c75', fontSize: '0.875rem' }}>{solution.partner.name}</span>
          </div>
          {solution.featured && (
            <span style={{
              marginLeft: 'auto',
              backgroundColor: '#E3FCF7',
              color: '#00684A',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              Featured
            </span>
          )}
        </div>
        <p style={{ color: '#5c6c75', marginBottom: 16 }}>{solution.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <span style={{ backgroundColor: '#f5f6f7', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
            {solution.category}
          </span>
          {solution.technologies.slice(0, 3).map((tech) => (
            <span key={tech} style={{ backgroundColor: '#f5f6f7', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
              {tech}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isComingSoon ? (
            <button
              disabled
              style={{
                backgroundColor: '#889397',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 4,
                cursor: 'not-allowed',
                fontWeight: 500,
              }}
            >
              Coming Soon
            </button>
          ) : (
            <button
              onClick={handleLaunchDemo}
              style={{
                backgroundColor: '#00684A',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Launch Demo
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/solutions/${solution.id}`) }}
            style={{
              backgroundColor: 'white',
              color: '#001e2b',
              border: '1px solid #889397',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Details
          </button>
        </div>
      </div>
      <UsageEnquiryModal
        isOpen={showEnquiryModal}
        onClose={() => setShowEnquiryModal(false)}
        solutionId={solution.id}
        solutionName={solution.name}
        demoUrl={getDemoUrl(solution.ports.ui)}
      />
    </>
  )
}

// Home Page
function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { partner } = useContext(FilterContext)
  const { statuses } = useContext(StatusContext)

  // Filter out inactive solutions - solutions are shown unless explicitly set to 'inactive'
  const visibleSolutions = allSolutions.filter(s => {
    const effectiveStatus = statuses[s.id] || s.status
    return effectiveStatus !== 'inactive'
  })

  const filteredSolutions = filterSolutions({ search: searchQuery, partner: partner || undefined })
    .filter(s => {
      const effectiveStatus = statuses[s.id] || s.status
      return effectiveStatus !== 'inactive'
    })

  const partnerCount = new Set(visibleSolutions.map((s) => s.partner.name)).size
  const categoryCount = new Set(visibleSolutions.map((s) => s.category)).size

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #00684a 0%, #001e2b 100%)',
        color: 'white',
        padding: '48px 32px',
        margin: '-32px -32px 32px -32px',
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: 16 }}>
          MongoDB Partner Solutions
        </h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: 700, marginBottom: 24 }}>
          Explore integrations showcasing how MongoDB Atlas works with
          leading technology partners. From AI/LLM applications to event streaming and
          workflow orchestration.
        </p>
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#00ed64' }}>{visibleSolutions.length}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Solutions</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#00ed64' }}>{partnerCount}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Partners</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#00ed64' }}>{categoryCount}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Categories</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search solutions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '12px 16px',
            fontSize: '1rem',
            border: '1px solid #889397',
            borderRadius: 4,
          }}
        />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 24,
      }}>
        {filteredSolutions.map((solution) => (
          <SolutionCard key={solution.id} solution={solution} />
        ))}
      </div>
    </div>
  )
}

// Solution Detail Page
function SolutionDetailPage() {
  const id = window.location.pathname.split('/').pop()
  const solution = allSolutions.find(s => s.id === id)
  const { statuses } = useContext(StatusContext)
  const [showEnquiryModal, setShowEnquiryModal] = useState(false)

  if (!solution) {
    return <div style={{ padding: 32 }}>Solution not found</div>
  }

  // Get effective status: use admin override if available
  const effectiveStatus = statuses[solution.id] || solution.status

  // Hide inactive solutions on the detail page too
  if (effectiveStatus === 'inactive') {
    return <div style={{ padding: 32 }}>Solution not available</div>
  }

  const isComingSoon = effectiveStatus === 'coming-soon' || !solution.demoUrl

  const handleLaunchDemo = () => {
    setShowEnquiryModal(true)
  }

  return (
    <>
      <div style={{ maxWidth: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 32 }}>
          <img
            src={solution.partner.logo}
            alt={solution.partner.name}
            style={{ width: 80, height: 80, objectFit: 'contain', backgroundColor: '#f5f6f7', borderRadius: 8, padding: 12 }}
          />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 8px 0' }}>{solution.name}</h1>
            <p style={{ color: '#5c6c75', margin: 0 }}>{solution.partner.name}</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {isComingSoon ? (
              <button
                disabled
                style={{
                  backgroundColor: '#889397',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 4,
                  cursor: 'not-allowed',
                  fontWeight: 500,
                }}
              >
                Coming Soon
              </button>
            ) : (
              <button
                onClick={handleLaunchDemo}
                style={{
                  backgroundColor: '#00684A',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Launch Demo
              </button>
            )}
            {solution.sourceUrl && (
              <button
                onClick={() => window.open(solution.sourceUrl, '_blank')}
                style={{
                  backgroundColor: 'white',
                  color: '#001e2b',
                  border: '1px solid #889397',
                  padding: '12px 24px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                View Source
              </button>
            )}
          </div>
        </div>

        <p style={{ fontSize: '1.125rem', lineHeight: 1.6, marginBottom: 32 }}>
          {solution.longDescription || solution.description}
        </p>

        <h2>Value Proposition</h2>
        <ul style={{ lineHeight: 1.8 }}>
          {solution.valueProposition.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h2>Technologies</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {solution.technologies.map((tech) => (
            <span key={tech} style={{ backgroundColor: '#f5f6f7', padding: '8px 12px', borderRadius: 4 }}>
              {tech}
            </span>
          ))}
        </div>
      </div>
      <UsageEnquiryModal
        isOpen={showEnquiryModal}
        onClose={() => setShowEnquiryModal(false)}
        solutionId={solution.id}
        solutionName={solution.name}
        demoUrl={getDemoUrl(solution.ports.ui)}
      />
    </>
  )
}

// Navigation Component
function Navigation() {
  const navigate = useNavigate()
  const { partner: activePartner, setPartner } = useContext(FilterContext)
  const { statuses } = useContext(StatusContext)

  // Only show partners that have at least one visible (non-inactive) solution
  const visibleSolutions = allSolutions.filter(s => {
    const effectiveStatus = statuses[s.id] || s.status
    return effectiveStatus !== 'inactive'
  })
  const partners = [...new Set(visibleSolutions.map(s => s.partner.name))]

  const handleAllSolutions = () => {
    setPartner(null)
    navigate('/')
  }

  const handlePartnerClick = (partnerName: string) => {
    setPartner(partnerName)
    navigate('/')
  }

  return (
    <nav style={{
      width: 250,
      backgroundColor: 'white',
      borderRight: '1px solid #e8edeb',
      padding: '16px 0',
    }}>
      <button
        onClick={handleAllSolutions}
        style={{
          display: 'block',
          width: '100%',
          padding: '10px 16px',
          textAlign: 'left',
          border: 'none',
          backgroundColor: !activePartner ? '#e3fcf7' : 'transparent',
          color: !activePartner ? '#00684A' : '#001e2b',
          fontWeight: !activePartner ? 600 : 400,
          cursor: 'pointer',
          fontSize: '0.9375rem',
        }}
      >
        All Solutions
      </button>
      <div style={{ padding: '16px 16px 8px', fontWeight: 600, color: '#5c6c75', fontSize: '0.75rem', textTransform: 'uppercase' }}>
        By Partner
      </div>
      {partners.map(partnerName => (
        <button
          key={partnerName}
          onClick={() => handlePartnerClick(partnerName)}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 16px',
            textAlign: 'left',
            border: 'none',
            backgroundColor: activePartner === partnerName ? '#e3fcf7' : 'transparent',
            color: activePartner === partnerName ? '#00684A' : '#5c6c75',
            fontWeight: activePartner === partnerName ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {partnerName}
        </button>
      ))}
    </nav>
  )
}

// Main Layout
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        <Navigation />
        <main style={{ flex: 1, padding: 32, backgroundColor: '#f9fbfa' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

// Maintenance Page - shown when maintenance mode is enabled
function MaintenancePage() {
  const { maintenanceMessage } = useContext(MaintenanceContext)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fbfa',
        padding: 32,
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 48,
          maxWidth: 600,
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            width: 80,
            height: 80,
            backgroundColor: '#FEF7E3',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 40,
          }}>
            <span role="img" aria-label="maintenance">&#128736;</span>
          </div>
          <h1 style={{ color: '#001e2b', marginBottom: 16 }}>Under Maintenance</h1>
          <p style={{ color: '#5c6c75', fontSize: '1.125rem', lineHeight: 1.6 }}>
            {maintenanceMessage || 'We are currently performing scheduled maintenance. Please check back soon.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Simple App
export function SimpleApp() {
  const [partner, setPartner] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [statusLoading, setStatusLoading] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')

  // Fetch solution statuses and maintenance status from public API on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await fetch('/api/admin/public/solutions/status')
        if (response.ok) {
          const data = await response.json()
          setStatuses(data.statuses || {})
        }
      } catch (error) {
        console.error('Failed to fetch solution statuses:', error)
      } finally {
        setStatusLoading(false)
      }
    }

    const fetchMaintenanceStatus = async () => {
      try {
        const response = await fetch('/api/admin/public/maintenance')
        if (response.ok) {
          const data = await response.json()
          setMaintenanceMode(data.maintenance_mode || false)
          setMaintenanceMessage(data.maintenance_message || '')
        }
      } catch (error) {
        console.error('Failed to fetch maintenance status:', error)
      }
    }

    fetchStatuses()
    fetchMaintenanceStatus()
  }, [])

  return (
    <AuthProvider>
      <StatusContext.Provider value={{ statuses, loading: statusLoading }}>
        <MaintenanceContext.Provider value={{ maintenanceMode, maintenanceMessage }}>
          <FilterContext.Provider value={{ partner, setPartner }}>
            <Routes>
            {/* Admin Routes - outside main layout, always accessible */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="solutions" element={<SolutionsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="logs" element={<SystemLogsPage />} />
              <Route path="telemetry" element={<TelemetryPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="configuration" element={<ConfigurationPage />} />
              <Route path="housekeeping" element={<HousekeepingPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Public Routes - show maintenance page if maintenance mode is enabled */}
            <Route
              path="/*"
              element={
                maintenanceMode ? (
                  <MaintenancePage />
                ) : (
                  <Layout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/solutions/:id" element={<SolutionDetailPage />} />
                    </Routes>
                  </Layout>
                )
              }
            />
            </Routes>
          </FilterContext.Provider>
        </MaintenanceContext.Provider>
      </StatusContext.Provider>
    </AuthProvider>
  )
}
