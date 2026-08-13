import React, { useState } from 'react';

export interface DockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface FloatingDockProps {
  items: DockItem[];
  activeId: string;
  className?: string;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  items,
  activeId,
  className = '',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <nav
      aria-label="Primary navigation"
      className={`glass-strong fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-2 ${className}`}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const isHovered = item.id === hoveredId;

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-colors outline-none ${
              isActive ? 'bg-accent-50 text-accent-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
            aria-label={item.label}
          >
            {item.icon}

            <div
              className={`absolute bottom-14 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gray-900 text-white rounded-md text-xs whitespace-nowrap pointer-events-none transition-all duration-150 ${
                isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
              }`}
            >
              {item.label}
            </div>
          </button>
        );
      })}
    </nav>
  );
};

export default FloatingDock;
