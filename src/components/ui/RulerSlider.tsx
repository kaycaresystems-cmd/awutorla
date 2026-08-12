import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface RulerSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  initialUnit?: 'in' | 'cm';
  className?: string;
}

export const RulerSlider: React.FC<RulerSliderProps> = ({
  label,
  value,
  onChange,
  min = 20,
  max = 60,
  step = 0.1,
  initialUnit = 'in',
  className = '',
}) => {
  const [unit, setUnit] = useState<'in' | 'cm'>(initialUnit);

  const handleUnitToggle = (newUnit: 'in' | 'cm') => {
    if (newUnit === unit) return;
    setUnit(newUnit);
    if (newUnit === 'cm') {
      onChange(Math.round(value * 2.54 * 10) / 10);
    } else {
      onChange(Math.round((value / 2.54) * 10) / 10);
    }
  };

  const currentMin = unit === 'in' ? min : Math.round(min * 2.54);
  const currentMax = unit === 'in' ? max : Math.round(max * 2.54);
  const boundedValue = Math.max(currentMin, Math.min(currentMax, value));
  const percent = ((boundedValue - currentMin) / ((currentMax - currentMin) || 1)) * 100;

  const adjustValue = (delta: number) => {
    const next = Math.round((boundedValue + delta) * 10) / 10;
    if (next >= currentMin && next <= currentMax) {
      onChange(next);
    }
  };

  return (
    <div className={`p-5 bg-white border border-gray-200 rounded-xl shadow-card ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <label className="text-sm font-medium text-gray-900">{label}</label>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleUnitToggle('in')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                unit === 'in' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              in
            </button>
            <button
              type="button"
              onClick={() => handleUnitToggle('cm')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                unit === 'cm' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              cm
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustValue(-0.1)}
              aria-label={`Decrease ${label}`}
              className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <Minus size={13} />
            </button>
            <div className="min-w-[4.5rem] text-center font-medium text-gray-900 tabular-nums">
              {boundedValue.toFixed(1)} <span className="text-gray-400 text-xs">{unit}</span>
            </div>
            <button
              type="button"
              onClick={() => adjustValue(0.1)}
              aria-label={`Increase ${label}`}
              className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      </div>

      <input
        type="range"
        min={currentMin}
        max={currentMax}
        step={step}
        value={boundedValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-accent-600"
        style={{
          background: `linear-gradient(to right, #C2653A 0%, #C2653A ${percent}%, #E5E7EB ${percent}%, #E5E7EB 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1.5">
        <span>{currentMin} {unit}</span>
        <span>{currentMax} {unit}</span>
      </div>
    </div>
  );
};

export default RulerSlider;
