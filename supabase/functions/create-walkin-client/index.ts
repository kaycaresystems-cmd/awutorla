// Supabase Edge Function: create-walkin-client
//
// Called from QuickIntakeModal when a tailor registers a walk-in bespoke client who has
// no Maison account. This runs server-side because creating a Supabase auth user requires
// the service-role key, which must never be shipped to the browser.
//
// On success it:
//   1. Creates a new client account (or reuses an existing one matched by phone number),
//      with a random single-field "access code" as both the account's password and the
//      thing the client actually logs in with (see src/lib/auth.tsx: signInWithClientCode).
//   2. Sends that code to the client via Hubtel SMS.
//   3. Returns the real profiles/auth id so the caller can attach it to the order and
//      client_measurements row it's about to create.
//
// Deploy: supabase functions deploy create-walkin-client
// Secrets required (supabase secrets set ...): HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET,
// HUBTEL_SENDER_ID. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L — easy to read off an SMS

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
  const senderId = Deno.env.get('HUBTEL_SENDER_ID') || 'MaisonAtelier';

  if (!clientId || !clientSecret) {
    console.warn('[create-walkin-client] Hubtel SMS credentials not configured — skipping SMS send.');
    return false;
  }

  try {
    // Hubtel Quick/Transactional SMS API. Verify this endpoint against current Hubtel
    // API docs before relying on it in production — Hubtel has changed SMS endpoints
    // across API generations and this was not tested against a live account.
    const url = new URL('https://smsc.hubtel.com/v1/messages/send');
    url.searchParams.set('clientid', clientId);
    url.searchParams.set('clientsecret', clientSecret);
    url.searchParams.set('from', senderId);
    url.searchParams.set('to', to);
    url.searchParams.set('content', content);

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      console.error('[create-walkin-client] Hubtel SMS API error:', response.status, await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[create-walkin-client] Hubtel SMS send threw:', err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';

    // Verify the caller is a signed-in tailor/admin — this function creates accounts on
    // behalf of other people, so it must not be callable by an arbitrary signed-in client.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ error: 'Not signed in.' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .maybeSingle();

    if (!callerProfile || (callerProfile.role !== 'tailor' && callerProfile.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Only atelier staff can register walk-in clients.' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const fullName: string = (body?.fullName || '').trim();
    const rawPhone: string = body?.phone || '';

    if (!fullName || !rawPhone) {
      return new Response(JSON.stringify({ error: 'fullName and phone are required.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const sanitizedPhone = sanitizeGhanaianPhoneNumber(rawPhone);
    const accessCode = generateAccessCode();

    // Reuse the existing account for a returning walk-in client instead of duplicating them.
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('phone_number', sanitizedPhone)
      .maybeSingle();

    let clientId: string;
    let isNewAccount: boolean;

    if (existingProfile?.id) {
      clientId = existingProfile.id;
      isNewAccount = false;

      const { error: updateAuthError } = await admin.auth.admin.updateUserById(clientId, {
        password: accessCode,
      });
      if (updateAuthError) throw updateAuthError;

      await admin.from('profiles').update({ full_name: fullName }).eq('id', clientId);
    } else {
      isNewAccount = true;
      const syntheticEmail = `${accessCode.toLowerCase()}@walkin.clients.internal`;

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: accessCode,
        phone: sanitizedPhone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { full_name: fullName, role: 'client' },
      });
      if (createError || !created?.user) {
        throw createError || new Error('Failed to create walk-in client account.');
      }
      clientId = created.user.id;
    }

    const smsContent = isNewAccount
      ? `Welcome to Maison L'Atelier, ${fullName}! Your client account is ready. Your access code is ${accessCode} — use it to sign in and track your order any time.`
      : `Hi ${fullName}, your Maison L'Atelier access code is ${accessCode}. Use it to sign in and track your order.`;
    const smsSent = await sendHubtelSms(sanitizedPhone, smsContent);

    return new Response(
      JSON.stringify({ clientId, accessCode, isNewAccount, smsSent }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[create-walkin-client] Unhandled error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
