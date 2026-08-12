-- ==============================================================================
-- GHANAIAN BESPOKE ATELIER SUPABASE SCHEMA
-- Migration: 02_measurement_parameters.sql
-- Description: Replaces the fixed 6-column measurement schema with an
--              admin-managed, global list of measurement parameters shared by
--              every client, plus a simple key-value business settings table.
-- ==============================================================================

-- ==============================================================================
-- 1. TABLES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- MEASUREMENT PARAMETERS
-- Admin-defined list of body measurement fields, shared by every client.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.measurement_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- CLIENT MEASUREMENT VALUES
-- One row per (client, parameter) — replaces the fixed bust/waist/hips/... columns
-- on client_measurements so admins can add parameters without a schema change.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_measurement_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parameter_id UUID NOT NULL REFERENCES public.measurement_parameters(id) ON DELETE CASCADE,
    value NUMERIC(6,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_client_parameter UNIQUE (client_id, parameter_id)
);

-- ------------------------------------------------------------------------------
-- APP SETTINGS
-- Simple key-value store for business/branding info (shop name, contact,
-- currency, message templates) that was previously hardcoded in the app.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. SEED DEFAULT MEASUREMENT PARAMETERS
-- ==============================================================================
-- Preserves the current 6 fields as the starting parameter list so existing
-- clients' measurements carry over via the backfill below.
INSERT INTO public.measurement_parameters (key, label, display_order)
VALUES
    ('bust', 'Bust', 1),
    ('waist', 'Waist', 2),
    ('hips', 'Hips', 3),
    ('shoulder', 'Shoulder', 4),
    ('sleeve_length', 'Sleeve Length', 5),
    ('neck_to_waist', 'Neck to Waist', 6)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 3. BACKFILL EXISTING MEASUREMENTS INTO THE NEW VALUE TABLE
-- ==============================================================================
INSERT INTO public.client_measurement_values (client_id, parameter_id, value)
SELECT cm.client_id, mp.id, cm.bust
FROM public.client_measurements cm
JOIN public.measurement_parameters mp ON mp.key = 'bust'
WHERE cm.bust IS NOT NULL
ON CONFLICT (client_id, parameter_id) DO NOTHING;

INSERT INTO public.client_measurement_values (client_id, parameter_id, value)
SELECT cm.client_id, mp.id, cm.waist
FROM public.client_measurements cm
JOIN public.measurement_parameters mp ON mp.key = 'waist'
WHERE cm.waist IS NOT NULL
ON CONFLICT (client_id, parameter_id) DO NOTHING;

INSERT INTO public.client_measurement_values (client_id, parameter_id, value)
SELECT cm.client_id, mp.id, cm.hips
FROM public.client_measurements cm
JOIN public.measurement_parameters mp ON mp.key = 'hips'
WHERE cm.hips IS NOT NULL
ON CONFLICT (client_id, parameter_id) DO NOTHING;

INSERT INTO public.client_measurement_values (client_id, parameter_id, value)
SELECT cm.client_id, mp.id, cm.shoulder
FROM public.client_measurements cm
JOIN public.measurement_parameters mp ON mp.key = 'shoulder'
WHERE cm.shoulder IS NOT NULL
ON CONFLICT (client_id, parameter_id) DO NOTHING;

INSERT INTO public.client_measurement_values (client_id, parameter_id, value)
SELECT cm.client_id, mp.id, cm.sleeve_length
FROM public.client_measurements cm
JOIN public.measurement_parameters mp ON mp.key = 'sleeve_length'
WHERE cm.sleeve_length IS NOT NULL
ON CONFLICT (client_id, parameter_id) DO NOTHING;

INSERT INTO public.client_measurement_values (client_id, parameter_id, value)
SELECT cm.client_id, mp.id, cm.neck_to_waist
FROM public.client_measurements cm
JOIN public.measurement_parameters mp ON mp.key = 'neck_to_waist'
WHERE cm.neck_to_waist IS NOT NULL
ON CONFLICT (client_id, parameter_id) DO NOTHING;

-- ==============================================================================
-- 4. DROP FIXED MEASUREMENT COLUMNS
-- ==============================================================================
-- client_measurements keeps only client_id/unit/notes as the per-client header
-- row; the actual values now live in client_measurement_values.
ALTER TABLE public.client_measurements
    DROP COLUMN IF EXISTS bust,
    DROP COLUMN IF EXISTS waist,
    DROP COLUMN IF EXISTS hips,
    DROP COLUMN IF EXISTS neck_to_waist,
    DROP COLUMN IF EXISTS shoulder,
    DROP COLUMN IF EXISTS sleeve_length;

-- ==============================================================================
-- 5. SEED DEFAULT BUSINESS SETTINGS
-- ==============================================================================
INSERT INTO public.app_settings (key, value)
VALUES
    ('business_name', '"Maison L''Atelier"'::jsonb),
    ('contact_phone', '""'::jsonb),
    ('contact_email', '""'::jsonb),
    ('currency', '"GHS"'::jsonb),
    ('whatsapp_delivery_message', '"Order #{orderId} has been delivered. Thank you for commissioning {businessName}."'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 6. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_measurement_parameters_display_order ON public.measurement_parameters(display_order);
CREATE INDEX IF NOT EXISTS idx_client_measurement_values_client ON public.client_measurement_values(client_id);
CREATE INDEX IF NOT EXISTS idx_client_measurement_values_parameter ON public.client_measurement_values(parameter_id);

-- ==============================================================================
-- 7. UPDATED_AT TRIGGERS (reuses public.handle_updated_at() from 01_schema.sql)
-- ==============================================================================
DROP TRIGGER IF EXISTS set_measurement_parameters_updated_at ON public.measurement_parameters;
CREATE TRIGGER set_measurement_parameters_updated_at
    BEFORE UPDATE ON public.measurement_parameters
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_client_measurement_values_updated_at ON public.client_measurement_values;
CREATE TRIGGER set_client_measurement_values_updated_at
    BEFORE UPDATE ON public.client_measurement_values
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.measurement_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_measurement_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- MEASUREMENT PARAMETERS POLICIES
-- ------------------------------------------------------------------------------
-- Readable by every signed-in user (clients need the labels to render their own
-- measurement form), writable by admins only.
DROP POLICY IF EXISTS "Measurement parameters are viewable by authenticated users" ON public.measurement_parameters;
CREATE POLICY "Measurement parameters are viewable by authenticated users"
    ON public.measurement_parameters FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage measurement parameters" ON public.measurement_parameters;
CREATE POLICY "Admins can manage measurement parameters"
    ON public.measurement_parameters FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- CLIENT MEASUREMENT VALUES POLICIES
-- Mirrors the client_measurements ownership pattern from 01_schema.sql.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Clients can view their own measurement values" ON public.client_measurement_values;
CREATE POLICY "Clients can view their own measurement values"
    ON public.client_measurement_values FOR SELECT
    TO authenticated
    USING (auth.uid() = client_id OR public.is_tailor());

DROP POLICY IF EXISTS "Clients can manage their own measurement values" ON public.client_measurement_values;
CREATE POLICY "Clients can manage their own measurement values"
    ON public.client_measurement_values FOR ALL
    TO authenticated
    USING (auth.uid() = client_id OR public.is_tailor())
    WITH CHECK (auth.uid() = client_id OR public.is_tailor());

-- ------------------------------------------------------------------------------
-- APP SETTINGS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "App settings are viewable by authenticated users" ON public.app_settings;
CREATE POLICY "App settings are viewable by authenticated users"
    ON public.app_settings FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings"
    ON public.app_settings FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
