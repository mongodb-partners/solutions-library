import { useLocation, useNavigate } from 'react-router-dom';
import { SideNav, SideNavItem, SideNavGroup } from '@leafygreen-ui/side-nav';
import { css } from '@leafygreen-ui/emotion';
import { getPartners, getCategories } from '../../data/solutions';

const navContainerStyles = css`
  width: 280px;
  min-width: 280px;
  background-color: #fff;
  border-right: 1px solid #e8edeb;
`;

interface NavigationProps {
  onFilterChange?: (filter: { partner?: string; category?: string }) => void;
  activeFilter?: { partner?: string; category?: string };
}

export function Navigation({ onFilterChange, activeFilter }: NavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const partners = getPartners();
  const categories = getCategories();

  const handleAllSolutions = () => {
    navigate('/');
    onFilterChange?.({});
  };

  const handlePartnerClick = (partner: string) => {
    navigate('/');
    onFilterChange?.({ partner, category: undefined });
  };

  const handleCategoryClick = (category: string) => {
    navigate('/');
    onFilterChange?.({ category, partner: undefined });
  };

  const isHome = location.pathname === '/';

  return (
    <nav className={navContainerStyles}>
      <SideNav>
        <SideNavItem
          active={isHome && !activeFilter?.partner && !activeFilter?.category}
          onClick={handleAllSolutions}
        >
          All Solutions
        </SideNavItem>

        <SideNavGroup header="By Partner" glyph="Apps">
          {partners.map((partner) => (
            <SideNavItem
              key={partner}
              active={activeFilter?.partner === partner}
              onClick={() => handlePartnerClick(partner)}
            >
              {partner}
            </SideNavItem>
          ))}
        </SideNavGroup>

        <SideNavGroup header="By Category" glyph="Folder">
          {categories.map((category) => (
            <SideNavItem
              key={category}
              active={activeFilter?.category === category}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </SideNavItem>
          ))}
        </SideNavGroup>
      </SideNav>
    </nav>
  );
}
