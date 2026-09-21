# Reactify Cheque Printer System

A comprehensive cheque printing solution for Nepalese banks, built with Next.js, TypeScript, and PostgreSQL.

## Architecture

Turborepo monorepo with:
- **apps/web** — Customer-facing Next.js app with i18n (en/ne)
- **apps/admin** — Admin panel for CMS, users, and system management
- **apps/worker** — Background job processor
- **packages/** — Shared libraries (ui, database, auth, validation, permissions, i18n, cheque-engine, amount-converter, email, logger, config)

## Tech Stack

- Next.js 16 (App Router + RSC)
- TypeScript
- PostgreSQL + Prisma
- Redis (caching, rate limiting)
- Supabase (auth, storage)
- Tailwind CSS
- Zod validation
- Turborepo

## Getting Started

```bash
pnpm install
cp .env.example .env.local
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## Project Structure

```
reactify-cheque-system/
├── apps/
│   ├── web/          # Main customer app
│   ├── admin/        # Admin panel
│   └── worker/       # Background jobs
├── packages/
│   ├── ui/           # Shared UI components
│   ├── database/     # Prisma schema + client
│   ├── auth/         # Authentication (Argon2id, 2FA)
│   ├── config/       # Shared configs
│   ├── validation/   # Zod schemas
│   ├── permissions/  # RBAC + policies
│   ├── i18n/         # Internationalization
│   ├── cheque-engine/# Cheque rendering
│   ├── amount-converter/ # Number to words
│   ├── email/        # Email service
│   └── logger/       # Structured logging
├── infrastructure/   # Docker, Nginx, Terraform
├── docs/             # Documentation
└── tests/            # Unit, integration, e2e, security
```

## License

Proprietary
