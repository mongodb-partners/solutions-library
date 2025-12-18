import { useParams, useNavigate } from 'react-router-dom';
import { H1, H2, Body, Link } from '@leafygreen-ui/typography';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Card from '@leafygreen-ui/card';
import Icon from '@leafygreen-ui/icon';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import { css } from '@leafygreen-ui/emotion';
import { useState } from 'react';
import { getSolutionById } from '../data/solutions';
import { getDemoUrl } from '../utils/getDemoUrl';

const containerStyles = css`
  max-width: 1000px;
`;

const backButtonStyles = css`
  margin-bottom: 24px;
`;

const headerStyles = css`
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
`;

const logoStyles = css`
  width: 80px;
  height: 80px;
  object-fit: contain;
  background-color: #f5f6f7;
  border-radius: 12px;
  padding: 12px;
`;

const headerInfoStyles = css`
  flex: 1;
`;

const titleStyles = css`
  margin-bottom: 8px;
`;

const partnerLinkStyles = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
`;

const tagsStyles = css`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const actionsStyles = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const sectionStyles = css`
  margin-top: 32px;
`;

const valuePropsListStyles = css`
  list-style: none;
  padding: 0;
  margin: 16px 0;
`;

const valuePropItemStyles = css`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e8edeb;

  &:last-child {
    border-bottom: none;
  }
`;

const checkIconStyles = css`
  color: #00684a;
  flex-shrink: 0;
  margin-top: 2px;
`;

const techGridStyles = css`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
`;

const notFoundStyles = css`
  text-align: center;
  padding: 64px 32px;
`;

export function SolutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);

  const solution = id ? getSolutionById(id) : undefined;

  if (!solution) {
    return (
      <div className={notFoundStyles}>
        <H2>Solution Not Found</H2>
        <Body>The solution you're looking for doesn't exist.</Body>
        <Button onClick={() => navigate('/')} style={{ marginTop: 24 }}>
          Back to Solutions
        </Button>
      </div>
    );
  }

  const handleLaunchDemo = () => {
    window.open(getDemoUrl(solution.ports.ui), '_blank');
  };

  return (
    <div className={containerStyles}>
      <Button
        variant="default"
        leftGlyph={<Icon glyph="ChevronLeft" />}
        onClick={() => navigate('/')}
        className={backButtonStyles}
      >
        Back to Solutions
      </Button>

      <Card>
        <div className={headerStyles}>
          <img
            src={solution.partner.logo}
            alt={`${solution.partner.name} logo`}
            className={logoStyles}
            onError={(e) => {
              e.currentTarget.src = '/logos/placeholder.svg';
            }}
          />

          <div className={headerInfoStyles}>
            <H1 className={titleStyles}>{solution.name}</H1>
            <Link
              href={solution.partner.website}
              target="_blank"
              className={partnerLinkStyles}
            >
              {solution.partner.name}
              <Icon glyph="OpenNewTab" size="small" />
            </Link>

            <div className={tagsStyles}>
              <Badge variant="blue">{solution.category}</Badge>
              {solution.featured && <Badge variant="green">Featured</Badge>}
              <Badge variant="lightgray">{solution.status}</Badge>
            </div>
          </div>

          <div className={actionsStyles}>
            {solution.status === 'coming-soon' || !solution.demoUrl ? (
              <Button
                variant="primary"
                size="large"
                disabled
              >
                Coming Soon
              </Button>
            ) : (
              <Button
                variant="primary"
                size="large"
                onClick={handleLaunchDemo}
                leftGlyph={<Icon glyph="OpenNewTab" />}
              >
                Launch Demo
              </Button>
            )}
            {solution.sourceUrl && (
              <Button
                variant="default"
                as="a"
                href={solution.sourceUrl}
                target="_blank"
                leftGlyph={<Icon glyph="Code" />}
              >
                View Source
              </Button>
            )}
          </div>
        </div>

        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          aria-label="Solution details tabs"
        >
          <Tab name="Overview">
            <div className={sectionStyles}>
              <H2>About this Solution</H2>
              <Body>{solution.longDescription || solution.description}</Body>

              <div style={{ marginTop: 32 }}>
                <H2>Value Proposition</H2>
                <ul className={valuePropsListStyles}>
                  {solution.valueProposition.map((prop, index) => (
                    <li key={index} className={valuePropItemStyles}>
                      <Icon glyph="Checkmark" className={checkIconStyles} />
                      <Body>{prop}</Body>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Tab>

          <Tab name="Technologies">
            <div className={sectionStyles}>
              <H2>Technology Stack</H2>
              <Body>This solution integrates the following technologies:</Body>
              <div className={techGridStyles}>
                {solution.technologies.map((tech) => (
                  <Badge key={tech} variant="lightgray">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          </Tab>

          <Tab name="Configuration">
            <div className={sectionStyles}>
              <H2>Service Configuration</H2>
              <Body>Default port configuration for this solution:</Body>

              <Card style={{ marginTop: 16, padding: 16 }}>
                <Body>
                  <strong>API Port:</strong> {solution.ports.api}
                </Body>
                {solution.ports.ui && (
                  <Body>
                    <strong>UI Port:</strong> {solution.ports.ui}
                  </Body>
                )}
                {solution.status === 'coming-soon' || !solution.demoUrl ? (
                  <Body style={{ marginTop: 12 }}>
                    <strong>Demo URL:</strong> <em>Coming Soon</em>
                  </Body>
                ) : (
                  <Body style={{ marginTop: 12 }}>
                    <strong>Demo URL:</strong>{' '}
                    <Link href={getDemoUrl(solution.ports.ui)} target="_blank">
                      {getDemoUrl(solution.ports.ui)}
                    </Link>
                  </Body>
                )}
              </Card>
            </div>
          </Tab>
        </Tabs>
      </Card>
    </div>
  );
}
