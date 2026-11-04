# Environment Variables - Inventory & Vercel Configuration

**Project:** Reactify Cheque Printing System
**Architecture:** Next.js 14 (App Router) · Supabase PostgreSQL via Prisma 5 · Auth.js v5 (credentials, JWT) · Vercel
**Audit date:** 2026-11-04

**Method:** every reference was found by scanning the repository for
`process.env.*`, dynamic `process.env[...]` access, `env("...")` in
`prisma/schema.prisma`, framework/platform variables, CI workflows
(`.github/workflows/*.yml`), `scripts/`, and deployment documentation. No
variable is listed here unless the code (or a documented CLI workflow) actually
reads it. Nothing is invented; no real credentials appear in this file.

> This document describes what the code requires. It does **not** claim the
> Vercel project has already been configured - variables are added manually in
> the Vercel dashboard.

---

## 1. Complete inventory

### 1.1 Required - read at application runtime

| Variable       | Read by                                                            | Purpose                                                             | Secret? |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | ------- |
| `DATABASE_URL` | `prisma/schema.prisma` (`datasource.url`), `src/lib/env.ts`, tests | Prisma runtime connection to Supabase Postgres (transaction pooler) | Yes     |
| `AUTH_SECRET`  | `src/auth.ts`, `src/lib/auth-token.ts`, `src/lib/env.ts`           | Auth.js JWT session signing; validated at least 32 chars at startup | Yes     |

### 1.2 Required only where Prisma CLI runs (not at runtime)

| Variable              | Read by                                         | Purpose                                                                                                | Secret? |
| --------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------- |
| `DIRECT_DATABASE_URL` | `prisma/schema.prisma` (`datasource.directUrl`) | Direct (non-pooler) connection for `prisma validate` / `db push` / `db execute` / `migrate` / `studio` | Yes     |

Verified behaviour:

- `prisma generate` (the only Prisma step in the Vercel build) succeeds
  **without** either database variable, so `DIRECT_DATABASE_URL` is not needed
  on Vercel.
- `prisma validate` requires **both** `DATABASE_URL` and `DIRECT_DATABASE_URL`
  to be present in the environment. They may point at the same database for a
  local check, but in normal use `DATABASE_URL` is the pooler and
  `DIRECT_DATABASE_URL` is the direct host.
- The app runtime reads only `DATABASE_URL` (through Prisma Client).

### 1.3 Required in Production for admin bootstrap

| Variable                 | Read by                                                             | Purpose                                                 | Secret? |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------- | ------- |
| `ADMIN_BOOTSTRAP_SECRET` | `src/app/api/admin/bootstrap/route.ts`, `prisma/bootstrap-admin.ts` | One-time secret to create/reset the first admin account | Yes     |

Not hard-validated by `src/lib/env.ts` on purpose: a missing value must not
503 the whole site - the bootstrap endpoint itself returns a clear
"not configured" error instead.

### 1.4 Optional

| Variable              | Read by                                                          | Purpose                                                                                                                    | Secret?     |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `NEXT_PUBLIC_APP_URL` | `src/lib/config.ts`                                              | Canonical absolute app URL (links, canonical/OG tags); falls back to `http://localhost:3000`                               | No (public) |
| `ENABLE_CALIBRATION`  | `src/middleware.ts`, `src/app/[locale]/dev/calibration/page.tsx` | Expose `/dev/calibration` in production (`"true"`); always on in development                                               | No          |
| `TRUST_PROXY_HEADERS` | `src/lib/rate-limit.ts`                                          | Trust `X-Forwarded-*` for rate limiting when self-hosting behind a proxy; not needed on Vercel (`VERCEL` is auto-detected) | No          |

### 1.5 Test-only

| Variable      | Read by                                   | Purpose                                                                           |
| ------------- | ----------------------------------------- | --------------------------------------------------------------------------------- |
| `EMBEDDED_PG` | `src/lib/__tests__/e2e-workflows.test.ts` | Set to `1` to run e2e tests against an embedded local Postgres (CI job does this) |

### 1.6 Framework / platform injected - never set manually

`NODE_ENV`, `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_GIT_*`,
`VERCEL_OIDC_TOKEN`, `NEXT_RUNTIME`, `PORT`.

Auth.js v5 also recognises optional framework-level `AUTH_URL` and
`AUTH_TRUST_HOST`. Neither is required here: Auth.js derives the base URL from
the request host, and Vercel is auto-detected. Leave both unset unless you
deliberately need to override Auth.js behaviour.

### 1.7 Present somewhere but NOT read by any code (obsolete)

| Variable                                                                                                                                                   | Where it appears today                                 | Verdict                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                                                                                                            | Vercel (per prior audit `AUDIT_REPORT.md`)             | **Unused** - no references anywhere; they do not create or log in an admin. Remove from Vercel and rotate                                                                                                                                |
| `NEXT_PUBLIC_APP_NAME`                                                                                                                                     | Vercel, local `.env`, old `.env.example`               | **Unused** - `siteConfig.name` is hard-coded in `src/lib/config.ts`. Remove                                                                                                                                                              |
| `NEXTAUTH_SECRET`                                                                                                                                          | local `.env`                                           | **Unused** - `src/auth.ts` sets `secret` from `AUTH_SECRET` explicitly. Remove                                                                                                                                                           |
| `NEXTAUTH_URL`                                                                                                                                             | local `.env`                                           | **Legacy Auth.js v4 name.** Auth.js v5 honours it as a redirect base (can pin login callbacks to the wrong port). Remove locally; never set in Vercel                                                                                    |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | local `.env`, old `.env.example`                       | **Unused today** - `@supabase/ssr` / `@supabase/supabase-js` / `@supabase/server` are installed but no file imports them. This architecture uses Prisma against Supabase Postgres, not the Supabase JS client. Do not set them in Vercel |
| `ENCRYPTION_KEY`, `EMAIL_API_KEY`, `EMAIL_FROM`                                                                                                            | old `.env.example`                                     | **Unused** - no encryption or email service is implemented. Removed from `.env.example`                                                                                                                                                  |
| `OPENAI_API_KEY`                                                                                                                                           | historical comment in `src/app/api/assistant/route.ts` | **Unused** - the LLM assistant route was replaced by a deterministic knowledge module                                                                                                                                                    |
| `PORT`                                                                                                                                                     | local `.env`                                           | **Unused** - Next.js dev/start port is chosen by the CLI (`-p`), not this variable                                                                                                                                                       |
| Convex variables (`CONVEX_*`, `CONVEX_DEPLOYMENT`, ...)                                                                                                    | -                                                      | **None exist.** No Convex code, config file, dependency, or environment variable is present anywhere in the repository. Nothing to remove                                                                                                |

---

## 2. Numbered Vercel configuration list

Set these under **Vercel -> Project -> Settings -> Environment Variables**,
scoped to the environments shown. Values are entered manually; placeholders
only appear here.

### Group 1 - Supabase Database Variables

| No. | Variable Name         | Required/Optional                                 | Purpose                                                                                                                                                                                                                                                                                                  | Vercel Environment                                                                                                        |
| --- | --------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | `DATABASE_URL`        | **Required**                                      | Prisma runtime connection - Supabase **transaction pooler**: `postgresql://postgres.<PROJECT-REF>:<PASSWORD>@<POOLER-HOST>:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=15` (copy the exact host from Supabase Connect; usually `aws-0-<region>.pooler.supabase.com`) | Production, Preview, Development                                                                                          |
| 2   | `DIRECT_DATABASE_URL` | Required for Prisma CLI; **not needed on Vercel** | Direct host `postgresql://postgres:<PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres?sslmode=require` - used only by `validate` / `db push` / `db execute` / `migrate` / `studio` run from your machine or CI                                                                                        | Set locally (`.env`); optionally Production if you ever run Prisma CLI from a Vercel environment - runtime never reads it |

- **Where to obtain:** Supabase Dashboard -> Connect -> your project password.
- **Secret:** yes - never expose via `NEXT_PUBLIC_*`.
- **Separate values:** yes - Preview must point at a **different database**
  (or at minimum a separate schema) than Production.

### Group 2 - Prisma Configuration

Prisma reads no other environment variables. The generator/datasource block in
`prisma/schema.prisma` references exactly `DATABASE_URL` and
`DIRECT_DATABASE_URL` (both covered above). No `prisma.config.ts`, no
`PRISMA_*` variables, and no custom engine flags are used.

### Group 3 - Authentication Variables

| No. | Variable Name            | Required/Optional                          | Purpose                                                                                                                                              | Vercel Environment                                                              |
| --- | ------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 3   | `AUTH_SECRET`            | **Required**                               | Auth.js v5 JWT session signing (`src/auth.ts`, `src/lib/auth-token.ts`); minimum 32 chars - generate with `openssl rand -base64 32`                  | Production, Preview, Development                                                |
| 4   | `ADMIN_BOOTSTRAP_SECRET` | **Required** in Production (for bootstrap) | One-time admin bootstrap for `POST /api/admin/bootstrap` and `npm run db:bootstrap-admin`; generate with `openssl rand -base64 32`, rotate after use | Production (required), Preview (optional), Development (optional, local `.env`) |

- **Where to obtain:** generate locally - never reuse a password.
- **Secret:** yes; mark **Sensitive** in Vercel.
- **Separate values:** **required** - Preview and Production must each have
  their own `AUTH_SECRET` and `ADMIN_BOOTSTRAP_SECRET`. A shared secret lets a
  preview deployment forge production sessions or bootstrap an admin.

### Group 4 - Application Configuration

| No. | Variable Name         | Required/Optional                                                                 | Purpose                                                                           | Vercel Environment               |
| --- | --------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------- |
| 5   | `NEXT_PUBLIC_APP_URL` | Optional in code (has `localhost` fallback); **set it in Preview and Production** | Canonical absolute URL used for links and canonical/OG tags (`src/lib/config.ts`) | Production, Preview, Development |

- **Where to obtain:** your canonical https host (the domain you actually
  serve; apex and `www` must not disagree).
- **Secret:** no (public, inlined into the browser bundle at **build** time).
- **Separate values:** yes - Production = canonical domain; Preview = the
  `*.vercel.app` branch URL; Development = `http://localhost:3000`.
- Changing it requires a **new deployment** (build-time inlining).

### Group 5 - Security Variables

| No. | Variable Name         | Required/Optional      | Purpose                                                                                                                                              | Vercel Environment                                       |
| --- | --------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 6   | `ENABLE_CALIBRATION`  | Optional (default off) | Set `true` to expose `/dev/calibration` in a production build                                                                                        | Production only if needed; never required                |
| 7   | `TRUST_PROXY_HEADERS` | Optional               | Set `true` only when self-hosting behind a trusted reverse proxy so rate limiting sees real client IPs. On Vercel leave unset (`VERCEL` is detected) | Not for Vercel; relevant only to self-hosted deployments |

- **Where to obtain:** you choose these boolean values; no external provider or
  credential is involved.
- **Secret:** no.
- **Separate values:** not applicable - set per environment only when the
  behaviour is actually wanted.

### Group 6 - Payment Integration Variables

**None.** Fonepay is presented as a static QR image
(`siteConfig.pricing.fonepay`); payment proofs are uploaded images verified by
an admin. There is no payment gateway SDK, merchant key, or webhook secret
anywhere in the codebase.

### Group 7 - Email and Notification Variables

**None.** `EMAIL_API_KEY` / `EMAIL_FROM` appear only in the old template and
are read by no code. The contact form persists a `SupportTicket`; no
SMTP/Resend/SendGrid client exists.

### Group 8 - File Storage Variables

**None.** No S3/Cloudinary/Supabase Storage client exists. Template uploads
are written under `public/uploads/templates`, and payment proofs under
`.data/payment-proofs`, using the local filesystem. No environment variable is
read. Note for Vercel: the local filesystem is ephemeral, so persistent
uploads will require a storage integration later; that is a deployment
limitation, not an environment-variable requirement today.

### Group 9 - Optional Third-Party Integrations

**None.** There is no Supabase JS client, no CAPTCHA/Turnstile, no external
rate-limiting service, and no other optional integration that reads an
environment variable.

**Platform-injected - do not create manually:** `NODE_ENV`, `VERCEL`,
`VERCEL_ENV`, `VERCEL_URL`, `VERCEL_GIT_*`, `VERCEL_OIDC_TOKEN`,
`NEXT_RUNTIME`, `PORT`.
**Test-only (local/CI, never Vercel):** `EMBEDDED_PG`.

---

## 3. Development / Preview / Production guidance

| Concern                  | Development (local)              | Preview                                  | Production                                            |
| ------------------------ | -------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`           | local or dev Supabase project    | **separate** preview database            | production Supabase project                           |
| `DIRECT_DATABASE_URL`    | direct host of the same database | direct host of the preview database      | direct host of the production database (CLI use only) |
| `AUTH_SECRET`            | own value in `.env`/`.env.local` | own generated value                      | own generated value                                   |
| `ADMIN_BOOTSTRAP_SECRET` | optional                         | optional (own value if used)             | required until first admin exists, then rotate/delete |
| `NEXT_PUBLIC_APP_URL`    | `http://localhost:3000`          | branch preview URL                       | canonical https domain                                |
| Secrets handling         | gitignored `.env*` files only    | Vercel **Sensitive**, Preview scope only | Vercel **Sensitive**, Production scope only           |

Rules that apply everywhere:

1. Never share a secret value between Preview and Production.
2. Never expose a database password, `AUTH_SECRET`, bootstrap secret, or
   Supabase secret key through `NEXT_PUBLIC_*`.
3. `NEXT_PUBLIC_*` values are fixed at **build** time - set them before the
   build and create a new deployment after changing them.
4. Vercel only applies changed variables to **new** deployments.
5. Development, Preview, and Production configuration stay separate; local
   real-secret files (`.env`, `.env.local`, `.env.production.local`,
   `.env.vercel-audit`) are gitignored and must never be committed.

---

## 4. Local setup guide

```bash
cp .env.example .env
# fill in: DATABASE_URL, DIRECT_DATABASE_URL, AUTH_SECRET,
#          ADMIN_BOOTSTRAP_SECRET, NEXT_PUBLIC_APP_URL
npm install
npm run db:generate
npm run db:push      # applies schema via the direct URL (see README "Database strategy")
npm run db:seed
npm run dev
```

Generate secrets with `openssl rand -base64 32` (Git Bash / WSL / macOS) or
`[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Max 256}))` in
PowerShell. Health check: `npm run health` -> `GET /api/health`.

---

## 5. Vercel configuration checklist

- [ ] Set `DATABASE_URL` - Production **and** Preview (separate databases), Development scope as needed
- [ ] Set `AUTH_SECRET` - Production **and** Preview, **separate values**, marked **Sensitive**
- [ ] Set `NEXT_PUBLIC_APP_URL` - canonical https URL (Production), branch URL (Preview)
- [ ] Set `ADMIN_BOOTSTRAP_SECRET` - Production (own value, **Sensitive**)
- [ ] Optionally set `ENABLE_CALIBRATION` (Production only if the calibration tool is needed)
- [ ] `DIRECT_DATABASE_URL` is optional on Vercel - set it only if you deliberately run Prisma CLI there; runtime never reads it
- [ ] Do **not** set `TRUST_PROXY_HEADERS` on Vercel
- [ ] Do **not** set any `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` client keys - no Supabase JS client exists
- [ ] Remove unused leftovers if present: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_APP_NAME`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `EMAIL_*`, `OPENAI_API_KEY`
- [ ] Create a **new deployment** after any variable change
- [ ] Verify `GET /api/health` returns `{"status":"healthy"}` on the new deployment

---

## 6. Obsolete variables - safe to remove

**From Vercel (unused by any code):**
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_APP_NAME`, and - if ever added -
`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `EMAIL_API_KEY`,
`EMAIL_FROM`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**From local `.env` files (do not delete the files, only the entries):**
the same list as above plus `PORT`. Local files were left untouched by this
audit, as requested.

**From `.env.example`:** `ENCRYPTION_KEY`, `EMAIL_API_KEY`, `EMAIL_FROM`,
`NEXT_PUBLIC_APP_NAME`, and all `SUPABASE_*` client entries - all removed in
this update. The template now contains only variables the code actually reads.

**Convex:** nothing to remove - no Convex variable, file, or dependency exists
in the repository.

---

## 7. Security rules applied by this audit

- No secret values are written into any tracked file; all templates use
  placeholders (`<PASSWORD>`, `<PROJECT-REF>`, empty values).
- Database passwords and secret keys are never `NEXT_PUBLIC_*`.
- `src/lib/env.ts` validates `DATABASE_URL` shape and `AUTH_SECRET` length
  **without logging values**. The entire `DATABASE_URL` must be one
  PostgreSQL URL; shell commands, quotes, placeholders, and surrounding
  whitespace are rejected. `/api/health` returns 200 only when the database is
  reachable **and** the required tables (`User`, `Subscription`,
  `BankTemplate`) exist; otherwise it returns 503. Diagnostic details are
  exposed only in non-production.
- Admin bootstrap uses a shared secret, never a hard-coded password.
- Secret values are never printed to application logs by this configuration.
- Real-secret local files remain gitignored (`.env*` with `!.env.example`).

---

## 8. Verification commands

```bash
# reference audit (must show only the variables listed in section 1)
#   process.env.*  -  prisma env()  -  NEXT_PUBLIC_*
# Convex audit (must return only the historical note in AUDIT_REPORT.md)
npx prisma validate
npm run db:generate
npm run typecheck
npm run lint
npm run build
```

Expected results on a clean checkout with `.env` populated:
`prisma validate` valid, Prisma Client generated, typecheck clean, lint clean
(two pre-existing `<img>` warnings only), production build successful.

---

## 9. Remaining manual configuration requirements

1. **Vercel dashboard** - add/remove variables per section 5 (this audit does
   not configure Vercel).
2. **Rotate exposed secrets** - `AUTH_SECRET` and `ADMIN_BOOTSTRAP_SECRET`
   values were committed to git history in `.env.production.local` (commits
   `def5c5f`, `1a70707`, removed in `303cb44`). Rotate both on Vercel
   (invalidates existing sessions; acceptable).
3. **Local `.env` cleanup** - remove obsolete keys (`NEXTAUTH_*`,
   `NEXT_PUBLIC_APP_NAME`, `SUPABASE_*`, `PORT`) at your discretion. The file
   was intentionally left unmodified by this audit.
4. **Domain** - set `NEXT_PUBLIC_APP_URL` to the single canonical host and fix
   apex DNS if still unresolved (see `AUDIT_REPORT.md` C3).
5. **Preview database** - `DATABASE_URL` is currently not set for Preview at
   all (prior audit); every database-backed Preview request will fail until it
   is.
