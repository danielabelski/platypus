---
name: add-api-endpoint
description: Guide for adding new API endpoints to the Platypus backend using Hono.js.
---

# Adding New API Endpoints

## Steps

1. Create route file in `apps/backend/src/routes/`
2. Import and mount in `apps/backend/src/server.ts`
3. Define validation schemas in `packages/schemas/index.ts`
4. Use Hono's context to access the database: `c.get("db")`
5. Apply `requireAuth` middleware to protect routes:

```typescript
import { requireAuth } from "../middleware.ts";

const myRoute = new Hono();
myRoute.use("*", requireAuth);
```
