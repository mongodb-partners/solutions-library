import { MongoDBLogo } from '@leafygreen-ui/logo';
import { H2 } from '@leafygreen-ui/typography';
import { css } from '@leafygreen-ui/emotion';

const headerStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: #001e2b;
  border-bottom: 1px solid #1c2d38;
`;

const logoContainerStyles = css`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const titleStyles = css`
  color: white;
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
`;

const dividerStyles = css`
  width: 1px;
  height: 32px;
  background-color: #3d4f58;
`;

export function Header() {
  return (
    <header className={headerStyles}>
      <div className={logoContainerStyles}>
        <MongoDBLogo color="white" height={32} />
        <div className={dividerStyles} />
        <H2 className={titleStyles}>Partner Solutions Library</H2>
      </div>
    </header>
  );
}
