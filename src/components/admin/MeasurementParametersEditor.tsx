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
 * Admin console for the global, admin-defined measurement parameter list
 * (bust, waist, ... plus anything an admin adds). The same list applies to
 * every client — this is not a per-client custom-field builder.
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        This list applies to every client's measurement profile — add a parameter here and it appears on every
        client's Sizing Vault immediately.
      </p>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. Thigh Circumference"
          className="flex-1 bg-white/70 border border-gray-200 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500"
        />
        <button
          type="submit"
          disabled={isCreating || !newLabel.trim()}
          className="px-4 py-2.5 bg-gradient-to-br from-accent-500 to-accent-800 text-white hover:from-accent-600 text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          <span>Add Parameter</span>
        </button>
      </form>

      {isLoading ? (
        <div className="p-8 flex justify-center items-center gap-2 text-gray-500 text-sm">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading parameters...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {parameters.map((p, index) => (
            <div
              key={p.id}
              className={`p-3.5 border flex items-center justify-between gap-3 ${
                p.isActive ? 'glass-inset' : 'bg-gray-50/50 border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Ruler size={15} className="text-accent-600 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.label}</div>
                  <div className="text-xs text-gray-400">{p.key}</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={busyId === p.id || index === 0}
                  onClick={() => handleMove(index, -1)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id || index === parameters.length - 1}
                  onClick={() => handleMove(index, 1)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => handleToggleActive(p)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                >
                  {p.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
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
