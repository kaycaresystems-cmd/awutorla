import React, { useState } from 'react';
import { Users, Ruler, Store } from 'lucide-react';
import { TailorsManager } from '../components/admin/TailorsManager';
import { MeasurementParametersEditor } from '../components/admin/MeasurementParametersEditor';
import { BusinessSettingsEditor } from '../components/admin/BusinessSettingsEditor';

type SettingsSection = 'tailors' | 'measurements' | 'business';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'tailors', label: 'Tailors', icon: <Users size={15} />, description: 'Add staff accounts and manage roles.' },
  {
    id: 'measurements',
    label: 'Measurement Parameters',
    icon: <Ruler size={15} />,
    description: 'The shared list of measurement fields used across every client.',
  },
  { id: 'business', label: 'Business Info', icon: <Store size={15} />, description: 'Shop name, contact details, and message templates.' },
];

export const AdminSettings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('tailors');
  const current = SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <span className="text-xs font-medium text-accent-600">Admin Only</span>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage the team, sizing system, and shop details for the atelier.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeSection === s.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">{current.label}</h3>
        <p className="text-sm text-gray-500 mb-5">{current.description}</p>

        {activeSection === 'tailors' && <TailorsManager />}
        {activeSection === 'measurements' && <MeasurementParametersEditor />}
        {activeSection === 'business' && <BusinessSettingsEditor />}
      </div>
    </div>
  );
};

export default AdminSettings;
