// Supabase Edge Function: track-order
//
// Lets an anonymous visitor (no Supabase session) look up ONE order via the public
// ?track= links sent by SMS/WhatsApp, without opening the `orders` table to anonymous
// reads via RLS (which would let anyone with the public anon key pull every client's
// order history, phone number, and financials — order IDs here are short and guessable,
// so "know the ID" alone is not an acceptable bar for that kind of data).
//
// Requires BOTH the order ID and the phone number on file for that order to match —
// a compound credential, not just a guessable 3-digit order suffix. Returns only that
// one order + its tasks, using the service-role key server-side to bypass RLS safely
// (the function itself is what enforces the check, not a blanket policy relaxation).
//
// Signed-in users (clients viewing their own orders, staff viewing any order) don't use
// this function at all — they read `orders` directly through normal RLS, which already
// scopes correctly. This function exists only for the logged-out deep-link case.
//
// Deploy: supabase functions deploy track-order --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function sanitizeGhanaianPhoneNumber(phoneNumber: string): string {
  let digits = phoneNumber.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '233' + digits.substring(1);
  } else if (digits.startsWith('233') && digits.length === 12) {
    // already correct
  } else if (digits.length === 9) {
    digits = '233' + digits;
  }
  if (digits.length !== 12 || !digits.startsWith('233')) {
    throw new Error(`Invalid Ghanaian phone number: '${phoneNumber}'`);
  }
  return digits;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const orderId: string = (body?.orderId || '').trim();
    const rawPhone: string = body?.phone || '';

    if (!orderId || !rawPhone) {
      return new Response(JSON.stringify({ error: 'orderId and phone are both required.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let sanitizedPhone: string;
    try {
      sanitizedPhone = sanitizeGhanaianPhoneNumber(rawPhone);
    } catch {
      return new Response(JSON.stringify({ error: 'Enter a valid Ghanaian phone number.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .ilike('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;

    if (!order || order.client_phone !== sanitizedPhone) {
      // Same generic message either way — don't reveal whether the order ID exists.
      return new Response(JSON.stringify({ error: 'No matching order found for that ID and phone number.' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: tasks, error: tasksError } = await admin
      .from('order_tasks')
      .select('*')
      .eq('order_id', order.id);
    if (tasksError) throw tasksError;

    return new Response(JSON.stringify({ order, tasks: tasks || [] }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[track-order] Unhandled error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
