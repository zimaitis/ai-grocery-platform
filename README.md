# AI Grocery Platform

Personal grocery intelligence platform.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

## Setup

```bash
# Start PostgreSQL
docker compose -f infra/docker/docker-compose.yml up -d

# Install dependencies
pnpm install

# Set up database
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Start dev servers
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps and packages |
| `pnpm typecheck` | Type-check all apps and packages |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed database with sample data |

## Architecture

See [ai-grocery-architecture](https://github.com/zimaitis/ai-grocery-architecture) for design decisions.
