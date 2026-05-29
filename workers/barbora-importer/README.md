# Barbora Taxonomy Import (Stage 1)

Imports Barbora.lt category taxonomy into the AI Grocery platform.

This is **Stage 1** of the Barbora pipeline (see `docs/integrations/barbora-orders-collect.md` for the full pipeline overview).

## Scripts

### Import Categories

```bash
pnpm barbora:taxonomy-import [path/to/categoryTree.json]
```

Imports the Barbora category tree into `ExternalCategory`. Idempotent — safe to rerun.

## Requirements

- PostgreSQL running via Docker Compose (`infra/docker/docker-compose.yml`)
- Database seeded (`pnpm db:seed`)
- Prisma client generated (`pnpm db:generate`)
