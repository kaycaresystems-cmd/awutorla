import React, { useState } from 'react';
import {
  ShieldCheck,
  Save,
  CheckCircle2,
  Lock,
  Loader2,
} from 'lucide-react';
import type { ClientBodyMeasurements } from '../../types/workshop.types';
import { supabase } from '../../lib/supabase';
import { cacheClientMeasurements } from '../../lib/offlineStore';
import { useAuth } from '../../lib/auth';

interface MeasurementVaultSyncProps {
  measurements: ClientBodyMeasurements;
  onMeasurementsChange: (updated: ClientBodyMeasurements) => void;
}

export const MeasurementVaultSync: React.FC<MeasurementVaultSyncProps> = ({
  measurements,
  onMeasurementsChange,
}) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>(measurements.notes || 'Prefers relaxed fit on waist for formal dinners.');

  const handleUnitToggle = (unit: 'in' | 'cm') => {
    if (measurements.unit === unit) return;

    const factor = unit === 'cm' ? 2.54 : 1 / 2.54;
    const round = (val: number) => parseFloat((val * factor).toFixed(1));

    const updated: ClientBodyMeasurements = {
      ...measurements,
      unit,
      bust: round(measurements.bust),
      waist: round(measurements.waist),
      hips: round(measurements.hips),
      shoulder: round(measurements.shoulder),
      sleeveLength: round(measurements.sleeveLength),
      neckToWaist: round(measurements.neckToWaist),
      updatedAt: new Date().toISOString(),
    };

    onMeasurementsChange(updated);
  };

  const handleSaveToSupabase = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    setErrorMessage(null);

    const payload: ClientBodyMeasurements = {
      ...measurements,
      notes,
      updatedAt: new Date().toISOString(),
    };

    onMeasurementsChange(payload);
    cacheClientMeasurements(payload.clientId, payload);

    if (user) {
      try {
        const { error } = await (supabase.from('client_measurements') as any).upsert(
          {
            client_id: user.id,
            unit: payload.unit,
            bust: payload.bust,
            waist: payload.waist,
            hips: payload.hips,
            shoulder: payload.shoulder,
            sleeve_length: payload.sleeveLength,
            neck_to_waist: payload.neckToWaist,
            notes: payload.notes,
            updated_at: payload.updatedAt,
          },
          { onConflict: 'client_id' }
        );
        if (error) {
          console.error('[MeasurementVaultSync] Supabase upsert failed:', error);
          setErrorMessage('Saved locally, but cloud sync failed. It will retry next time you save.');
        }
      } catch (err) {
        console.error('[MeasurementVaultSync] Supabase upsert threw:', err);
        setErrorMessage('Saved locally, but cloud sync failed. It will retry next time you save.');
      }
    }

    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
    }, 400);
  };

  return (
    <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center">
            <Lock size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Sizing Vault</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                RLS Encrypted
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Client Tailoring Vault</h3>
          </div>
        </div>

        {/* Unit Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-stretch sm:self-auto justify-center">
          <button
            onClick={() => handleUnitToggle('in')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              measurements.unit === 'in' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inches
          </button>
          <button
            onClick={() => handleUnitToggle('cm')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              measurements.unit === 'cm' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Metric
          </button>
        </div>
      </div>

      {/* 6-Point Dimension Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
          <span className="text-[11px] text-gray-500 block">Bust</span>
          <span className="text-lg font-semibold text-gray-900">{measurements.bust}</span>
          <span className="text-[10px] text-gray-400 block">{measurements.unit}</span>
        </div>
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
          <span className="text-[11px] text-gray-500 block">Waist</span>
          <span className="text-lg font-semibold text-gray-900">{measurements.waist}</span>
          <span className="text-[10px] text-gray-400 block">{measurements.unit}</span>
        </div>
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
          <span className="text-[11px] text-gray-500 block">Hips</span>
          <span className="text-lg font-semibold text-gray-900">{measurements.hips}</span>
          <span className="text-[10px] text-gray-400 block">{measurements.unit}</span>
        </div>
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
          <span className="text-[11px] text-gray-500 block">Shoulder</span>
          <span className="text-lg font-semibold text-gray-900">{measurements.shoulder}</span>
          <span className="text-[10px] text-gray-400 block">{measurements.unit}</span>
        </div>
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
          <span className="text-[11px] text-gray-500 block">Sleeve</span>
          <span className="text-lg font-semibold text-gray-900">{measurements.sleeveLength}</span>
          <span className="text-[10px] text-gray-400 block">{measurements.unit}</span>
        </div>
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
          <span className="text-[11px] text-gray-500 block">Neck-Waist</span>
          <span className="text-lg font-semibold text-gray-900">{measurements.neckToWaist}</span>
          <span className="text-[10px] text-gray-400 block">{measurements.unit}</span>
        </div>
      </div>

      {/* Posture & Fitting Notes */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">Fitting & Posture Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Higher left shoulder posture, preference for high-waisted toile drape..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors leading-relaxed"
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
      {syncSuccess && errorMessage && (
        <div className="p-3 bg-accent-50 border border-accent-100 text-gray-900 rounded-lg text-xs flex items-center gap-2">
          <ShieldCheck size={16} className="shrink-0 text-accent-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Linked to account — {user?.email || 'Not signed in'}</span>
        </div>

        <button
          onClick={handleSaveToSupabase}
          disabled={isSyncing}
          className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 text-white hover:bg-accent-600 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
