import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Save,
  CheckCircle2,
  Lock,
  Loader2,
} from 'lucide-react';
import type { MeasurementParameter } from '../../types/workshop.types';
import { supabase } from '../../lib/supabase';
import { fetchMeasurementParameters } from '../../lib/measurementParameters';
import { cacheClientMeasurements } from '../../lib/offlineStore';
import { useAuth } from '../../lib/auth';

interface MeasurementVaultSyncProps {
  // Defaults to the signed-in user's own id ("My Profile"). Staff pass a
  // different client's id when editing that client's measurements.
  targetClientId?: string;
}

export const MeasurementVaultSync: React.FC<MeasurementVaultSyncProps> = ({ targetClientId }) => {
  const { user } = useAuth();
  const clientId = targetClientId || user?.id || '';

  const [parameters, setParameters] = useState<MeasurementParameter[]>([]);
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [values, setValues] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!clientId) {
      setIsLoading(false);
      return;
    }

    async function load() {
      setIsLoading(true);
      try {
        const [params, headerResult, valuesResult] = await Promise.all([
          fetchMeasurementParameters(),
          supabase.from('client_measurements').select('*').eq('client_id', clientId).maybeSingle(),
          supabase
            .from('client_measurement_values')
            .select('value, measurement_parameters(key)')
            .eq('client_id', clientId),
        ]);
        if (!isMounted) return;

        setParameters(params);
        const header = headerResult.data as any;
        setUnit(header?.unit === 'cm' ? 'cm' : 'in');
        setNotes(header?.notes || '');

        const nextValues: Record<string, number> = {};
        for (const row of (valuesResult.data || []) as any[]) {
          const key = row.measurement_parameters?.key;
          if (key) nextValues[key] = Number(row.value);
        }
        setValues(nextValues);
      } catch (err) {
        console.error('[MeasurementVaultSync] Failed to load measurements:', err);
        if (isMounted) setErrorMessage('Could not load measurements from the cloud.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [clientId]);

  const handleUnitToggle = (nextUnit: 'in' | 'cm') => {
    if (unit === nextUnit) return;
    const factor = nextUnit === 'cm' ? 2.54 : 1 / 2.54;
    const converted: Record<string, number> = {};
    for (const [key, val] of Object.entries(values)) {
      converted[key] = parseFloat((val * factor).toFixed(1));
    }
    setValues(converted);
    setUnit(nextUnit);
  };

  const handleValueChange = (key: string, raw: string) => {
    const parsed = parseFloat(raw);
    setValues((prev) => ({ ...prev, [key]: Number.isNaN(parsed) ? 0 : parsed }));
  };

  const handleSaveToSupabase = async () => {
    if (!clientId) return;
    setIsSyncing(true);
    setSyncSuccess(false);
    setErrorMessage(null);

    const nowIso = new Date().toISOString();

    try {
      const { error: headerError } = await (supabase.from('client_measurements') as any).upsert(
        { client_id: clientId, unit, notes, updated_at: nowIso },
        { onConflict: 'client_id' }
      );
      if (headerError) throw headerError;

      const rows = parameters
        .filter((p) => values[p.key] !== undefined && !Number.isNaN(values[p.key]))
        .map((p) => ({ client_id: clientId, parameter_id: p.id, value: values[p.key], updated_at: nowIso }));

      if (rows.length > 0) {
        const { error: valuesError } = await (supabase.from('client_measurement_values') as any).upsert(rows, {
          onConflict: 'client_id,parameter_id',
        });
        if (valuesError) throw valuesError;
      }

      cacheClientMeasurements(clientId, {
        clientId,
        clientName: '',
        clientPhone: '',
        unit,
        values,
        notes,
        updatedAt: nowIso,
      });
      setSyncSuccess(true);
    } catch (err) {
      console.error('[MeasurementVaultSync] Supabase sync failed:', err);
      setErrorMessage('Could not sync to the cloud. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass p-8 flex justify-center items-center gap-2 text-gray-500 text-sm">
        <Loader2 size={16} className="animate-spin" />
        <span>Loading measurements...</span>
      </div>
    );
  }

  return (
    <div className="glass p-6 sm:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent-50 text-accent-600 flex items-center justify-center">
            <Lock size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Sizing Vault</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                RLS Encrypted
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 font-sans">Client Tailoring Vault</h3>
          </div>
        </div>

        {/* Unit Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => handleUnitToggle('in')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              unit === 'in' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inches
          </button>
          <button
            onClick={() => handleUnitToggle('cm')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              unit === 'cm' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Metric
          </button>
        </div>
      </div>

      {/* Dynamic Measurement Parameter Grid */}
      {parameters.length === 0 ? (
        <div className="p-4 glass-inset text-sm text-gray-500 text-center">
          No measurement parameters have been set up yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {parameters.map((p) => (
            <div key={p.id} className="p-3 glass-inset text-center">
              <label htmlFor={`measurement-${p.key}`} className="text-[11px] text-gray-500 block mb-1">
                {p.label}
              </label>
              <input
                id={`measurement-${p.key}`}
                type="number"
                step="0.1"
                value={values[p.key] ?? ''}
                onChange={(e) => handleValueChange(p.key, e.target.value)}
                className="w-full bg-white/70 border border-gray-200 p-1.5 text-sm font-semibold text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">{unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Posture & Fitting Notes */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">Fitting & Posture Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Higher left shoulder posture, preference for high-waisted toile drape..."
          className="w-full glass-inset p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors leading-relaxed"
        />
      </div>

      {/* Success Notification Banner */}
      {syncSuccess && !errorMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Body profile synchronized with the database.</span>
        </div>
      )}

      {/* Sync Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-accent-50 border border-accent-100 text-gray-900 rounded-lg text-xs flex items-center gap-2">
          <ShieldCheck size={16} className="shrink-0 text-accent-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Linked to account — {user?.email || 'Not signed in'}</span>
        </div>

        <button
          onClick={handleSaveToSupabase}
          disabled={isSyncing || !clientId}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-br from-accent-500 to-accent-800 text-white hover:from-accent-600 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <Save size={15} />
              <span>Save & Sync</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default MeasurementVaultSync;
