import { SearchInput } from '@leafygreen-ui/search-input';
import { css } from '@leafygreen-ui/emotion';
import { ChangeEvent } from 'react';

const searchContainerStyles = css`
  max-width: 400px;
  margin-bottom: 24px;
`;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={searchContainerStyles}>
      <SearchInput
        aria-label="Search solutions"
        placeholder="Search solutions..."
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
