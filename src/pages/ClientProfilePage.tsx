import React from 'react';
import { MeasurementVaultSync } from '../components/measurements/MeasurementVaultSync';

/**
 * "My Profile" — the client's own measurement vault. Defaults to the
 * signed-in user's own id (no targetClientId passed).
 */
export const ClientProfilePage: React.FC = () => (
  <div className="max-w-5xl mx-auto space-y-8">
    <div className="text-center space-y-3 max-w-xl mx-auto">
      <span className="text-xs font-medium text-accent-600">My Profile</span>
      <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Your Measurements</h2>
      <p className="text-sm text-gray-500">
        Keep your body profile up to date so every bespoke order fits perfectly.
      </p>
    </div>
    <MeasurementVaultSync />
  </div>
);

export default ClientProfilePage;
