import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Save,
  CheckCircle2,
  Lock,
  Loader2,
  Ruler,
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

    const now = new Date().toISOString();

    try {
      cacheClientMeasurements({
        unit,
        values,
        notes: notes.trim() || undefined,
        updatedAt: now,
      });

      const { error: headerError } = await (supabase.from('client_measurements') as any).upsert(
        {
          client_id: clientId,
          unit,
          notes: notes.trim() || null,
          updated_at: now,
        },
        { onConflict: 'client_id' }
      );
      if (headerError) throw headerError;

      const valueRows = parameters
        .filter((p) => values[p.key] !== undefined && !Number.isNaN(values[p.key]))
        .map((p) => ({
          client_id: clientId,
          parameter_id: p.id,
          value: values[p.key],
          updated_at: now,
        }));

      if (valueRows.length > 0) {
        const { error: valuesError } = await (supabase.from('client_measurement_values') as any).upsert(
          valueRows,
          { onConflict: 'client_id,parameter_id' }
        );
        if (valuesError) throw valuesError;
      }

      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('[MeasurementVaultSync] Save threw:', err);
      setIsSyncing(false);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save measurements.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col justify-center items-center gap-2 text-gray-500 text-sm">
        <Loader2 size={20} className="animate-spin text-accent-700" />
        <span>Synchronizing measurement vault...</span>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 glass rounded-3xl border border-gold-500/25 shadow-luxury space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-800 to-accent-950 text-gold-300 border border-gold-500/40 flex items-center justify-center shadow-sm">
            <Lock size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-accent-900 uppercase tracking-widest">Master Vault</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-semibold">
                RLS Protected
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-accent-950 font-display">Client Tailoring Passport</h3>
          </div>
        </div>

        {/* Unit Switcher */}
        <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl border border-gray-200/60 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => handleUnitToggle('in')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              unit === 'in' ? 'bg-gradient-to-r from-accent-800 to-accent-950 text-gold-300 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Inches
          </button>
          <button
            onClick={() => handleUnitToggle('cm')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              unit === 'cm' ? 'bg-gradient-to-r from-accent-800 to-accent-950 text-gold-300 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Metric (cm)
          </button>
        </div>
      </div>

      {/* Dynamic Measurement Parameter Grid */}
      {parameters.length === 0 ? (
        <div className="p-6 glass rounded-2xl text-xs text-gray-500 text-center">
          No measurement parameters configured in the master settings.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {parameters.map((p) => (
            <div key={p.id} className="p-3.5 glass rounded-2xl text-center border border-gray-200/70 hover:border-gold-500/30 transition-all shadow-sm">
              <label htmlFor={`measurement-${p.key}`} className="text-[11px] font-semibold text-gray-500 block mb-1 truncate">
                {p.label}
              </label>
              <input
                id={`measurement-${p.key}`}
                type="number"
                step="0.1"
                value={values[p.key] ?? ''}
                onChange={(e) => handleValueChange(p.key, e.target.value)}
                className="w-full bg-white/90 border border-gray-200/90 rounded-xl p-2 text-sm font-bold font-mono text-accent-950 text-center focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 shadow-sm"
              />
              <span className="text-[10px] text-gold-700 font-mono block mt-1 uppercase">{unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Posture & Fitting Notes */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Fitting & Posture Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Higher left shoulder posture, preference for high-waisted toile drape..."
          className="w-full bg-white/90 border border-gray-200/90 rounded-2xl p-3.5 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 leading-relaxed shadow-sm transition-all"
        />
      </div>

      {/* Success Notification Banner */}
      {syncSuccess && !errorMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in shadow-sm">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>Tailoring passport synchronized successfully with atelier database.</span>
        </div>
      )}

      {/* Sync Error Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
          <ShieldCheck size={16} className="shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-gray-200/80">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <ShieldCheck size={15} className="text-emerald-600" />
          <span>Linked to account — {user?.email || 'Not signed in'}</span>
        </div>

        <button
          onClick={handleSaveToSupabase}
          disabled={isSyncing || !clientId}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-accent-900/15 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <Loader2 size={15} className="animate-spin text-gold-300" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <Save size={15} className="text-gold-300" />
              <span>Save & Sync Passport</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default MeasurementVaultSync;
