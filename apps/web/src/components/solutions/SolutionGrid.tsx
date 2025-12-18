import { css } from '@leafygreen-ui/emotion';
import { SolutionCard } from './SolutionCard';
import { Solution } from '../../types';

const gridStyles = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
`;

const emptyStateStyles = css`
  text-align: center;
  padding: 64px 32px;
  color: #5c6c75;
`;

interface SolutionGridProps {
  solutions: Solution[];
}

export function SolutionGrid({ solutions }: SolutionGridProps) {
  if (solutions.length === 0) {
    return (
      <div className={emptyStateStyles}>
        <p>No solutions found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className={gridStyles}>
      {solutions.map((solution) => (
        <SolutionCard key={solution.id} solution={solution} />
      ))}
    </div>
  );
}
