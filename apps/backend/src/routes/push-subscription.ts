import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { pushSubscriptionCreateSchema } from "@platypus/schemas";
import { sValidator } from "@hono/standard-validator";
import type { Variables } from "../server.ts";
import { requireAuth } from "../middleware/authentication.ts";
import { pushSubscription } from "../db/schema.ts";
import { getVapidPublicKey } from "../services/push-notification.ts";

const push = new Hono<{ Variables: Variables }>();

push.use("*", requireAuth);

push.get("/vapid-key", (c) => {
  const publicKey = getVapidPublicKey();
  return c.json({ publicKey });
});

push.post(
  "/subscriptions",
  sValidator("json", pushSubscriptionCreateSchema),
  async (c) => {
    const user = c.get("user")!;
    const db = c.get("db");
    const data = c.req.valid("json" as never) as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    const id = nanoid();
    const now = new Date();

    await db
      .insert(pushSubscription)
      .values({
        id,
        userId: user.id,
        endpoint: data.endpoint,
        keysP256dh: data.keys.p256dh,
        keysAuth: data.keys.auth,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscription.endpoint,
        set: {
          userId: user.id,
          keysP256dh: data.keys.p256dh,
          keysAuth: data.keys.auth,
          createdAt: now,
        },
      });

    return c.json({ success: true }, 201);
  },
);

push.delete("/subscriptions", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const { endpoint } = await c.req.json<{ endpoint: string }>();

  if (!endpoint) {
    return c.json({ error: "endpoint is required" }, 400);
  }

  await db
    .delete(pushSubscription)
    .where(
      and(
        eq(pushSubscription.endpoint, endpoint),
        eq(pushSubscription.userId, user.id),
      ),
    );

  return c.json({ success: true });
});

export { push };
