import React from 'react';
import type { ClientBodyMeasurements, MeasurementParameter } from '../../types/workshop.types';

interface MeasurementSilhouetteProps {
  measurements: ClientBodyMeasurements;
  // Optional — supplies proper labels/ordering for each value key. Falls
  // back to a title-cased version of the raw key when omitted.
  parameters?: MeasurementParameter[];
  className?: string;
}

export const MeasurementSilhouette: React.FC<MeasurementSilhouetteProps> = ({
  measurements,
  parameters,
  className = '',
}) => {
  const unit = measurements.unit || 'in';

  const entries =
    parameters && parameters.length > 0
      ? parameters.map((p) => ({ key: p.key, label: p.label, value: measurements.values[p.key] }))
      : Object.entries(measurements.values).map(([key, value]) => ({
          key,
          label: key.replace(/_/g, ' '),
          value,
        }));

  return (
    <div className={`p-5 bg-white border border-gray-200 rounded-xl ${className}`}>
      <span className="text-xs font-medium text-gray-500 block mb-3">Body Measurements</span>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No measurements on file yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {entries.map((entry) => (
            <div key={entry.key} className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
              <div className="text-[11px] text-gray-500 capitalize">{entry.label}</div>
              <div className="text-sm font-semibold text-gray-900 mt-0.5">
                {entry.value ?? '—'} <span className="text-xs font-normal text-gray-400">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
