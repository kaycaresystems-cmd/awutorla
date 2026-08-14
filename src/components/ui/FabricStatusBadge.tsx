import React from 'react';

export type FabricStatus = 'CUTTING' | 'FITTING' | 'READY';

interface FabricStatusBadgeProps {
  status: FabricStatus;
  orderId?: string;
  fabricType?: string;
  dateAdded?: string;
  className?: string;
  swingAnimation?: boolean;
}

const STATUS_STYLES: Record<
  FabricStatus,
  { label: string; dot: string; bg: string; text: string; border: string; pulse?: boolean }
> = {
  CUTTING: {
    label: 'In Cutting',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50/90',
    text: 'text-amber-800',
    border: 'border-amber-500/20',
    pulse: true,
  },
  FITTING: {
    label: 'In Fitting',
    dot: 'bg-gold-500',
    bg: 'bg-gold-50/90',
    text: 'text-gold-900',
    border: 'border-gold-500/30',
    pulse: true,
  },
  READY: {
    label: 'Ready for Pickup',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-800',
    border: 'border-emerald-500/30',
    pulse: false,
  },
};

export const FabricStatusBadge: React.FC<FabricStatusBadgeProps> = ({ status, className = '' }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.CUTTING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-sm ${s.bg} ${s.text} ${s.border} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {s.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${s.dot}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
};

export default FabricStatusBadge;
