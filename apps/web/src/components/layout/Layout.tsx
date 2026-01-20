import { useState, ReactNode } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { css } from '@leafygreen-ui/emotion';

const containerStyles = css`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const mainLayoutStyles = css`
  display: flex;
  flex: 1;
`;

const contentStyles = css`
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  background-color: #f9fbfa;
`;

const footerStyles = css`
  padding: 12px 24px;
  text-align: center;
  font-size: 12px;
  color: #889397;
  background-color: #f9fbfa;
  border-top: 1px solid #e8edeb;

  a {
    color: #5c6c75;
    text-decoration: underline;
    text-decoration-color: #c1c7c6;
    text-underline-offset: 2px;
    transition: all 0.15s ease;

    &:hover {
      color: #00684a;
      text-decoration-color: #00684a;
    }
  }
`;

interface LayoutProps {
  children: ReactNode;
}

export interface FilterState {
  partner?: string;
  category?: string;
  search?: string;
}

export function Layout({ children }: LayoutProps) {
  const [filter, setFilter] = useState<FilterState>({});

  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilter(newFilter);
  };

  return (
    <div className={containerStyles}>
      <Header />
      <div className={mainLayoutStyles}>
        <Navigation onFilterChange={handleFilterChange} activeFilter={filter} />
        <main className={contentStyles}>{children}</main>
      </div>
      <footer className={footerStyles}>
        Developed by{' '}
        <a
          href="https://www.linkedin.com/in/farooqimdd/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Mohammad Daoud Farooqi
        </a>
      </footer>
    </div>
  );
}
