# Deployment

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+
- Docker (optional)

## Local Development

```bash
pnpm install
cp .env.example .env.local
docker-compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Production

```bash
pnpm build
pnpm start
```

## Docker

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

## Environment Variables

See `.env.example` for required configuration.
