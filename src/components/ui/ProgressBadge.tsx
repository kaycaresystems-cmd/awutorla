import React from 'react';

interface ProgressBadgeProps {
  label: string;
  percentage: number;
  shape?: 'circle' | 'pill-wide';
  variant?: 'mustard' | 'charcoal';
  striped?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<'mustard' | 'charcoal', { fill: string; text: string }> = {
  mustard: { fill: 'bg-mustard-400', text: 'text-charcoal-950' },
  charcoal: { fill: 'bg-charcoal-950', text: 'text-white' },
};

/**
 * Numeric progress indicator — a filled circle for compact stat rows, or a wide
 * pill track (optionally striped) for a longer in-progress measure.
 */
export const ProgressBadge: React.FC<ProgressBadgeProps> = ({
  label,
  percentage,
  shape = 'circle',
  variant = 'mustard',
  striped = false,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const { fill, text } = VARIANT_STYLES[variant];

  if (shape === 'pill-wide') {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div
          className={`relative h-8 rounded-full border border-gray-200 overflow-hidden ${
            striped ? 'progress-track-striped' : 'bg-gray-100'
          }`}
        >
          <div
            className={`h-full rounded-full ${fill} flex items-center justify-end px-3 transition-all duration-500`}
            style={{ width: `${clamped}%` }}
          >
            <span className={`text-xs font-semibold whitespace-nowrap ${text}`}>{clamped}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold shadow-sm ${fill} ${text}`}>
        {clamped}%
      </span>
      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  );
};

export default ProgressBadge;
