import React from 'react';
import { Ruler } from 'lucide-react';
import { MeasurementVaultSync } from '../components/measurements/MeasurementVaultSync';

/**
 * "My Profile" — the client's own measurement vault.
 */
export const ClientProfilePage: React.FC = () => (
  <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
    <div className="text-center space-y-2 max-w-xl mx-auto">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-accent-800 bg-accent-50/80 border border-accent-200/60 shadow-sm">
        <Ruler size={13} className="text-gold-600" />
        <span>Bespoke Stature Profile</span>
      </div>
      <h2 className="text-3xl sm:text-4xl text-accent-950 font-display font-semibold tracking-tight">Your Measurements</h2>
      <p className="text-xs sm:text-sm text-gray-500 font-sans">
        Keep your body profile up to date so every bespoke piece fits with millimeter perfection.
      </p>
    </div>
    <MeasurementVaultSync />
  </div>
);

export default ClientProfilePage;
