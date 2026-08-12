import React from 'react';
import type { ClientBodyMeasurements } from '../../types/workshop.types';

interface MeasurementSilhouetteProps {
  measurements: ClientBodyMeasurements;
  className?: string;
}

const SPECS: { key: 'bust' | 'waist' | 'hips' | 'shoulder' | 'sleeveLength' | 'neckToWaist'; label: string }[] = [
  { key: 'bust', label: 'Bust' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'sleeveLength', label: 'Sleeve' },
  { key: 'neckToWaist', label: 'Neck to Waist' },
];

export const MeasurementSilhouette: React.FC<MeasurementSilhouetteProps> = ({
  measurements,
  className = '',
}) => {
  const unit = measurements.unit || 'in';

  return (
    <div className={`p-5 bg-white border border-gray-200 rounded-xl ${className}`}>
      <span className="text-xs font-medium text-gray-500 block mb-3">Body Measurements</span>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SPECS.map((spec) => (
          <div key={spec.key} className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
            <div className="text-[11px] text-gray-500">{spec.label}</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">
              {measurements[spec.key]} <span className="text-xs font-normal text-gray-400">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {measurements.notes && (
        <div className="mt-3 p-3 bg-accent-50 border border-accent-100 rounded-lg text-xs text-gray-700">
          <span className="font-medium text-accent-700 block mb-0.5">Fitting Notes</span>
          {measurements.notes}
        </div>
      )}
    </div>
  );
};

export default MeasurementSilhouette;
