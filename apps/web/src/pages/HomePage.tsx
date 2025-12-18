import { useState } from 'react';
import { H1, Body } from '@leafygreen-ui/typography';
import { css } from '@leafygreen-ui/emotion';
import { SolutionGrid, SearchBar } from '../components/solutions';
import { filterSolutions, solutions } from '../data/solutions';

const heroStyles = css`
  background: linear-gradient(135deg, #00684a 0%, #001e2b 100%);
  color: white;
  padding: 48px 32px;
  margin: -32px -32px 32px -32px;
  border-radius: 0;
`;

const heroTitleStyles = css`
  color: white;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
`;

const heroSubtitleStyles = css`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.25rem;
  max-width: 700px;
  margin-bottom: 8px;
`;

const statsContainerStyles = css`
  display: flex;
  gap: 32px;
  margin-top: 24px;
`;

const statItemStyles = css`
  text-align: center;
`;

const statNumberStyles = css`
  font-size: 2rem;
  font-weight: 700;
  color: #00ed64;
`;

const statLabelStyles = css`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
`;

const contentStyles = css`
  padding-top: 24px;
`;

const sectionHeaderStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSolutions = filterSolutions({ search: searchQuery });

  const partnerCount = new Set(solutions.map((s) => s.partner.name)).size;
  const categoryCount = new Set(solutions.map((s) => s.category)).size;

  return (
    <div>
      <div className={heroStyles}>
        <H1 className={heroTitleStyles}>MongoDB Partner Solutions</H1>
        <Body className={heroSubtitleStyles}>
          Explore integrations showcasing how MongoDB Atlas works with
          leading technology partners. From AI/LLM applications to event streaming and
          workflow orchestration.
        </Body>

        <div className={statsContainerStyles}>
          <div className={statItemStyles}>
            <div className={statNumberStyles}>{solutions.length}</div>
            <div className={statLabelStyles}>Solutions</div>
          </div>
          <div className={statItemStyles}>
            <div className={statNumberStyles}>{partnerCount}</div>
            <div className={statLabelStyles}>Partners</div>
          </div>
          <div className={statItemStyles}>
            <div className={statNumberStyles}>{categoryCount}</div>
            <div className={statLabelStyles}>Categories</div>
          </div>
        </div>
      </div>

      <div className={contentStyles}>
        <div className={sectionHeaderStyles}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        <SolutionGrid solutions={filteredSolutions} />
      </div>
    </div>
  );
}
