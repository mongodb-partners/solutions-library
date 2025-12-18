import { useState, createContext, useContext } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { solutions, filterSolutions } from './data/solutions'
import type { Solution } from './types'
import { getDemoUrl } from './utils/getDemoUrl'

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

  return (
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
        {solution.status === 'coming-soon' || !solution.demoUrl ? (
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
            onClick={(e) => { e.stopPropagation(); window.open(getDemoUrl(solution.ports.ui), '_blank') }}
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
  )
}

// Home Page
function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { partner } = useContext(FilterContext)
  const filteredSolutions = filterSolutions({ search: searchQuery, partner: partner || undefined })
  const partnerCount = new Set(solutions.map((s) => s.partner.name)).size
  const categoryCount = new Set(solutions.map((s) => s.category)).size

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
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#00ed64' }}>{solutions.length}</div>
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
  const solution = solutions.find(s => s.id === id)

  if (!solution) {
    return <div style={{ padding: 32 }}>Solution not found</div>
  }

  return (
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
          {solution.status === 'coming-soon' || !solution.demoUrl ? (
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
              onClick={() => window.open(getDemoUrl(solution.ports.ui), '_blank')}
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
  )
}

// Navigation Component
function Navigation() {
  const navigate = useNavigate()
  const { partner: activePartner, setPartner } = useContext(FilterContext)
  const partners = [...new Set(solutions.map(s => s.partner.name))]

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

// Simple App
export function SimpleApp() {
  const [partner, setPartner] = useState<string | null>(null)

  return (
    <FilterContext.Provider value={{ partner, setPartner }}>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/solutions/:id" element={<SolutionDetailPage />} />
        </Routes>
      </Layout>
    </FilterContext.Provider>
  )
}
