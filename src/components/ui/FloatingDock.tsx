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
      className={`glass-strong fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 rounded-full shadow-luxury border border-gold-500/30 transition-all duration-300 ${className}`}
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
            className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 outline-none ${
              isActive
                ? 'bg-gradient-to-br from-accent-700 to-accent-900 text-white shadow-md shadow-accent-950/20 scale-105'
                : 'text-gray-600 hover:text-accent-900 hover:bg-gold-50/60'
            }`}
            aria-label={item.label}
          >
            {item.icon}

            {/* Micro Tooltip */}
            <div
              className={`absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900/95 backdrop-blur-md text-white rounded-lg text-[11px] font-medium tracking-wide whitespace-nowrap pointer-events-none transition-all duration-200 shadow-lg border border-white/10 ${
                isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'
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
