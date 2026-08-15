// Supabase Edge Function: resend-access-code
//
// Self-service recovery for a walk-in client who lost their SMS access code — no
// staff visit required. Takes just a phone number and, if it belongs to a walk-in
// account, rotates the access code and re-sends it by SMS.
//
// Security note: this is intentionally scoped to ONLY accounts created by
// create-walkin-client (identified by their synthetic @walkin.clients.internal
// email). It must never touch staff accounts created by create-staff-account, which
// use real emails — otherwise anyone who knows or guesses a staff member's phone
// number could silently take over their account by rotating its password here.
// Scoping by email domain is what prevents that.
//
// Known limitation: this endpoint has no rate limiting of its own. Before relying
// on it at real volume, add a rate limit (Supabase project settings, or a proxy in
// front) so it can't be used to spam an arbitrary phone number with SMS.
//
// Deploy: supabase functions deploy resend-access-code --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const WALKIN_EMAIL_DOMAIN = 'walkin.clients.internal';

function generateAccessCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) {
    code += ACCESS_CODE_ALPHABET[b % ACCESS_CODE_ALPHABET.length];
  }
  return code;
}

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

async function sendHubtelSms(to: string, content: string): Promise<boolean> {
  const clientId = Deno.env.get('HUBTEL_CLIENT_ID');
  const clientSecret = Deno.env.get('HUBTEL_CLIENT_SECRET');
  const senderId = Deno.env.get('HUBTEL_SENDER_ID') || 'Awutorla';

  if (!clientId || !clientSecret) {
    console.warn('[resend-access-code] Hubtel SMS credentials not configured — skipping SMS send.');
    return false;
  }

  try {
    const url = new URL('https://smsc.hubtel.com/v1/messages/send');
    url.searchParams.set('clientid', clientId);
    url.searchParams.set('clientsecret', clientSecret);
    url.searchParams.set('from', senderId);
    url.searchParams.set('to', to);
    url.searchParams.set('content', content);

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      console.error('[resend-access-code] Hubtel SMS API error:', response.status, await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[resend-access-code] Hubtel SMS send threw:', err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Generic response used for every "can't help you" outcome — never reveal whether
  // a phone number is registered, or why a reset didn't happen.
  const genericOk = () =>
    new Response(
      JSON.stringify({
        message: 'If that phone number has a client account, a new access code has been sent by SMS.',
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  try {
    const body = await req.json();
    const rawPhone: string = body?.phone || '';
    if (!rawPhone) {
      return new Response(JSON.stringify({ error: 'Phone number is required.' }), {
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

    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('phone_number', sanitizedPhone)
      .maybeSingle();

    if (!profile) return genericOk();

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
    if (userError || !userData?.user) return genericOk();

    // The one check that matters: only rotate the password for accounts created by
    // create-walkin-client (synthetic email), never a real self-registered account.
    if (!userData.user.email?.endsWith(`@${WALKIN_EMAIL_DOMAIN}`)) {
      return genericOk();
    }

    const newCode = generateAccessCode();
    const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
      password: newCode,
    });
    if (updateError) throw updateError;

    await sendHubtelSms(
      sanitizedPhone,
      `Hi ${profile.full_name || ''}, your new Awutorla access code is ${newCode}.`.trim()
    );

    return genericOk();
  } catch (err) {
    console.error('[resend-access-code] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
