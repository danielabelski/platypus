---
name: database-schema-changes
description: Guide for making database schema changes in Platypus using Drizzle ORM.
---

# Database Schema Changes

## Steps

1. Edit `apps/backend/src/db/schema.ts`
2. Ensure `pnpm dev` is running (database must be up)
3. Run `pnpm drizzle-kit-push` to apply changes

## Auth Schema

Authentication tables are managed by better-auth. If you modify the auth configuration in `apps/backend/src/auth.ts`, regenerate the schema:

```bash
pnpm --dir apps/backend dlx @better-auth/cli@latest generate --config ./src/auth.ts --output ./src/db/auth-schema.ts --yes
```
