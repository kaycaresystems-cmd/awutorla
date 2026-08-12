// Supabase Edge Function: create-staff-account
//
// Called from TeamRolesManager when an admin creates a tailor or admin account from
// the dashboard. This runs server-side because creating a Supabase auth user requires
// the service-role key, which must never be shipped to the browser.
//
// There is no self-service signup in this app (see AuthScreen — sign-in only). Client
// accounts come from create-walkin-client; staff accounts come from here, and only an
// existing admin may call this.
//
// On success it:
//   1. Creates a new auth user with a randomly generated temporary password and the
//      given role in user_metadata (the on_auth_user_created trigger reads that into
//      profiles.role — see supabase/migrations/01_schema.sql).
//   2. Returns the temporary password once, so the admin can hand it to the new staff
//      member directly (in person / by phone). They sign in via the normal email/
//      password tab and can change it any time — there is no email dependency here.
//
// Deploy: supabase functions deploy create-staff-account

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Deliberately not the same alphabet/length as client access codes (ACCESS_CODE_ALPHABET
// in create-walkin-client) — this is a real password meant to be changed, not a
// short code read off an SMS, so it uses a larger character set for more entropy.
const PASSWORD_ALPHABET =
  'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let password = '';
  for (const b of bytes) {
    password += PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length];
  }
  return password;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

    // Verify the caller is a signed-in admin — this function creates accounts with
    // elevated (tailor/admin) roles, so it must not be callable by anyone else.
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

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can create staff accounts.' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const fullName: string = (body?.fullName || '').trim();
    const email: string = (body?.email || '').trim().toLowerCase();
    const role: string = body?.role || '';
    const phone: string | undefined = body?.phone ? String(body.phone).trim() : undefined;

    if (!fullName || !email) {
      return new Response(JSON.stringify({ error: 'fullName and email are required.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Enter a valid email address.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    // Scoped to staff roles only — client accounts must go through create-walkin-client,
    // which attaches the walk-in intake flow (order, measurements) this endpoint doesn't.
    if (role !== 'tailor' && role !== 'admin') {
      return new Response(JSON.stringify({ error: 'role must be "tailor" or "admin".' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const tempPassword = generateTempPassword();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      phone: phone || undefined,
      email_confirm: true,
      phone_confirm: phone ? true : undefined,
      user_metadata: { full_name: fullName, role },
    });

    if (createError || !created?.user) {
      const message = createError?.message?.toLowerCase().includes('already')
        ? 'An account with this email already exists.'
        : createError?.message || 'Failed to create staff account.';
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ userId: created.user.id, tempPassword }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[create-staff-account] Unhandled error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
