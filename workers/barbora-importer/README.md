# Barbora Importer

Imports Barbora.lt data into the AI Grocery platform.

## Scripts

### Import Categories

```bash
pnpm import:categories [path/to/categoryTree.json]
```

Imports the Barbora category tree into `ExternalCategory`. Idempotent — safe to rerun.

## Requirements

- PostgreSQL running via Docker Compose (`infra/docker/docker-compose.yml`)
- Database seeded (`pnpm db:seed`)
- Prisma client generated (`pnpm db:generate`)
