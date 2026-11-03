# Reactify Cheque Printer System

A comprehensive cheque printing solution for Nepalese banks, built with Next.js, TypeScript, and PostgreSQL.

## Architecture

A single Next.js application (App Router) containing the marketing site, the
user dashboard and the admin panel, with i18n for `en` / `ne`.

## Tech Stack

- Next.js 14 (App Router, RSC)
- TypeScript
- PostgreSQL + Prisma 5
- Auth.js (NextAuth v5 beta) — credentials provider, JWT sessions
- Tailwind CSS v4
- Zod validation
- next-intl

## Getting Started

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push   # this project has no migration history - see below
npm run db:seed   # idempotent: plans, banks, bank templates, system settings
npm run dev
```

The bootstrap admin account is created through the existing
`POST /api/admin/bootstrap` endpoint (or `npm run db:bootstrap-admin`), which
requires `ADMIN_BOOTSTRAP_SECRET`. Admin credentials are never hard-coded.

## Environment variables actually read by the code

The complete variable-by-variable inventory, the numbered Vercel configuration
list, and the obsolete-variable list live in [`ENVIRONMENT.md`](ENVIRONMENT.md).
Summary:

### Required (all environments)

| Variable       | Used by                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | `prisma/schema.prisma` + `src/lib/env.ts` — Prisma **runtime** connection to Supabase Postgres (transaction pooler, port 6543)            |
| `AUTH_SECRET`  | Auth.js session/JWT signing (`src/auth.ts`, `src/lib/auth-token.ts`, middleware); validated at startup by `src/lib/env.ts` (min 32 chars) |

### Required only where Prisma CLI runs

| Variable              | Used by                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIRECT_DATABASE_URL` | `prisma/schema.prisma` `directUrl` — direct (non-pooler) host for `db push` / `db execute` / `migrate` / `studio`. **Not read at application runtime**; `prisma generate` and the Vercel build do not need it |

### Production-only

| Variable                 | Used by                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_BOOTSTRAP_SECRET` | `/api/admin/bootstrap`, `prisma/bootstrap-admin.ts` — required to create the first admin in Production; optional locally (the endpoint reports a clear error if unset) |

### Optional

| Variable              | Used by                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | `src/lib/config.ts` — canonical app URL for links/canonical/OG tags. Set it in Preview and Production (falls back to `localhost`) |
| `ENABLE_CALIBRATION`  | `src/middleware.ts` — exposes `/dev/calibration` in production (default off; always available in development)                     |
| `TRUST_PROXY_HEADERS` | `src/lib/rate-limit.ts` — trust `X-Forwarded-*` only when self-hosting behind a reverse proxy; **not** needed on Vercel           |

### Not read anywhere — do not add

`ENCRYPTION_KEY`, `EMAIL_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_NAME`,
`NEXTAUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `OPENAI_API_KEY`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, and the Supabase **client** keys
(`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`SUPABASE_JWKS_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) have **no code references** in this
repository — do not set them in Vercel. They only cause confusion and may mask
configuration bugs. The Supabase client keys become required only if a Supabase
browser/server client is actually added (see `.env.example` §5).

One caveat: Auth.js v5 (framework level) still honours a legacy `NEXTAUTH_URL`
as a redirect base. A stale `NEXTAUTH_URL` in a local `.env` can point login
callbacks at the wrong port. Do not set `NEXTAUTH_URL` in Vercel; rely on the
request host.

### Environment separation

### Environment separation

Vercel environment variables are scoped per-environment. Set each variable in
the Vercel dashboard under **Settings → Environment Variables** for the correct
environment:

- **Production** — production Supabase database (`DATABASE_URL`), its own
  `AUTH_SECRET` and `ADMIN_BOOTSTRAP_SECRET`
- **Preview** — separate preview/staging database, its **own** `AUTH_SECRET`
  and `ADMIN_BOOTSTRAP_SECRET` (never share secret values with Production —
  a preview compromise must not be able to forge production sessions)
- **Development** — local dev `.env.local` (gitignored)

Mark `AUTH_SECRET` and `ADMIN_BOOTSTRAP_SECRET` as **Sensitive** in Vercel.
`NEXT_PUBLIC_*` values are inlined at build time — set them **before** the
build and create a new deployment after changing them.

> ⚠️ Vercel environment variables only reach a deployment after a **new
> deployment** is created. Changing a variable and redeploying the same
> production build will **not** pick up the change — trigger a new deployment.

## Database strategy (important)

**This project has no `prisma/migrations/` directory. The schema is applied with
`prisma db push`, not `prisma migrate deploy`.** Running `migrate deploy` here
is wrong and will not create the tables.

Nothing in CI or the Vercel build ever applies the schema, so **a production
deployment can come up against an empty database** and every auth request will
fail with a Prisma error (`P2021 relation "public.User" does not exist`, or
`P1001 Can't reach database server`). Whenever a new database is provisioned, or
the schema changes, run this against the production database **once**:

```bash
# 1. Inspect first - never modify blindly
DATABASE_URL="<direct-url>" npx prisma db execute --stdin <<'SQL'
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SQL

# 2. Create what is missing (additive; aborts rather than dropping data)
DATABASE_URL="<direct-url>" npm run db:push:prod

# 3. Idempotent seed: plans, banks, bank templates, system settings
DATABASE_URL="<direct-url>" npm run db:seed
```

Use the **direct** host (`db.<project-ref>.supabase.co:5432`, stored in
`DIRECT_DATABASE_URL`) for these CLI steps; use the Supabase **transaction
pooler** (`aws-0-<region>.pooler.supabase.com:6543`, stored in `DATABASE_URL`)
for the app's runtime in serverless, with
`?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=15`.
Never pass `channel_binding=require` — Prisma does not support it.

## Deployment checklist

1. **Set environment variables** in Vercel → Settings → Environment Variables for **all three**
   environments (Production, Preview, Development). Required: `DATABASE_URL`, `AUTH_SECRET`,
   `NEXT_PUBLIC_APP_URL`. Production also needs `ADMIN_BOOTSTRAP_SECRET`.
   `DIRECT_DATABASE_URL` is only needed where Prisma CLI runs (locally) — not on Vercel.
   Remove unused leftovers if present: `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `NEXT_PUBLIC_APP_NAME`, `NEXTAUTH_*`, `SUPABASE_*` client keys.
   Full numbered list: [`ENVIRONMENT.md`](ENVIRONMENT.md).

2. **Create a new deployment** in Vercel after setting variables. Existing
   deployments do not receive new environment variable values — a fresh
   deployment is required.

3. **Apply the database schema** once to the production database (this is a
   one-time step; the Vercel build does **not** run `db push` automatically):

```bash
# 1. Inspect first - never modify blindly
DATABASE_URL="<direct-url>" npx prisma db execute --stdin <<'SQL'
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SQL

# 2. Create what is missing (additive; aborts rather than dropping data)
DIRECT_DATABASE_URL="<direct-url>" npm run db:push:prod

# 3. Idempotent seed: plans, banks, bank templates, system settings
DATABASE_URL="<direct-url>" npm run db:seed
```

4. **Bootstrap the admin account** via `POST /api/admin/bootstrap` (or
   `npm run db:bootstrap-admin`), using `ADMIN_BOOTSTRAP_SECRET` set in the
   Production environment. Admin credentials are never hard-coded.

5. **Verify** with the health endpoint:

```bash
curl https://your-app.vercel.app/api/health
```

## Project Structure

```
├── messages/          # Legacy copy of the i18n trees (keep in sync with src/messages)
├── prisma/            # schema.prisma, seed.ts, bootstrap-admin.ts
├── public/
├── scripts/           # dev-db.mjs (embedded local Postgres)
└── src/
    ├── app/           # App Router: [locale] routes + /api handlers
    ├── components/    # UI, cheque, marketing, layout
    ├── i18n/          # next-intl config + message parity tests
    ├── lib/           # prisma, auth helpers, cheque geometry, pricing
    ├── messages/      # i18n trees used at runtime (en/ne)
    └── middleware.ts  # locale + route protection
```

## License

Proprietary
