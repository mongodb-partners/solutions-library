import { useNavigate } from 'react-router-dom';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import { H3, Body } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import { css } from '@leafygreen-ui/emotion';
import { Solution } from '../../types';
import { getDemoUrl } from '../../utils/getDemoUrl';

const cardStyles = css`
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
`;

const headerStyles = css`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const logoStyles = css`
  width: 48px;
  height: 48px;
  object-fit: contain;
  background-color: #f5f6f7;
  border-radius: 8px;
  padding: 8px;
`;

const titleStyles = css`
  margin: 0;
  font-size: 1.125rem;
`;

const descriptionStyles = css`
  color: #5c6c75;
  margin-bottom: 16px;
  flex-grow: 1;
`;

const tagsContainerStyles = css`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const actionsStyles = css`
  display: flex;
  gap: 12px;
  margin-top: auto;
`;

const partnerBadgeStyles = css`
  margin-left: auto;
`;

interface SolutionCardProps {
  solution: Solution;
}

export function SolutionCard({ solution }: SolutionCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/solutions/${solution.id}`);
  };

  const handleLaunchDemo = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(getDemoUrl(solution.ports.ui), '_blank');
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/solutions/${solution.id}`);
  };

  return (
    <Card className={cardStyles} onClick={handleCardClick}>
      <div className={headerStyles}>
        <img
          src={solution.partner.logo}
          alt={`${solution.partner.name} logo`}
          className={logoStyles}
          onError={(e) => {
            e.currentTarget.src = '/logos/placeholder.svg';
          }}
        />
        <div>
          <H3 className={titleStyles}>{solution.name}</H3>
          <Body baseFontSize={13}>{solution.partner.name}</Body>
        </div>
        {solution.featured && (
          <Badge variant="blue" className={partnerBadgeStyles}>
            Featured
          </Badge>
        )}
      </div>

      <Body className={descriptionStyles}>{solution.description}</Body>

      <div className={tagsContainerStyles}>
        <Badge variant="lightgray">{solution.category}</Badge>
        {solution.technologies.slice(0, 3).map((tech) => (
          <Badge key={tech} variant="lightgray">
            {tech}
          </Badge>
        ))}
        {solution.technologies.length > 3 && (
          <Badge variant="lightgray">+{solution.technologies.length - 3}</Badge>
        )}
      </div>

      <div className={actionsStyles}>
        {solution.status === 'coming-soon' || !solution.demoUrl ? (
          <Button
            variant="primary"
            disabled
          >
            Coming Soon
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleLaunchDemo}
            leftGlyph={<Icon glyph="OpenNewTab" />}
          >
            Launch Demo
          </Button>
        )}
        <Button variant="default" onClick={handleViewDetails}>
          Details
        </Button>
      </div>
    </Card>
  );
}
