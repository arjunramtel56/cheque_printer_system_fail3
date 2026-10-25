# Reactify Cheque Printing System — Phase 1 Production Audit

**Audit date:** 2026-10-25  
**Repository:** `arjunramtel56/cheque_printer_system_fail3` at `dfb4186` (`main`)  
**Production project:** Vercel `cheque-printer-system-fail3`  
**Working production host:** `https://www.chequeprintersystem.arjunramtel.com.np`  
**Configured public URL:** `https://chequeprintersystem.arjunramtel.com.np` (does not resolve — see C3)

**Scope:** package/lockfile, Next.js configuration, Prisma schema and migration state, all API routes, authentication, authorization, database queries, environment-variable references, Vercel deployment configuration, and the current UI's auth/trial paths.

**Not changed in this phase:** cheque geometry, bank templates, calibration, print CSS, or the UI design. No product code was modified by this audit. The only repository artifact this audit added is this report. Local test records created during verification were deleted afterwards.

---

## 1. Executive summary

Production registration, login, and trial are failing for one confirmed reason:

> **The production PostgreSQL database has no `public.User` table.** Prisma reaches the database successfully, but the Prisma schema was never applied to that database. Every authentication query fails with `P2021`.

Consequences observed in production:

- `POST /api/auth/register` returns **503** ("Unable to create your account right now") because the first `prisma.user.findUnique()` call throws `P2021`.
- The credentials login callback returns Auth.js **`error=Configuration`** because `authorize()` throws the same `P2021`. The login page correctly renders this as a service-unavailable message.
- No account can be created, so no session can exist, so `GET /api/trial` can only return **401**. Trial cannot be exercised at all until the schema exists.
- Vercel runtime logs show the exact Prisma error and prove the database is reachable (`P2021`, not `P1001`).

Two additional Critical deployment findings sit around the incident:

1. **There is no migration or schema-application step in the deployment pipeline.** The Vercel build only runs `prisma generate && next build`; CI's "db-migration" job only runs `prisma generate`. This is why the outage was possible and why it will recur.
2. **The configured public URL (apex) does not resolve.** Only `www` is live. The production canonical/OpenGraph URLs point at the dead apex.

The codebase itself is not fundamentally broken. With a schema-present local database, registration returned 201, login produced a valid session, and `/api/trial` returned 200. Typecheck, tests, lint, and the production build all pass locally. The failure is deployment/database state, not the login form or NextAuth secret.

After the schema is fixed, several **High** product and security defects will become reachable and should be fixed before calling the system production-ready: expired trials retain API access, paid subscriptions never expire, trials can be reactivated indefinitely, print/export limits are bypassable, `/api/users` returns password hashes, an ADMIN can promote another user to SUPER_ADMIN, password-reset tokens are written to production logs, and uploads write to a read-only serverless filesystem.

---

## 2. Status at a glance

| Area                             | Status      | Evidence                                             |
| -------------------------------- | ----------- | ---------------------------------------------------- |
| Marketing pages at `www`         | Working     | `GET /en` → 200                                      |
| Apex configured URL              | **Down**    | DNS has no A/AAAA record; `curl` cannot resolve      |
| Auth API reachable               | Working     | `/api/auth/providers` and `/api/auth/csrf` → 200     |
| Login page / register page       | Working     | `/en/login`, `/en/register` → 200                    |
| Registration                     | **Failing** | 503; `P2021 public.User`                             |
| Credentials login                | **Failing** | `error=Configuration`; `P2021 public.User`           |
| Trial                            | **Blocked** | Requires a session; no account can be created        |
| Vercel deployment                | Ready       | Latest production deployment, 11 days old            |
| Local DB + app                   | Working     | Register 201, login session, trial 200               |
| Typecheck / tests / lint / build | Passing     | 0 type errors; 168/168 tests; lint 0 errors; build 0 |
| Dependency audit                 | **Failing** | 10 vulnerabilities: 1 critical, 9 high               |

---

## 3. Reproduction evidence

### 3.1 Production HTTP probes

All probes used the working `www` host. No production account was created: the valid registration probe failed before any insert.

| Request                                                        | Result                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/auth/providers`                                      | 200, credentials provider present                                          |
| `GET /api/auth/csrf`                                           | 200, 64-char CSRF token                                                    |
| `POST /api/auth/callback/credentials` with a non-existent user | `{"url":"https://www.../api/auth/error?error=Configuration"}`              |
| `POST /api/auth/register` with an invalid email                | 400 `Invalid email address` (validation works)                             |
| `POST /api/auth/register` with a valid unique payload          | **503** `Unable to create your account right now. Please try again later.` |
| `GET /api/trial` without a session                             | 401 `Unauthorized`                                                         |
| `GET /api/cheques` without a session                           | 401 `Unauthorized`                                                         |

The 400 response proves request parsing and Zod validation work. The 503 is the route's deliberate `isPrismaUnavailable` branch for `P2021`/connection faults, not a generic 500.

### 3.2 Vercel runtime logs

An authenticated Vercel CLI session for `arjunramtel56` was available, so production runtime logs were inspected directly. The relevant excerpts (messages only; no secrets):

```text
[auth][error] CallbackRouteError
[auth][cause]: PrismaClientKnownRequestError:
  Invalid `prisma.user.findUnique()` invocation:
  The table `public.User` does not exist in the current database.
[auth][details]: { "provider": "credentials" }
```

```text
[REGISTER_ERROR] PrismaClientKnownRequestError [P2021]:
  Invalid `prisma.user.findUnique()` invocation:
  The table `public.User` does not exist in the current database.
  meta: { modelName: 'User', table: 'public.User' }
```

This is the decisive evidence:

- The database is **reachable**. A connection failure would be `P1001`/`PrismaClientInitializationError`; this is a successful connection followed by a missing relation.
- The deployed schema does not contain the `User` table. Whether other tables exist cannot be determined without direct database access; at minimum the auth schema is absent.
- The registration 503 and the login `Configuration` error are both downstream of the same missing table.

### 3.3 Environment comparison (values redacted)

| Setting                            | Local                                           | Vercel production                                                          | Assessment                                                                                                                                                                                                                         |
| ---------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                     | `postgresql://…@localhost:5432/reactify_cheque` | Marked **Secret**, Production only; `vercel env pull` writes `[SENSITIVE]` | Reached by the app, but schema absent. The exact host/database cannot be read from the CLI.                                                                                                                                        |
| `AUTH_SECRET`                      | Present                                         | Present; Vercel type `Config`, Preview + Production                        | Not the cause of the observed error. `Configuration` is thrown by the database exception inside `authorize`.                                                                                                                       |
| `NEXT_PUBLIC_APP_URL`              | `http://localhost:3000`                         | Apex host (confirmed by the canonical tag served in production)            | Mismatch with the working `www` host — see C3.                                                                                                                                                                                     |
| `ADMIN_BOOTSTRAP_SECRET`           | Present                                         | Present; type `Config`, Preview + Production                               | Correctly required by the bootstrap endpoint.                                                                                                                                                                                      |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`   | Not present                                     | Present; type `Config`, Preview + Production                               | **Not referenced anywhere in the codebase.** They do not create or log in an admin.                                                                                                                                                |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Present                                         | Not present                                                                | README says they are not read, but Auth.js v5 does honour `NEXTAUTH_URL`: with the local dev server on port 57342, the login callback still returned `http://localhost:3000`. Not a production cause (production does not set it). |
| `DIRECT_DATABASE_URL`              | Present                                         | Not present                                                                | Unused by the app; migrations/`db push` need a direct URL, which must be supplied separately.                                                                                                                                      |
| Node.js                            | Local 24.x                                      | Vercel 24.x                                                                | CI uses Node 20, so production and CI are not aligned.                                                                                                                                                                             |
| Vercel region                      | —                                               | `iad1` (US)                                                                | Adds latency for Nepal-based users; not an auth cause.                                                                                                                                                                             |

`vercel env ls preview` confirms **`DATABASE_URL` is not set for Preview at all**. A preview deployment would fail every database-backed request, including auth.

### 3.4 Domain and DNS

- `chequeprintersystem.arjunramtel.com.np` (apex): **no A/AAAA answer** from public DNS; `curl` fails with "Could not resolve host".
- `www.chequeprintersystem.arjunramtel.com.np`: CNAME to `77662eb6bed17799.vercel-dns-017.com`; returns `307 /en`, then 200.
- `vercel domains inspect chequeprintersystem.arjunramtel.com.np` warns that the domain is not configured and recommends:
  `A chequeprintersystem.arjunramtel.com.np 76.76.21.21`
- Vercel lists the project's latest production URL as the **www** host.
- The production page's canonical and `og:url` both point to the **apex**:
  `https://chequeprintersystem.arjunramtel.com.np/en` — a host that does not resolve.

This is an availability/SEO/configuration defect, not the cause of `P2021`. If a user follows the configured URL or the canonical URL, they cannot reach the app.

### 3.5 Local reproduction with the schema present

To isolate deployment state from application code, the local embedded PostgreSQL instance was started (the data directory already contained the full schema: 16 tables and 4 users). Against that database:

| Flow                      | Result                                 |
| ------------------------- | -------------------------------------- |
| `POST /api/auth/register` | **201** `Account created successfully` |
| Credentials callback      | 200; session cookie set                |
| `GET /api/auth/session`   | Valid `TRIAL_USER` session             |
| `GET /api/trial`          | 200; plan and expiry returned          |
| `GET /en/dashboard`       | 200 (not redirected)                   |

This confirms the application code, NextAuth configuration, cookie handling over HTTP, Prisma client, and registration transaction work when the schema exists. The production failure is the absent production schema.

The local test account, cheque, audit rows, reset token, and related records were deleted after the audit.

---

## 4. Root cause

1. Vercel injects a production `DATABASE_URL` that points to a reachable PostgreSQL database.
2. That database does not have the Prisma schema applied. `public.User` is absent.
3. [`src/app/api/auth/register/route.ts:59`](src/app/api/auth/register/route.ts#L59) performs `prisma.user.findUnique()` as its first database operation. It throws `P2021`; the catch block classifies `P2021` as infrastructure failure and returns **503**.
4. [`src/auth.ts:33`](src/auth.ts#L33) performs the same lookup inside the Credentials `authorize()` callback. Auth.js turns the thrown exception into a **`Configuration`** error, which the login page maps to "service unavailable."
5. Trial is blocked transitively: [`src/app/api/trial/route.ts:13`](src/app/api/trial/route.ts#L13) requires an authenticated user, and no user can be created or authenticated.
6. The repository has **no `prisma/migrations/` directory**, the Vercel build only generates the Prisma client, and nothing in CI or deployment applies the schema. [`README.md:51-58`](README.md#L51-L58) already documents this exact failure mode, but no automated guard exists.
7. Even after the schema is applied, the seed and admin bootstrap are separate manual steps. Without the seed there are no banks/templates/plans; without a bootstrap there is no admin account.

---

## 5. Prioritized findings

### Critical

#### C1 — Production database schema is missing (`public.User` does not exist)

**Severity:** Critical — total auth/trial outage  
**Files:** [`prisma/schema.prisma:53`](prisma/schema.prisma#L53), [`src/app/api/auth/register/route.ts:59`](src/app/api/auth/register/route.ts#L59), [`src/auth.ts:33`](src/auth.ts#L33), [`package.json:8`](package.json#L8), [`README.md:51-58`](README.md#L51-L58)

**Evidence**

- Production `POST /api/auth/register` → 503.
- Production credentials callback → `error=Configuration`.
- Vercel runtime log: `PrismaClientKnownRequestError [P2021] … The table public.User does not exist`.
- Vercel runtime log: `[REGISTER_ERROR] … P2021 … meta: { modelName: 'User', table: 'public.User' }`.
- The local database contains all 16 tables and the same flows work (201 / session / trial 200).

**Impact**

- No new account can be created; no existing account can be authenticated.
- No trial can start; no dashboard, admin panel, cheque entry, payment, or print flow is reachable.
- If the schema is created but the seed is not run, the app will have no banks, templates, or plans; registration may auto-create only the trial plan, and the dashboard will have no usable template.
- If no admin is bootstrapped, the admin panel is unreachable even after auth is fixed.

**Proposed fix**

1. Obtain the **direct (non-pooler)** production database URL from the project owner/database provider. Do not paste it into chat or commit it.
2. Inspect before changing anything:
   ```bash
   DATABASE_URL="<direct-url>" npx prisma db execute --stdin <<'SQL'
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name;
   SQL
   ```
3. Short-term recovery (only after reviewing the diff): apply the current schema from the repository:
   ```bash
   DATABASE_URL="<direct-url>" npm run db:push:prod
   DATABASE_URL="<direct-url>" npm run db:seed
   ```
   Do not use `--accept-data-loss` without reviewing exactly what Prisma wants to drop. If the database is partially populated, baseline it with a checked-in migration instead (see C2).
4. Bootstrap the first admin through `POST /api/admin/bootstrap` with `ADMIN_BOOTSTRAP_SECRET`, or the CLI. Use a lowercase email (see H10).
5. Verify with a disposable account: register → login → `/api/trial` → create a cheque → print/export; then remove the test records.
6. Add a `/api/health` endpoint that checks both connectivity and the presence of the required tables, and smoke-test it after every deployment.

**Tests**

- Integration test on a migrated empty PostgreSQL: register returns 201; duplicate returns 409; invalid payload returns 400.
- Integration test when `User` is absent: registration returns 503 with the safe message, never 500.
- Login test on a migrated DB: valid credentials set a session; invalid credentials return a credentials error, not `Configuration`.
- Trial test: a fresh trial account can call `/api/trial` and sees a positive expiry.
- Deployment smoke test: `/api/health` fails the release if `User` is missing.

---

#### C2 — No migration or schema-application step in build, CI, or release

**Severity:** Critical — root process defect; guaranteed recurrence  
**Files:** [`package.json:8`](package.json#L8), [`package.json:15-19`](package.json#L15-L19), [`.github/workflows/ci.yml:44-53`](.github/workflows/ci.yml#L44-L53), [`README.md:51-58`](README.md#L51-L58)

**Evidence**

- There is no `prisma/migrations/` directory.
- `npm run build` = `prisma generate && next build` — it generates a client but does not create or migrate a database.
- CI's `db-migration` job runs only `npm run db:generate`.
- A deployment can be **Ready** while every auth request returns `P2021`, as production demonstrates.
- The README explicitly instructs operators to run `db push` by hand, which is not a release control.

**Impact**

- The current outage happened because no automated step could detect or prevent a schema-less deployment.
- Any future schema change can silently diverge between local, preview, and production.
- `db push` has no history, no review, and no rollback; it is unsafe as a permanent production strategy.

**Proposed fix**

1. Create an initial checked-in migration that represents the current schema:
   ```bash
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0001_init/migration.sql
   ```
   Review the SQL, then baseline the existing production database with `prisma migrate resolve --applied 0001_init` after confirming the tables match. For a genuinely empty database, `prisma migrate deploy` can apply it directly.
2. Add a controlled release step using the **direct** database URL:
   ```bash
   DATABASE_URL="<direct-url>" npx prisma migrate deploy
   DATABASE_URL="<direct-url>" npm run db:seed
   ```
   Run it once per release, not on every serverless invocation. Do not put it in `next build`; builds should not mutate production data.
3. Add a CI job with an ephemeral PostgreSQL service that runs `migrate deploy`, `db:seed`, and the integration suite. Fail the job on any Prisma drift.
4. Add a pre-deploy schema check: query `information_schema.tables` for `User`, `Subscription`, `BankTemplate`, etc.; fail the release if required tables are missing.
5. Keep `db push` for disposable local databases only.

**Tests**

- `prisma migrate deploy` from an empty database succeeds and produces all required tables.
- Running it twice is idempotent.
- CI fails when the database is one migration behind.
- A deployment smoke test fails if `/api/health` cannot see `User`.

---

#### C3 — Configured public URL (apex) does not resolve; canonical/OG point to the dead host

**Severity:** Critical — configured entry point unavailable; SEO/absolute-link breakage  
**Files:** [`src/lib/config.ts:4`](src/lib/config.ts#L4), [`src/app/[locale]/layout.tsx:17`](src/app/[locale]/layout.tsx#L17), [`src/app/sitemap.ts:4`](src/app/sitemap.ts#L4), [`src/app/robots.ts:4`](src/app/robots.ts#L4)

**Evidence**

- `chequeprintersystem.arjunramtel.com.np` has no A/AAAA answer; `curl` fails with "Could not resolve host".
- `www.chequeprintersystem.arjunramtel.com.np` resolves to Vercel and serves 307 → `/en` → 200.
- `vercel domains inspect` warns the apex is not configured and recommends an A record to `76.76.21.21`.
- Production HTML contains:
  `<link rel="canonical" href="https://chequeprintersystem.arjunramtel.com.np/en"/>`
  and the same dead host in `og:url`.
- The production env value `NEXT_PUBLIC_APP_URL` is the apex (confirmed by the rendered canonical; the environment file was pulled from Vercel, with secrets redacted).

**Impact**

- Anyone using the configured URL, a bookmark, the canonical link, or a future absolute link generated from `siteConfig.url` cannot reach the app.
- Search engines and social previews are pointed at a dead host.
- If email/password-reset links are later generated from `siteConfig.url`, they will be dead too.
- Auth is not broken by this on `www`, but the production configuration is internally inconsistent.

**Proposed fix**

1. Add the missing apex DNS record in Cloudflare (or move the zone to Vercel nameservers):
   `A chequeprintersystem.arjunramtel.com.np → 76.76.21.21`
   Keep `www` as-is unless intentionally canonicalizing the other direction.
2. At Vercel, set one canonical host and redirect the other (e.g., apex → `www`), then verify the redirect chain.
3. Set `NEXT_PUBLIC_APP_URL=https://www.chequeprintersystem.arjunramtel.com.np` (or the chosen canonical host) in Vercel and **redeploy** — `NEXT_PUBLIC_*` values are inlined at build time.
4. Confirm canonical, `og:url`, sitemap, and robots all use the same live host.
5. Add a post-deploy check for both hosts and for the canonical tag.

**Tests**

- DNS test for apex and `www` (A/AAAA/CNAME).
- HTTP test: apex redirects to the canonical host with a single 308/301; canonical host serves 200.
- HTML test: canonical and `og:url` equal the canonical host.
- Auth test: login and session work on the canonical host.

---

### High

#### H1 — Expired-trial users retain full API access

**Severity:** High — paywall bypass  
**Files:** [`src/lib/api-helpers.ts:31-66`](src/lib/api-helpers.ts#L31-L66), [`src/app/[locale]/dashboard/layout.tsx:42-55`](src/app/[locale]/dashboard/layout.tsx#L42-L55), [`src/app/api/cheques/route.ts:96`](src/app/api/cheques/route.ts#L96)

**Evidence**

- `getAuthenticatedUser()` computes `trialExpired` but never rejects it. It returns the user object to every route.
- The dashboard layout redirects an expired trial to `/dashboard/subscription`, but API routes do not run layouts.
- Local reproduction: after setting the trial expiry in the past, `/en/dashboard` returned `307 → /dashboard/subscription?error=trial_expired`, while `POST /api/cheques` returned **201** and created a cheque.
- `/api/export/pdf` and `/api/print-history` have no trial check either.

**Impact**

- A trial user can keep creating cheques, exporting PDFs, recording prints, and using the assistant after the trial ends by calling the API directly.
- The dashboard redirect creates a false sense that access is blocked.

**Proposed fix**

- Centralize entitlement in `getAuthenticatedUser()` or a new `requireActiveAccess()` used by every protected route.
- Return a distinct 403 (`code: "TRIAL_EXPIRED"`) for expired trials, with an allowlist for `/api/trial`, `/api/payments`, `/api/profile`, and logout/session endpoints.
- Keep the layout redirect for UX, but never rely on it for enforcement.
- Apply the same guard to `/api/cheques`, `/api/export/pdf`, `/api/print-history`, `/api/assistant`, `/api/payees`, `/api/settings`, and `/api/banks` as appropriate.

**Tests**

- Expired trial: 403 on cheques/PDF/print-history/assistant.
- Expired trial: 200 on `/api/trial`, `/api/payments`, `/api/profile`.
- Active trial: 200 on protected routes.
- Paid active user: 200.
- Suspended user: 401/403 regardless of route.

---

#### H2 — Paid subscription `endDate` is never enforced

**Severity:** High — one-month plan grants indefinite access  
**Files:** [`src/lib/access.ts:23-45`](src/lib/access.ts#L23-L45), [`src/app/api/cheques/route.ts:91-98`](src/app/api/cheques/route.ts#L91-L98), [`src/app/api/admin/payments/route.ts:99-148`](src/app/api/admin/payments/route.ts#L99-L148)

**Evidence**

- `getFreshAccess()` selects only `role`, `status`, and `trialExpires`; it never reads `subscription.endDate`.
- `isTrialExpired()` explicitly returns `false` for non-`TRIAL_USER` roles, so a paid `USER` is never expired by the trial clock.
- `/api/cheques` checks only `subscription.isActive`, which is set to `true` at approval and never flipped when `endDate` passes.
- There is no cron, scheduled job, or on-read expiry for paid subscriptions.

**Impact**

- A one-month Standard/Business payment continues to work forever, including unlimited API access and printing.
- Renewal accounting and revenue reporting diverge from actual access.

**Proposed fix**

- Extend `getFreshAccess()` to load the active subscription's `endDate` for `USER`/`TRIAL_USER` and return `subscriptionExpired`.
- Treat `endDate <= now` as expired for access decisions; keep `status`/role checks.
- Add a scheduled job (or lazy on-read update) that marks `Subscription.isActive = false` after `endDate`, and surfaces a renewal prompt.
- Enforce the same entitlement in every protected API, not only the dashboard layout.

**Tests**

- Paid subscription with `endDate` in the past: 403 on cheques/PDF/print.
- Paid subscription with future `endDate`: 200.
- Renewal extends access; an expired subscription can be renewed by an approved payment.
- Admin/SUPER_ADMIN are not blocked by a customer subscription.

---

#### H3 — Trial can be reactivated indefinitely

**Severity:** High — unlimited free trials  
**Files:** [`src/app/api/trial/route.ts:100-175`](src/app/api/trial/route.ts#L100-L175)

**Evidence**

- `POST /api/trial` permits reactivation whenever `trialExpires` is in the past and the current plan price is 0.
- There is no `trialStartedAt`, `trialUsed`, or audit-based one-time check.
- Local reproduction: a `TRIAL_USER` whose trial had expired received `200 Trial activated successfully` and a new 14-day `trialExpires`.
- A second immediate call correctly said "already active," but the user can repeat the cycle after each expiry.

**Impact**

- A user can obtain a fresh trial forever by waiting for expiry (or by any future endpoint that expires the trial).
- This defeats the 24-hour/5-print trial and the paid conversion funnel.

**Proposed fix**

- Add a persistent one-time marker (`trialStartedAt`, `trialConsumed`, or a dedicated audit event) written at registration and checked before reactivation.
- Allow reactivation only if the account has never consumed a trial, or via an explicit admin override with an audit log.
- Consider making trial issuance idempotent per user and per email/domain.

**Tests**

- First expiry → reactivation allowed (if the product intends one grace reactivation) or 403.
- Second expiry → 403.
- Admin override creates an audit entry.
- Concurrent POSTs do not issue two trials.

---

#### H4 — Print/export limits are not enforced at the point of use

**Severity:** High — plan limits bypassable  
**Files:** [`src/app/api/cheques/route.ts:100-109`](src/app/api/cheques/route.ts#L100-L109), [`src/app/api/print-history/route.ts:68-103`](src/app/api/print-history/route.ts#L68-L103), [`src/app/api/export/pdf/route.ts:25-55`](src/app/api/export/pdf/route.ts#L25-L55)

**Evidence**

- The cheque limit is checked only when creating a `ChequeEntry`, using `printHistory.count()`.
- `POST /api/print-history` records a print and marks the cheque `PRINTED` with no subscription or limit check.
- `POST /api/export/pdf` generates a PDF with no subscription or limit check.
- A user can create up to the limit, then print/export those existing cheques unlimited times; or call `print-history` repeatedly.
- The count is all-time, so a renewed subscription also inherits the previous period's print count.

**Impact**

- Trial "5 prints" and paid "100 prints" are not real limits.
- Revenue protection and usage reporting are unreliable.

**Proposed fix**

- Create an entitlement/usage service that checks subscription state and the current period's usage atomically.
- Enforce on cheque creation, print-history creation, and PDF export, with a database transaction or counter to prevent concurrent overuse.
- Scope the counter to the subscription period (or reset on renewal) and record the period on `PrintHistory`.
- Return 403 with remaining/limit metadata for the UI.

**Tests**

- Trial at limit: cheque creation 403; print/export 403.
- Existing cheque cannot be printed beyond the limit.
- Concurrent print requests cannot exceed the limit.
- Renewal resets the period counter (if that is the intended product rule).
- Business/unlimited plan allows printing.

---

#### H5 — `/api/users` returns password hashes and full user rows

**Severity:** High — sensitive data exposure  
**Files:** [`src/app/api/users/route.ts:30-43`](src/app/api/users/route.ts#L30-L43), [`src/app/api/users/route.ts:87-112`](src/app/api/users/route.ts#L87-L112)

**Evidence**

- The query is `prisma.user.findMany({ include: { subscription, settings } })` with no `select`. Prisma returns every scalar column.
- A local query with the same shape returned keys including `passwordHash`.
- The route serializes the result directly: `return NextResponse.json(users)`.
- `PUT` returns the updated user with the same full shape.

**Impact**

- Every admin page load downloads bcrypt hashes for all users to the browser and network tab.
- If an admin session, proxy log, HAR file, or browser extension is compromised, hashes can be cracked offline.
- Hashes are never needed by the admin UI.

**Proposed fix**

- Replace `include` with an explicit `select`: `id`, `name`, `email`, `role`, `status`, `company`, `phone`, `trialExpires`, `createdAt`, `subscription` (safe fields), `settings` (safe fields).
- Never return `passwordHash`, `emailVerified` unless needed, or reset-token relations.
- Add a response-shape test that asserts `passwordHash` is absent.

**Tests**

- `/api/users` 200 response contains no `passwordHash` at any nesting level.
- `/api/users` PUT response contains no `passwordHash`.
- Admin UI still renders all required columns.

---

#### H6 — An ADMIN can promote another user to SUPER_ADMIN

**Severity:** High — privilege escalation  
**Files:** [`src/app/api/users/route.ts:69-96`](src/app/api/users/route.ts#L69-L96)

**Evidence**

- The only role guards are: a non-super admin cannot modify an existing SUPER_ADMIN, and nobody can change their own role/status.
- `role` is written directly: `role: role || undefined`, with no allowlist and no rule that only a SUPER_ADMIN may grant `ADMIN`/`SUPER_ADMIN`.
- An ADMIN can register or use a second account, promote it to `SUPER_ADMIN`, then sign in as it.
- `status` is also unvalidated; arbitrary strings reach Prisma and produce a 500.

**Impact**

- Any ADMIN can become a SUPER_ADMIN and take over the installation.
- Invalid role/status values produce unhandled Prisma errors instead of 400s.

**Proposed fix**

- Allow only a SUPER_ADMIN to assign `ADMIN` or `SUPER_ADMIN`.
- Validate `role` against `UserRole` and `status` against `AccountStatus` with Zod.
- Add an explicit "cannot promote above your own role" rule and audit the before/after values.
- Consider separating "update profile" and "change role" into different endpoints with different authorization.

**Tests**

- ADMIN → SUPER_ADMIN promotion returns 403.
- SUPER_ADMIN → ADMIN promotion succeeds and is audited.
- Invalid role/status returns 400, not 500.
- Self-role change remains blocked.
- Non-admin cannot call the endpoint.

---

#### H7 — Password-reset tokens are written to production logs, and there is no delivery channel

**Severity:** High — account takeover risk plus broken reset flow  
**Files:** [`src/app/api/auth/forgot-password/route.ts:73-77`](src/app/api/auth/forgot-password/route.ts#L73-L77), [`src/app/api/auth/forgot-password/route.ts:89-97`](src/app/api/auth/forgot-password/route.ts#L89-L97)

**Evidence**

- The route builds `/reset-password?token=<raw-token>` and logs it with `console.warn(...)` in every environment.
- Local verification showed the full 64-hex token in the dev log; the production code path is identical.
- In production, the token is not returned to the user and no email is sent; the only place the link exists is the server log.
- Vercel runtime logs are accessible to project members, as this audit itself demonstrated.

**Impact**

- Anyone with log access can reset any account whose token is still in the retention window.
- Legitimate users cannot complete a password reset because they never receive the link.
- This is both a security exposure and a functional dead end.

**Proposed fix**

- Remove the raw token from logs immediately; log only the user id and a request id.
- Add an email provider (or an admin-generated one-time link shown in the admin panel) to deliver the reset URL.
- If email is intentionally out of scope, return a clear 501/"contact support" response instead of claiming a link was generated.
- Rotate any production account that may have had a reset token written to logs, and review log retention/access.
- Consider shortening token TTL and binding tokens to a user-agent/IP hash (optional).

**Tests**

- Forgot-password does not emit the raw token in any log (capture stdout and assert).
- Known email → token row created, email sent (mocked), response identical to unknown email.
- Unknown email → no token, same response.
- Reset link works once; reuse returns 400.
- Reset revokes existing sessions (see M2).

---

#### H8 — Payment proofs and template uploads write to the local filesystem, which is not durable on Vercel

**Severity:** High — blocks paid conversion and template management  
**Files:** [`src/app/api/payments/route.ts:143-157`](src/app/api/payments/route.ts#L143-L157), [`src/app/api/uploads/route.ts:44-56`](src/app/api/uploads/route.ts#L44-L56), [`src/app/api/payments/proof/[filename]/route.ts:1-80`](src/app/api/payments/proof/%5Bfilename%5D/route.ts#L1-L80)

**Evidence**

- Payment proofs are written with `writeFileSync(join(process.cwd(), ".data", "payment-proofs"))`.
- Template background images are written with `writeFileSync(join(process.cwd(), "public", "uploads", "templates"))`.
- Vercel serverless functions run with a read-only deployment filesystem except `/tmp`; `/tmp` is ephemeral and per-instance. Files written there are not shared across invocations and disappear on cold starts.
- The payment-proof GET route reads from the same local `.data` path.
- This was not exercised against production because no session can be created while `User` is missing, but the incompatibility is structural.

**Impact**

- Once auth is fixed, a user submitting a payment proof will hit `EROFS`/write failure → 500, blocking upgrades.
- Even if a write succeeds in a writable environment, the file is not durable and the proof URL will 404 later.
- Template background uploads have the same problem; admins cannot reliably upload or keep images.
- In-memory/instance-local storage cannot be used for payment evidence that admins must review.

**Proposed fix**

- Store uploads in durable object storage (S3-compatible, Cloudflare R2, Vercel Blob, etc. — provider decision in Phase 2).
- Store only the object key/URL in `Payment.proofUrl` / `BankTemplate.backgroundUrl`.
- Serve proofs through the authenticated route by streaming from object storage, or issue short-lived signed URLs after the ownership/admin check.
- Validate content type and size server-side; consider malware scanning for user uploads.
- Add cleanup for rejected/abandoned uploads.

**Tests**

- Payment proof upload returns 201 and the proof is retrievable after a new instance/cold start.
- Owner can view their proof; another user gets 403; admin can view.
- Invalid type/oversize returns 400.
- Template upload persists and is served after redeploy.
- No writes to `process.cwd()` remain in API routes.

---

#### H9 — Suspended/expired accounts are trapped in a redirect loop

**Severity:** High — account recovery/support failure  
**Files:** [`src/middleware.ts:105-111`](src/middleware.ts#L105-L111), [`src/middleware.ts:132-139`](src/middleware.ts#L132-L139), [`src/app/[locale]/dashboard/layout.tsx:38-40`](src/app/[locale]/dashboard/layout.tsx#L38-L40)

**Evidence**

- Middleware redirects any request with a session token away from `/login` to the dashboard at lines 105-111 — **before** the blocked-status check at lines 132-139.
- The dashboard layout reads fresh access and redirects a blocked user to `/login?error=account_*`.
- Local reproduction with a suspended user:
  - `/en/dashboard` → `307 /en/login?error=account_suspended`
  - following redirects: 6 hops, still at `/en/login?error=account_suspended`, then curl aborts with "Maximum redirects followed".
- The blocked check in middleware never fires for `/login` because the login redirect returns first.

**Impact**

- A suspended or expired user cannot reach the login page to see the error or sign in as another account without manually clearing cookies.
- Browser shows a redirect error; support has to explain cookie clearing.
- The same loop can occur for any future status that maps to `isAccountBlocked`.

**Proposed fix**

- Evaluate `isAccountBlocked(token.status)` before the "logged-in user on /login" redirect.
- If blocked, allow `/login` to render (with the error) and/or clear the session cookie in the redirect response.
- Prefer a short-lived "signed out" response that deletes the Auth.js cookie, then redirects to `/login?error=...`.
- Add a loop guard test that follows redirects and asserts a terminal 200.

**Tests**

- Suspended session → `/en/dashboard` ends at a 200 login page with the suspension message, max 2 redirects.
- Expired session behaves the same.
- A healthy session on `/login` still redirects to the dashboard.
- Clearing the session cookie allows a different account to sign in.

---

#### H10 — Mixed-case email writes can lock out the admin

**Severity:** High (conditional) — recovery lockout  
**Files:** [`src/auth.ts:34`](src/auth.ts#L34), [`src/app/api/admin/bootstrap/route.ts:116-120`](src/app/api/admin/bootstrap/route.ts#L116-L120), [`prisma/bootstrap-admin.ts:82`](prisma/bootstrap-admin.ts#L82), [`prisma/bootstrap-admin.ts:103-110`](prisma/bootstrap-admin.ts#L103-L110), [`src/app/api/users/route.ts:93`](src/app/api/users/route.ts#L93)

**Evidence**

- Login normalizes the submitted email: `credentials.email.trim().toLowerCase()`.
- Registration normalizes on write: `result.data.email.trim().toLowerCase()`.
- The admin bootstrap API and CLI store the email exactly as entered.
- The admin `PUT /api/users` route can change an email without normalizing.
- PostgreSQL's default unique index is case-sensitive; `Admin@Example.com` and `admin@example.com` are different rows, but login can only find the lowercase one.

**Impact**

- If the first admin is bootstrapped as `Admin@Example.com`, login with any casing lowercases to `admin@example.com` and finds no row — the only admin is locked out.
- Admin email edits can create duplicate or unreachable accounts.
- This is especially risky during the immediate recovery from C1, when the bootstrap is the next step.

**Proposed fix**

- Normalize every email write (register, bootstrap API, bootstrap CLI, admin user update, password reset request) through one helper.
- Add a migration to lowercase existing emails, resolve duplicates explicitly, and enforce a unique `lower(email)` index (or use PostgreSQL `citext`).
- Keep login normalization.
- Surface a clear validation error if an email is already used case-insensitively.

**Tests**

- Bootstrap `Admin@Example.com`, then login with `admin@example.com` → success.
- Admin update to a mixed-case email, then login → success.
- Duplicate case variants are rejected.
- Migration test on a dataset with mixed-case emails.

---

#### H11 — Production dependencies have one critical and nine high advisories

**Severity:** High — security maintenance; applicability varies  
**Files:** [`package.json:33-60`](package.json#L33-L60), `package-lock.json`

**Evidence**

`npm audit --omit=dev` reports:

```text
10 vulnerabilities (9 high, 1 critical)
```

Key packages:

- `next@14.2.35`: a critical advisory range includes unauthenticated RCE in the Image Optimization API (AVIF/SVG) and on Windows-hosted servers, plus multiple high DoS/SSRF/cache advisories.
- `postcss` (transitive) and `source-map-js`: high-severity file-read/DoS advisories.
- `zod@3.25.76`: high memory-exhaustion advisory.
- `@ai-sdk/openai@1.3.24` and `ai@4.2.7`: high advisories via `@ai-sdk/provider-utils`/`jsondiffpatch`/`zod`. These packages are **not imported anywhere in `src/`** — the assistant was replaced by the deterministic knowledge module.

**Impact**

- Some advisories may be mitigated by Vercel's platform (the Windows RCE is not applicable; the app does not use `next/image`), but the dependency set is out of date and some DoS/SSRF classes are relevant.
- The CI security workflow (`npm audit --audit-level=high`) is failing, so the signal is currently ignored.
- A blind major upgrade could change print CSS/React behavior; this must be a controlled Phase 2 change, not part of the auth hotfix.

**Proposed fix**

1. Remove unused `@ai-sdk/openai` and `ai` dependencies; this eliminates several high advisories and reduces attack surface.
2. Patch `zod`/`source-map-js` within compatible ranges where possible.
3. Plan a Next.js upgrade (14 → 15/16) with visual regression tests for cheque print CSS, PDF output, and calibration. Do not bundle it into the auth recovery release.
4. Re-enable/fix the security workflow so high/critical findings block or ticket automatically.

**Tests**

- `npm audit --omit=dev` clean or explicitly triaged.
- Full cheque print/PDF/calibration visual regression suite after the upgrade.
- Build and route tests on the upgraded Next version.

---

### Medium

| ID  | Finding                                                                                  | Evidence                                                                                                                                                                                                                                                                     | Impact                                                                                                                                        | Proposed fix                                                                                                                        | Tests                                                                                |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| M1  | In-memory rate limits are ineffective on serverless                                      | [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts); used by login/register/forgot/bootstrap/contact                                                                                                                                                                            | Each Vercel instance has its own map; attackers can spread attempts across instances                                                          | Move to a shared store (Redis/DB) with atomic counters; include route/email/IP keys                                                 | Burst across two instances still blocks; legitimate requests unaffected              |
| M2  | Password reset does not revoke existing JWT sessions                                     | [`src/app/api/auth/forgot-password/route.ts:169-191`](src/app/api/auth/forgot-password/route.ts#L169-L191)                                                                                                                                                                   | A stolen session remains valid after the victim resets the password (local test: old cookie still 200)                                        | Add a session version/`passwordChangedAt` claim and reject older tokens; or use DB sessions and delete them                         | Old session 401 after reset; new login works; other sessions revoked                 |
| M3  | Trial plan data drifts from the marketed 24h/5-print model                               | [`prisma/seed.ts:9-25`](prisma/seed.ts#L9-L25), [`src/app/api/auth/register/route.ts:69-85`](src/app/api/auth/register/route.ts#L69-L85), [`src/app/api/trial/route.ts:129-141`](src/app/api/trial/route.ts#L129-L141), [`src/lib/config.ts`](src/lib/config.ts) trialConfig | Local DB returned 14 days/10 prints while UI/code say 24h/5; `/api/trial` fallback still creates 14/10; registration uses whatever row exists | Single source of truth for trial terms; migrate/seed the plan on deploy; stop creating divergent fallback rows                      | Fresh DB gets 24h/5; legacy DB is migrated; API and UI agree                         |
| M4  | Preview environment has no `DATABASE_URL`                                                | `vercel env ls preview`                                                                                                                                                                                                                                                      | Every preview auth/dashboard request fails                                                                                                    | Add a preview/branch database URL and run migrations/seeds for preview                                                              | Preview register/login smoke test                                                    |
| M5  | Production secrets are `Config` and shared with Preview                                  | `vercel env ls` shows `AUTH_SECRET`, `ADMIN_BOOTSTRAP_SECRET`, `ADMIN_PASSWORD` as Config, Preview + Production                                                                                                                                                              | Anyone with project env access can read them; a preview compromise can forge production sessions or bootstrap an admin                        | Mark sensitive, separate per environment, rotate; least-privilege access                                                            | Env audit; old secrets rejected; preview cannot sign production tokens               |
| M6  | `ADMIN_EMAIL` / `ADMIN_PASSWORD` are unused                                              | No references in `src/`, `prisma/`, `scripts/`, README                                                                                                                                                                                                                       | They do not create an admin; storing an admin password in env is unnecessary exposure                                                         | Remove them after bootstrapping; or implement a documented one-time bootstrap that does not store a reusable password               | Code search empty; admin can log in via bootstrap; env no longer contains a password |
| M7  | Contact-form tickets are stored but never surfaced                                       | [`src/app/api/contact/route.ts:65-84`](src/app/api/contact/route.ts#L65-L84); no support-ticket admin API/page                                                                                                                                                               | Users are told the team will review, but no one can see the ticket in the app; no email is sent                                               | Add an admin support-ticket list/detail API + page, or email notification + external inbox                                          | Contact POST creates a ticket visible to admin; no PII leak to non-admins            |
| M8  | Bootstrap CLI fails its audit insert on first run                                        | [`prisma/bootstrap-admin.ts:130-136`](prisma/bootstrap-admin.ts#L130-L136) uses `existingAdmin?.id ?? ""`                                                                                                                                                                    | `AuditLog.userId` FK rejects `""`; admin may be created but the CLI reports failure                                                           | Use the newly created user's id; make the audit insert non-fatal with a null user for system events                                 | First-run bootstrap exits 0 and writes an audit row (or null user)                   |
| M9  | No health/readiness check; admin dashboard masks DB errors as zeros                      | No `/api/health`; [`src/app/[locale]/admin/page.tsx:35-70`](src/app/[locale]/admin/page.tsx#L35-L70) catches all DB errors silently                                                                                                                                          | A Ready deployment can be completely unusable, as production is; operators see 0 rather than an error                                         | Add `/api/health` (DB `SELECT 1` + required tables); add uptime monitoring; show an error state in admin                            | Health 503 on missing table; alert fires; admin shows error                          |
| M10 | Admin user update lacks validation                                                       | [`src/app/api/users/route.ts:50-116`](src/app/api/users/route.ts#L50-L116)                                                                                                                                                                                                   | Invalid `role`/`status`/`email` reaches Prisma → 500; partial updates can null fields                                                         | Zod schemas with enums; separate role/status endpoints; explicit field allowlist                                                    | Invalid values 400; valid updates 200; audit includes before/after                   |
| M11 | Payment approval resets the subscription start date                                      | [`src/app/api/admin/payments/route.ts:99-140`](src/app/api/admin/payments/route.ts#L99-L140)                                                                                                                                                                                 | Renewing early discards remaining days (`startDate = now`)                                                                                    | Extend from `max(now, existing.endDate)` for renewals; keep first purchase from now                                                 | Early renewal adds duration to remaining time; expired renewal starts now            |
| M12 | Duplicate pending payments are allowed by the API                                        | [`src/app/api/payments/route.ts:94-190`](src/app/api/payments/route.ts#L94-L190); UI disables the button only                                                                                                                                                                | A user can submit multiple pending proofs/references; admins must reconcile duplicates                                                        | Reject a new payment while a pending one exists for the same user/plan, or merge into one                                           | Second pending POST 409; rejected/approved allows a new one                          |
| M13 | No security headers                                                                      | [`next.config.mjs`](next.config.mjs) sets no `headers()`; production response has only HSTS                                                                                                                                                                                  | Missing CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy; clickjacking/UX risks                                                  | Add a conservative header set; test print pages for CSP compatibility                                                               | Header assertions on `/`, `/login`, `/dashboard`; print preview still works          |
| M14 | No integration/e2e tests for auth or DB state                                            | Test suite is pure unit tests; 168 pass but none boots the app/DB                                                                                                                                                                                                            | The exact `P2021` production failure would not be caught                                                                                      | Add ephemeral-Postgres integration tests for register/login/trial/limits and a post-deploy smoke test                               | CI fails on missing table; smoke test covers production                              |
| M15 | CSV export is vulnerable to spreadsheet formula injection                                | [`src/app/api/admin/audit-logs/route.ts:31-50`](src/app/api/admin/audit-logs/route.ts#L31-L50)                                                                                                                                                                               | A user name/details beginning with `=`, `+`, `-`, `@` can execute in Excel                                                                    | Prefix dangerous leading characters with `'`; escape commas/newlines/quotes properly                                                | CSV round-trip test; formula-looking values are neutralized                          |
| M16 | `NEXTAUTH_URL` documentation is wrong and local callback URL can point at the wrong port | [`README.md:45-47`](README.md#L45-L47); local `.env`; observed callback `http://localhost:3000` while dev server was on 57342                                                                                                                                                | Running the app on another port can redirect login to the wrong app; operators may remove a variable that Auth.js actually reads              | Document Auth.js v5 behavior; use `AUTH_URL`/`NEXTAUTH_URL` consistently or remove it and rely on request host; add a dev-port note | Login works on a non-3000 port; docs match behavior                                  |
| M17 | `User.isActive` is never checked                                                         | [`prisma/schema.prisma:61`](prisma/schema.prisma#L61); no references in auth/access                                                                                                                                                                                          | A disabled flag has no effect; admins may believe an account is blocked when it is not                                                        | Either remove the field or enforce it in `authorize` and `getFreshAccess`                                                           | `isActive=false` login denied; API denied                                            |
| M18 | Unlimited/unbounded pagination on list APIs                                              | [`src/app/api/cheques/route.ts:17-28`](src/app/api/cheques/route.ts#L17-L28), [`src/app/api/users/route.ts:20-40`](src/app/api/users/route.ts#L20-L40), [`src/app/api/payments/route.ts:26-40`](src/app/api/payments/route.ts#L26-L40)                                       | A caller can request huge pages or negative offsets → memory/DB pressure or 500s                                                              | Clamp `limit`/`offset`; use cursor pagination; validate integers                                                                    | Limits clamped; negative offset 400; large dataset stable                            |
| M19 | Subscription page always presents the plan as "Free Trial / Active"                      | [`src/app/[locale]/dashboard/subscription/page.tsx:219-285`](src/app/[locale]/dashboard/subscription/page.tsx#L219-L285)                                                                                                                                                     | Paid users see a misleading trial card; unlimited plans show `printsLeft=0`; `isTrial` is computed but unused                                 | Render plan/role-specific cards and correct unlimited/remaining labels                                                              | UI test for TRIAL_USER, USER, expired, unlimited                                     |
| M20 | Trial/plan `features` and audit `details` are stored as JSON strings                     | `JSON.stringify(...)` passed to Prisma `Json` fields in seed/register/trial/audit routes                                                                                                                                                                                     | Consumers expecting objects receive strings; querying JSON is harder                                                                          | Pass objects/arrays directly to Prisma `Json`; migrate existing stringified values if needed                                        | API returns object features/details; admin renders them                              |

---

### Low / cleanup

| ID  | Finding                                                                        | Evidence                                                                                                                                                                    | Proposed fix                                                                                    |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| L1  | `/verify-email` is not in `publicRoutes`                                       | [`src/middleware.ts:10-28`](src/middleware.ts#L10-L28) lists it in `authRoutes` but not `publicRoutes`                                                                      | Add it to public routes or remove the unused page/variable                                      |
| L2  | Auth.js sign-in page is hardcoded to `/en/login`                               | [`src/auth.ts:63-65`](src/auth.ts#L63-L65)                                                                                                                                  | Resolve the locale from the request or use a locale-agnostic `/login` that middleware localizes |
| L3  | Register page error mapping and success banner                                 | [`src/app/[locale]/(auth)/register/page.tsx`](src/app/[locale]/%28auth%29/register/page.tsx): `/password/i` catches "Passwords don't match"; `registered=true` is not shown | Map exact error codes; show a success message on login after registration                       |
| L4  | `markRegisterError` order can mislabel errors                                  | Same file; `/name/i`/`/password/i` heuristics                                                                                                                               | Use stable API error codes, not message regexes                                                 |
| L5  | `deploy.yml` only builds; it does not deploy                                   | [`.github/workflows/deploy.yml:8-17`](.github/workflows/deploy.yml#L8-L17)                                                                                                  | Rename to `build.yml` or add an actual deployment job with authorization                        |
| L6  | CI Node 20 vs Vercel Node 24                                                   | `ci.yml` uses Node 20; Vercel project uses 24.x                                                                                                                             | Add `engines` and align CI/production                                                           |
| L7  | Vercel region `iad1` for Nepal users                                           | Project metadata                                                                                                                                                            | Choose a closer region if latency matters; verify database region co-location                   |
| L8  | Middleware decodes the session token for every `/api` request before bypassing | [`src/middleware.ts:60-75`](src/middleware.ts#L60-L75)                                                                                                                      | Move the `/api` bypass before `getSessionToken` or scope the matcher                            |
| L9  | `adminRoutes` uses a raw prefix                                                | [`src/middleware.ts:29`](src/middleware.ts#L29), [`src/middleware.ts:126`](src/middleware.ts#L126)                                                                          | Use segment-boundary matching (`/admin` or `/admin/…`)                                          |
| L10 | `Session` model and `authRoutes` are unused                                    | `prisma/schema.prisma` Session; `src/middleware.ts:28`                                                                                                                      | Remove dead schema/code in a cleanup, or document why they remain                               |
| L11 | `ADMIN_EMAIL`/`ADMIN_PASSWORD` are visible Config vars                         | `vercel env ls`                                                                                                                                                             | Remove/rotate; use a one-time bootstrap secret and delete it after use                          |
| L12 | Local `.env.vercel-audit` contains pulled secrets                              | Gitignored, but present in the workspace                                                                                                                                    | Delete after the audit; rotate if the workspace was shared or backed up                         |
| L13 | Image lint warnings                                                            | `npm run lint` reports `<img>` warnings across auth/marketing/dashboard                                                                                                     | Use `next/image` or document the exception; not auth-related                                    |
| L14 | No `output`/`images` configuration                                             | `next.config.mjs`                                                                                                                                                           | Not required for Vercel; revisit if image optimization is adopted                               |

---

## 6. Verification performed

| Check                             | Result                                                                |
| --------------------------------- | --------------------------------------------------------------------- |
| `npm run typecheck`               | **Exit 0**                                                            |
| `npm test`                        | **168 tests, 30 suites, 168 pass, 0 fail**                            |
| `npm run lint`                    | **Exit 0**; warnings only (`<img>`, hook dependencies, PDF image alt) |
| `npm run build`                   | **Exit 0**; all routes compiled; middleware 37.7 kB                   |
| `npm audit --omit=dev`            | **Exit 1**; 10 vulnerabilities (9 high, 1 critical)                   |
| Production deployment             | Vercel status **Ready**; Node 24.x; build command `npm run build`     |
| Local auth flow with schema       | Register 201; login session; trial 200                                |
| Production auth flow              | P2021 on register and login; 503/`Configuration`                      |
| Apex DNS                          | No A/AAAA; cannot resolve                                             |
| `www` HTTP                        | 307 `/en`; 200                                                        |
| Canonical/OG                      | Point to dead apex                                                    |
| Suspended redirect                | 6 redirects, loop                                                     |
| Password reset log                | Raw token present in local log                                        |
| Password reset session revocation | Old session still 200                                                 |
| `/api/users` shape                | `passwordHash` present                                                |

**What the tests did not cover:** the test suite is unit-only. It does not start the app, connect to PostgreSQL, run migrations, or exercise `/api/auth/register`, the NextAuth callback, `/api/trial`, or the admin APIs. This is why 168 passing tests coexisted with a production-wide auth outage. See M14.

---

## 7. Immediate recovery sequence (proposed; not executed in this phase)

This is the shortest safe path to restore production. It changes deployment state, so it should be run by the owner with the real direct database URL.

1. **Capture the direct production database URL** from the database provider/Vercel owner. Do not paste it into chat, commit it, or put it in `.env.example`.
2. **Inspect** the production database read-only:
   ```bash
   DATABASE_URL="<direct-url>" npx prisma db execute --stdin <<'SQL'
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name;
   SQL
   ```
3. **Apply the schema**:
   - If the database is empty/only partial and the diff is additive:
     ```bash
     DATABASE_URL="<direct-url>" npm run db:push:prod
     ```
   - If any data exists, create/review a baseline migration and use `prisma migrate deploy` instead. Do not use `--accept-data-loss` without reviewing the exact statements.
4. **Seed** plans, banks, templates, and system settings:
   ```bash
   DATABASE_URL="<direct-url>" npm run db:seed
   ```
5. **Bootstrap the first admin** via `POST /api/admin/bootstrap` using `ADMIN_BOOTSTRAP_SECRET`, or:
   ```bash
   DATABASE_URL="<direct-url>" npx tsx prisma/bootstrap-admin.ts
   ```
   Use a lowercase email (H10). Verify login immediately. Remove `ADMIN_EMAIL`/`ADMIN_PASSWORD` from Vercel afterwards.
6. **Add and run a health check**:
   - `GET /api/health` should return 200 with `db: "ok"` and `schema: "ok"`.
   - It should return 503 if `User`/`Subscription`/`BankTemplate` are missing.
7. **Smoke test a disposable account**: register → login → `/api/trial` → `/api/banks` → create a cheque → print/export → delete the test user and its rows.
8. **Fix the domain** (C3): add the apex A record or Vercel nameservers; set one canonical host; update `NEXT_PUBLIC_APP_URL`; redeploy; verify canonical/OG and both hosts.
9. **Add the migration step** (C2) before the next release. Do not rely on a manual runbook.
10. **Rotate** `ADMIN_BOOTSTRAP_SECRET` after bootstrap if it was shared, and mark `AUTH_SECRET`/bootstrap secrets as Sensitive in Vercel (M5).

**Do not** run `prisma migrate deploy` against a database that has tables but no `_prisma_migrations` history without baselining; it will attempt to create existing objects and fail. Inspect first.

---

## 8. Test plan for Phase 2

### 8.1 Integration harness

- Start an ephemeral PostgreSQL (service container in CI or `embedded-postgres` locally).
- Run `prisma migrate deploy` (once migrations exist) and `db:seed`.
- Boot the Next.js server on a random port with a test `AUTH_SECRET` and `DATABASE_URL`.
- Use HTTP requests with a cookie jar, not direct function calls, so middleware/cookies/routes are covered.
- Tear down the database after each suite.

### 8.2 Required suites

| Suite          | Cases                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Registration   | 201 valid; 400 invalid email/password; 409 duplicate (case-insensitive); 503 missing table/DB down; no partial user/subscription on failure                  |
| Login          | 200 valid; invalid credentials; suspended/expired; mixed-case email; session cookie over HTTPS; `Configuration` only on infrastructure failure               |
| Auth/session   | `__Secure-` cookie over HTTPS; HTTP cookie locally; logout; stale/forged token rejected; password reset revokes sessions                                     |
| Trial          | 24h expiry; 5 prints; expired API 403; reactivation only once; `/api/trial` agrees with UI                                                                   |
| Subscription   | Approval promotes TRIAL_USER → USER; endDate enforced; renewal extends; expired plan 403                                                                     |
| Limits         | Cheque creation, print-history, PDF export all enforce the same counter; concurrent requests cannot exceed; unlimited plan works                             |
| Authorization  | Owner vs other user vs ADMIN vs SUPER_ADMIN for every resource; ADMIN cannot grant SUPER_ADMIN; self-role change blocked; `/api/users` excludes passwordHash |
| Admin          | Suspend/activate; delete; bootstrap; audit log; invalid enum 400; CSV formula neutralization                                                                 |
| Redirects      | Suspended/expired account reaches a terminal login page; healthy session on `/login` redirects to dashboard; locale/query preserved                          |
| Uploads        | Payment proof and template upload persist across restarts; owner/admin authorization; type/size validation                                                   |
| Password reset | No raw token in logs; email mocked; single-use; expiry; same-password rejected; session revocation                                                           |
| Deployment     | `/api/health` 200 only with schema; apex/www/canonical; robots/sitemap; security headers                                                                     |
| Regression     | Cheque geometry, bank templates, calibration, print CSS, PDF output (visual snapshots) — **unchanged by this phase**                                         |

### 8.3 CI/CD gates

- Migration drift check on every PR.
- Ephemeral-Postgres integration suite on every PR.
- Post-deploy smoke test: `/api/health`, register/login/trial with a disposable account, cleanup.
- `npm audit --omit=dev` triage: fail on new critical/high, or track exceptions explicitly.
- Block production deploy if the health check fails.

---

## 9. Limitations and honesty notes

- **Production `DATABASE_URL` is a Vercel Secret.** Its host, database name, and credentials were not readable and were not printed. The conclusion that the schema is missing rests on the explicit Prisma `P2021` log and the observed 503/`Configuration` responses, not on direct table introspection. The database may contain some tables; it definitively lacks `public.User`.
- **No production account was created.** The valid registration probe failed before insertion; the audit did not attempt to bypass that.
- **Vercel runtime logs were accessible** through the authenticated `vercel` CLI for `arjunramtel56`. They were used for the P2021 evidence. Build logs were not exhaustively reviewed; the deployment status was inspected.
- **No product code was changed by this audit.** The report is the only new file from this audit. Local test data was removed. During the session, the shared checkout also showed modifications to `convex/_generated/api.d.ts` and `convex/_generated/dataModel.d.ts` (plus a `convex/` directory) that this audit did not make or review; they are unrelated working-tree changes and were left untouched.
- **No cheque geometry, template, calibration, or print-CSS changes were made or proposed as part of this phase.**
- **`npm audit` applicability varies.** The critical Next.js advisories include Windows-only and Image Optimization paths; the app does not use `next/image`, and production is Linux/Vercel. They still warrant a planned upgrade, not an emergency major-version change during auth recovery.
- **The local database had a pre-existing trial plan row** (14 days/10 prints) from an older seed, which is why the local trial test showed 14/10 rather than 24h/5. This is evidence of data drift, not proof that a fresh production registration would use 14/10. A fresh registration creates 1 day/5 prints if the plan is missing; the current seed updates an existing row to 1/5. See M3.
- **The suspended redirect loop was reproduced locally**, not in production, because no production session can be created while `User` is missing.
- **The upload failure is structural** (Vercel read-only filesystem) and was not exercised in production for the same reason.

---

## 10. Key files inspected

- Configuration: [`package.json`](package.json), [`package-lock.json`](package-lock.json), [`next.config.mjs`](next.config.mjs), [`tsconfig.json`](tsconfig.json), [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), [`.github/workflows/security.yml`](.github/workflows/security.yml), [`README.md`](README.md)
- Prisma: [`prisma/schema.prisma`](prisma/schema.prisma), [`prisma/seed.ts`](prisma/seed.ts), [`prisma/bootstrap-admin.ts`](prisma/bootstrap-admin.ts); no `prisma/migrations/`
- Auth: [`src/auth.ts`](src/auth.ts), [`src/middleware.ts`](src/middleware.ts), [`src/lib/auth-token.ts`](src/lib/auth-token.ts), [`src/lib/api-helpers.ts`](src/lib/api-helpers.ts), [`src/lib/access.ts`](src/lib/access.ts), [`src/lib/trial.ts`](src/lib/trial.ts), [`src/lib/prisma-errors.ts`](src/lib/prisma-errors.ts), [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts)
- API routes: all `src/app/api/**/route.ts` (auth, register, trial, cheques, payees, payments, proof, uploads, users, profile, settings, print-history, templates, banks, export/pdf, assistant, contact)
- Admin/UI: `src/app/[locale]/admin/**`, `src/app/[locale]/dashboard/**`, auth pages, `src/lib/config.ts`, i18n config/messages
- Vercel: `.vercel/project.json` (project identity only; no secrets), environment names/types via authenticated CLI, domain inspection, deployment status

---

## 11. Suggested Phase 2 order

1. **Restore auth (C1/C2)**: inspect DB, apply schema, seed, bootstrap admin, add health check, verify register/login/trial.
2. **Fix the domain (C3)**: apex DNS, canonical host, `NEXT_PUBLIC_APP_URL`, redeploy.
3. **Close paywall bypasses (H1–H4)**: central entitlement, subscription end date, one-time trial, print/export limits.
4. **Close security exposures (H5–H8)**: password hashes, role escalation, reset-token logging/email, object storage.
5. **Fix account recovery (H9/H10)**: redirect loop, email normalization.
6. **Harden the pipeline (M9/M14)**: integration tests, health checks, migrations in CI.
7. **Maintenance (H11/M1/M5/M13)**: dependency upgrade, shared rate limiting, secret hygiene, security headers.

Do not combine the Next.js major upgrade or a UI redesign with the auth recovery release.
