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
    </div>
  );
}
