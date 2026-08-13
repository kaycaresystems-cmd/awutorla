# Maison L'Atelier

Bespoke Ghanaian tailoring workshop management system — React 19 + TypeScript +
Vite + Tailwind, backed by Supabase (Postgres, Auth, Edge Functions).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
npm run test                 # logic test suites (hubtel, whatsapp, workshop, intake, payments, schema)
npm run lint
```

## Accounts

There is no self-service signup.

- **Clients** get an account only via the Quick Intake walk-in flow (a tailor/admin
  registers them in person; they receive an SMS access code and sign in via the
  "Client Code" tab).
- **Staff** (tailor/admin) accounts are created by an existing admin from the Team
  Roles panel, which shows a one-time temporary password to hand off directly.
- The very first admin has to be bootstrapped manually — see
  [supabase/functions/create-staff-account/index.ts](supabase/functions/create-staff-account/index.ts)
  for why (it requires an existing admin to call it). Create a user in the Supabase
  dashboard (Authentication -> Add user), then set that user's `role` to `admin` in
  the `profiles` table.

## Deployment

**Frontend (Vercel):** connected to this GitHub repo — every push to `main` deploys
automatically. Framework preset: Vite. Build command: `npm run build`. Output
directory: `dist`. Required project environment variables: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` (Supabase dashboard -> Project Settings -> API).

**Backend (Supabase):** set up manually, not via CI. Run
[supabase/migrations/01_schema.sql](supabase/migrations/01_schema.sql),
[02_measurement_parameters.sql](supabase/migrations/02_measurement_parameters.sql),
and [03_storage_buckets.sql](supabase/migrations/03_storage_buckets.sql) once each,
in order, in the Supabase dashboard's SQL Editor (all idempotent — safe to re-run),
then deploy the 4 edge functions with the Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy create-walkin-client
supabase functions deploy create-staff-account
supabase functions deploy track-order --no-verify-jwt
supabase functions deploy resend-access-code --no-verify-jwt
```

`track-order` and `resend-access-code` need `--no-verify-jwt` — they're called by
anonymous/logged-out visitors and do their own scoped authorization inside instead
of Supabase's platform-level JWT check.

Hubtel SMS credentials are set once, independently of the above:

```bash
supabase secrets set HUBTEL_CLIENT_ID=... HUBTEL_CLIENT_SECRET=... HUBTEL_SENDER_ID=...
```

## Architecture notes

- `supabase/migrations/01_schema.sql` — profiles, orders, client_measurements,
  order_tasks tables, RLS policies, and the `handle_new_user` trigger that creates
  a `profiles` row (role defaulted to `client`) whenever an `auth.users` row is
  created.
- `supabase/migrations/03_storage_buckets.sql` — two public Storage buckets:
  `order-sketches` (intake reference images, uploaded from Quick Intake) and
  `invoices` (generated PDF invoices, uploaded when a tailor shares one via
  WhatsApp). Public so the resulting URLs work directly in `<img>` tags and
  WhatsApp links; writes are still restricted to signed-in tailors/admins by RLS.
- `supabase/functions/` — four edge functions, all using the service-role key
  server-side: `create-walkin-client`, `create-staff-account` (both verify the
  caller's role before acting), `track-order` and `resend-access-code` (both
  `--no-verify-jwt`, called by anonymous visitors, and do their own scoped
  authorization inside instead).
- `src/lib/auth.tsx` — the auth context plus the client-side wrappers around the
  three account-related edge functions above.
