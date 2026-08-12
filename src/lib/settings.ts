import { supabase } from './supabase';

export interface AppSettings {
  business_name: string;
  contact_phone: string;
  contact_email: string;
  currency: string;
  whatsapp_delivery_message: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  business_name: "Maison L'Atelier",
  contact_phone: '',
  contact_email: '',
  currency: 'GHS',
  whatsapp_delivery_message: "Order #{orderId} has been delivered. Thank you for commissioning {businessName}.",
};

/**
 * Reads the business/branding settings (shop name, contact info, currency,
 * message templates). Readable by every signed-in user (the shop name and
 * currency are shown throughout the app), writable by admins only.
 */
export async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error) throw error;

  const settings: AppSettings = { ...DEFAULT_APP_SETTINGS };
  for (const row of (data || []) as any[]) {
    if (row.key in settings) {
      (settings as any)[row.key] = row.value ?? (settings as any)[row.key];
    }
  }
  return settings;
}

export async function updateAppSetting(key: keyof AppSettings, value: string): Promise<void> {
  const { error } = await (supabase.from('app_settings') as any).upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
  if (error) throw error;
}
