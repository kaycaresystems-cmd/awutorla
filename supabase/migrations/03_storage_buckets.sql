-- ==============================================================================
-- STORAGE BUCKETS FOR SKETCH UPLOADS & INVOICE PDFs
-- Migration: 03_storage_buckets.sql
-- Description: Public buckets for intake reference sketches/swatches and
--              generated invoice PDFs. Public so client-facing views (the
--              order tracker, WhatsApp invoice links) can load them by URL
--              with no signed-URL refresh logic; writes are still restricted
--              to signed-in tailors/admins via RLS below.
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'order-sketches',
    'order-sketches',
    true,
    10485760, -- 10 MB
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invoices',
    'invoices',
    true,
    10485760, -- 10 MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- RLS: only tailors/admins may write; public bucket reads bypass RLS entirely
-- (Supabase serves public-bucket objects via the public URL route without
-- checking storage.objects policies), so no SELECT policy is needed here.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tailors and admins can upload order sketches" ON storage.objects;
CREATE POLICY "Tailors and admins can upload order sketches"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'order-sketches' AND public.is_tailor());

DROP POLICY IF EXISTS "Tailors and admins can update order sketches" ON storage.objects;
CREATE POLICY "Tailors and admins can update order sketches"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'order-sketches' AND public.is_tailor())
    WITH CHECK (bucket_id = 'order-sketches' AND public.is_tailor());

DROP POLICY IF EXISTS "Tailors and admins can delete order sketches" ON storage.objects;
CREATE POLICY "Tailors and admins can delete order sketches"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'order-sketches' AND public.is_tailor());

DROP POLICY IF EXISTS "Tailors and admins can upload invoices" ON storage.objects;
CREATE POLICY "Tailors and admins can upload invoices"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'invoices' AND public.is_tailor());

DROP POLICY IF EXISTS "Tailors and admins can update invoices" ON storage.objects;
CREATE POLICY "Tailors and admins can update invoices"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'invoices' AND public.is_tailor())
    WITH CHECK (bucket_id = 'invoices' AND public.is_tailor());

DROP POLICY IF EXISTS "Tailors and admins can delete invoices" ON storage.objects;
CREATE POLICY "Tailors and admins can delete invoices"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'invoices' AND public.is_tailor());
