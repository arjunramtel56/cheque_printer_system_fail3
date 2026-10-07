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

| Variable                 | Used by                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `DATABASE_URL`           | `prisma/schema.prisma` — PostgreSQL connection string                |
| `AUTH_SECRET`            | Auth.js session/JWT signing (`src/auth.ts`, middleware, API helpers) |
| `ADMIN_BOOTSTRAP_SECRET` | `/api/admin/bootstrap`, `prisma/bootstrap-admin.ts`                  |
| `NEXT_PUBLIC_APP_URL`    | `src/lib/config.ts`                                                  |
| `ENABLE_CALIBRATION`     | optional; exposes `/dev/calibration` in production                   |

`AUTH_URL`, `AUTH_TRUST_HOST`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
`ENCRYPTION_KEY`, `DIRECT_DATABASE_URL` and the `EMAIL_*` variables are **not**
read anywhere in this codebase. Do not add them.

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

Use the **direct** (non-pooler) host for these CLI steps; use the **pooled**
host for the app's runtime `DATABASE_URL` in a serverless environment, with
`?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=15`.
Neon's `channel_binding=require` parameter is not supported by Prisma and must
be removed.

> Vercel environment variables only reach a deployment after a **new
> deployment** is created.

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
