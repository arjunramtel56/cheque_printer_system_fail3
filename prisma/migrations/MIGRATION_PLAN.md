# Migration Plan

## Current State

**No migration history exists.** The project uses `prisma db push` (additive
schema sync) as documented in `README.md`. There is no `prisma/migrations/`
directory with prior migration files.

This is confirmed by:

- No `prisma/migrations/` directory exists initially
- `package.json` has `db:push` (not `db:migrate`) as a primary command
- `README.md` explicitly states the schema is applied via `db push`
- CI (`ci.yml`) runs `db:generate` but never `db:migrate` or `db:push`

## Migration Strategy

### Development / Local

- Continue using `prisma db push` for local development — it's fast and
  schema-first. The README documents this workflow.
- A baseline migration has been saved at `prisma/migrations/0001_initial_schema/`
  for reference and historical tracking, but **is not applied** via `prisma migrate
deploy` in CI or Vercel.

### Production

**Production uses `prisma db push:prod` (additive sync), NOT `prisma migrate deploy`.**

The workflow for production is:

1. **Inspect** — verify existing tables before touching anything:

   ```bash
   DATABASE_URL="<direct-url>" npx prisma db execute --stdin <<'SQL'
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   SQL
   ```

2. **Sync schema** — `db push` is additive; it will NOT drop columns or tables:

   ```bash
   DIRECT_DATABASE_URL="<direct-url>" npm run db:push:prod
   ```

3. **Seed** — idempotent operations only (plans, banks, templates, settings):

   ```bash
   DATABASE_URL="<direct-url>" npm run db:seed
   ```

4. **Bootstrap admin** — via the API endpoint with `ADMIN_BOOTSTRAP_SECRET`:
   ```
   POST /api/admin/bootstrap
   ```

### Why not `prisma migrate`?

- The project has **no existing migration history**. Adopting `prisma migrate`
  now would require marking the baseline (`--create-only` + manual edit of the
  migration ledger), which is more error-prone for an existing production database.
- `prisma db push` already handles additive schema changes safely. It compares
  the Prisma schema against the live database and adds what's missing.
- The seed script uses `upsert` exclusively, which is idempotent and safe to rerun.

## Data Preservation Guarantees

The following are preserved across all operations:

| Entity         | Preservation Mechanism                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Users          | `db push` does not drop tables/columns. Seed uses `upsert` on Plans/Banks/Settings, not Users. |
| Subscriptions  | No schema changes affect the `Subscription` model.                                             |
| Bank templates | Seed uses `upsert` on `BankTemplate` by `bankId_name`.                                         |
| Calibrations   | Stored in Convex (not Prisma); untouched by `db push`.                                         |
| Cheque records | No schema changes affect `ChequeEntry`, `PrintHistory`, or `Payee`.                            |
| Audit logs     | `AuditLog` is append-only; `db push` never truncates it.                                       |

## Non-Destructive Operations Only

The following scripts are **never** run against production:

- `prisma db reset`
- `prisma db drop`
- `prisma migrate reset`
- `prisma db push --force` (without explicit prior inspection)

## Seed / Bootstrap Safety

### Seed (`prisma/seed.ts`)

- Uses `upsert` for every entity (plans, banks, templates, settings)
- Never deletes or overwrites user-created data
- Never creates an admin user
- Safe to rerun at any time

### Bootstrap (`prisma/bootstrap-admin.ts` and `/api/admin/bootstrap`)

- Requires `ADMIN_BOOTSTRAP_SECRET` environment variable
- Rejects the default placeholder value `"change-this-admin-bootstrap-secret"`
- Uses timing-safe comparison (`timingSafeEqual`) to prevent timing attacks
- Rate-limited: max 5 attempts per IP per hour
- If a `SUPER_ADMIN` already exists, requires confirmation (`RESET`) or the
  correct bootstrap secret via the API
- Never creates an admin without the secret
- Creates an audit log entry on every bootstrap operation

## Migration Steps for Adding a New Column (Example)

If a new nullable column needs to be added (e.g., `User.metadata`):

1. Edit `prisma/schema.prisma`:

   ```prisma
   model User {
     // ... existing fields ...
     metadata Json?    // new nullable field
   }
   ```

2. Generate client:

   ```bash
   npm run db:generate
   ```

3. Apply to production (additive, non-destructive):

   ```bash
   DIRECT_DATABASE_URL="<direct-url>" npm run db:push:prod
   ```

4. For local dev, the same applies:
   ```bash
   npm run db:push
   ```

No migration files need to be created or deployed. The schema is the source of truth,
and `db push` syncs it to the database in a non-destructive manner.
