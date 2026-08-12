import React from 'react';

interface AtelierCardProps {
  children?: React.ReactNode;
  metadata?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  variant?: 'light' | 'dark' | 'gold';
  className?: string;
}

export const AtelierCard: React.FC<AtelierCardProps> = ({
  children,
  metadata,
  title,
  subtitle,
  image,
  variant = 'light',
  className = '',
}) => {
  const isDark = variant === 'dark';
  const isGold = variant === 'gold';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border transition-shadow duration-200 hover:shadow-md ${
        isDark
          ? 'bg-gray-900 border-gray-800 text-white'
          : isGold
          ? 'bg-accent-50 border-accent-100 text-gray-900'
          : 'bg-white border-gray-200 text-gray-900'
      } ${className}`}
    >
      {image && (
        <div className="w-full h-64 sm:h-72 overflow-hidden bg-gray-100">
          <img
            src={image}
            alt={title || 'Editorial'}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-6 sm:p-8 flex flex-col h-full">
        {metadata && (
          <span className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-accent-600'}`}>
            {metadata}
          </span>
        )}

        {title && <h3 className="text-xl font-semibold mb-1 leading-tight">{title}</h3>}

        {subtitle && (
          <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
        )}

        {children && (
          <div className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default AtelierCard;
