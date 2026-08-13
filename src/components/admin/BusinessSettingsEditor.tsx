import React, { useEffect, useState } from 'react';
import { Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AppSettings } from '../../lib/settings';
import { fetchAppSettings, updateAppSetting, DEFAULT_APP_SETTINGS } from '../../lib/settings';

const inputClass =
  'w-full bg-white/70 border border-gray-200 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors';
const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

export const BusinessSettingsEditor: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAppSettings()
      .then((data) => {
        if (isMounted) setSettings(data);
      })
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : String(err)))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (key: keyof AppSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);
    try {
      await Promise.all((Object.keys(settings) as (keyof AppSettings)[]).map((key) => updateAppSetting(key, settings[key])));
      setSaveSuccess(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center gap-2 text-gray-500 text-sm">
        <Loader2 size={16} className="animate-spin" />
        <span>Loading business settings...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Business Name</label>
          <input
            type="text"
            value={settings.business_name}
            onChange={(e) => handleChange('business_name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Currency Code</label>
          <input
            type="text"
            value={settings.currency}
            onChange={(e) => handleChange('currency', e.target.value.toUpperCase())}
            maxLength={3}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Contact Phone</label>
          <input
            type="tel"
            value={settings.contact_phone}
            onChange={(e) => handleChange('contact_phone', e.target.value)}
            placeholder="024XXXXXXX"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Contact Email</label>
          <input
            type="email"
            value={settings.contact_email}
            onChange={(e) => handleChange('contact_email', e.target.value)}
            placeholder="hello@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>WhatsApp Delivery Message Template</label>
        <textarea
          rows={2}
          value={settings.whatsapp_delivery_message}
          onChange={(e) => handleChange('whatsapp_delivery_message', e.target.value)}
          className={`${inputClass} leading-relaxed`}
        />
        <p className="text-xs text-gray-400 mt-1">Use {'{orderId}'} and {'{businessName}'} as placeholders.</p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Business settings saved.</span>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 bg-gradient-to-br from-accent-500 to-accent-800 text-white hover:from-accent-600 text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span>Save Settings</span>
        </button>
      </div>
    </form>
  );
};

export default BusinessSettingsEditor;
