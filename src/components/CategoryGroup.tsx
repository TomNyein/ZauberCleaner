import { useState, type ReactNode } from 'react';

interface CategoryGroupProps {
  label: string;
  children: ReactNode;
}

export default function CategoryGroup({ label, children }: CategoryGroupProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="category-group">
      <div className="category-group-header" onClick={() => setOpen(!open)}>
        <svg
          className={`category-chevron ${open ? 'open' : ''}`}
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
        >
          <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="category-label">{label}</span>
      </div>
      {open && <div className="category-group-content">{children}</div>}
    </div>
  );
}
