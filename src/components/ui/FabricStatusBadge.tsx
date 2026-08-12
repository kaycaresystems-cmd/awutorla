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

const STATUS_STYLES: Record<FabricStatus, { label: string; dot: string; bg: string; text: string }> = {
  CUTTING: { label: 'Cutting', dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-700' },
  FITTING: { label: 'Fitting', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  READY: { label: 'Ready', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export const FabricStatusBadge: React.FC<FabricStatusBadgeProps> = ({ status, className = '' }) => {
  const s = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

export default FabricStatusBadge;
