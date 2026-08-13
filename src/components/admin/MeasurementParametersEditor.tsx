import React, { useEffect, useState } from 'react';
import { Ruler, Plus, Loader2, AlertCircle, ArrowUp, ArrowDown, EyeOff, Eye } from 'lucide-react';
import type { MeasurementParameter } from '../../types/workshop.types';
import {
  fetchMeasurementParameters,
  createMeasurementParameter,
  setMeasurementParameterActive,
  reorderMeasurementParameter,
} from '../../lib/measurementParameters';

/**
 * Admin console for the global, admin-defined measurement parameter schema.
 */
export const MeasurementParametersEditor: React.FC = () => {
  const [parameters, setParameters] = useState<MeasurementParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const params = await fetchMeasurementParameters(true);
      setParameters(params);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const nextOrder = parameters.length > 0 ? Math.max(...parameters.map((p) => p.displayOrder)) + 1 : 1;
      const created = await createMeasurementParameter(newLabel.trim(), nextOrder);
      setParameters((prev) => [...prev, created]);
      setNewLabel('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (param: MeasurementParameter) => {
    setBusyId(param.id);
    const previous = parameters;
    setParameters((prev) => prev.map((p) => (p.id === param.id ? { ...p, isActive: !p.isActive } : p)));
    try {
      await setMeasurementParameterActive(param.id, !param.isActive);
    } catch (err) {
      setParameters(previous);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= parameters.length) return;

    const reordered = [...parameters];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setParameters(reordered);
    setBusyId(reordered[index].id);

    try {
      await Promise.all([
        reorderMeasurementParameter(reordered[index].id, index),
        reorderMeasurementParameter(reordered[target].id, target),
      ]);
      setParameters((prev) =>
        prev.map((p, i) => (p.id === reordered[index].id || p.id === reordered[target].id ? { ...p, displayOrder: i } : p))
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <p className="text-xs text-gray-500 font-sans">
        This master list applies across all client passports — add or toggle a parameter here to update the atelier's global measurement schema.
      </p>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Add Parameter Input Bar */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. Thigh Circumference, Bicep Width..."
          className="flex-1 bg-white/90 border border-gray-200/90 rounded-xl p-2.5 pl-4 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 shadow-sm transition-all"
        />
        <button
          type="submit"
          disabled={isCreating || !newLabel.trim()}
          className="px-5 py-2.5 bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-accent-900/15 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
        >
          {isCreating ? <Loader2 size={14} className="animate-spin text-gold-300" /> : <Plus size={15} className="text-gold-300" />}
          <span>Add Parameter</span>
        </button>
      </form>

      {isLoading ? (
        <div className="p-8 flex justify-center items-center gap-2 text-gray-500 text-sm">
          <Loader2 size={18} className="animate-spin text-accent-700" />
          <span>Loading parameter schema...</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {parameters.map((p, index) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                p.isActive ? 'glass border-gold-500/20 shadow-sm' : 'bg-gray-50/70 border-gray-200/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gold-50 text-gold-700 border border-gold-500/20 flex items-center justify-center shrink-0">
                  <Ruler size={15} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-accent-950">{p.label}</div>
                  <div className="text-[11px] text-gray-400 font-mono">{p.key}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busyId === p.id || index === 0}
                  onClick={() => handleMove(index, -1)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gold-50 transition-colors disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id || index === parameters.length - 1}
                  onClick={() => handleMove(index, 1)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gold-50 transition-colors disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => handleToggleActive(p)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm ${
                    p.isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
                >
                  {p.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{p.isActive ? 'Active' : 'Hidden'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeasurementParametersEditor;
