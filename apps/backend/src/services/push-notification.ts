import webpush from "web-push";
import { eq, inArray, or } from "drizzle-orm";
import { db } from "../index.ts";
import {
  pushSubscription,
  workspace as workspaceTable,
  organizationMember,
  user as userTable,
} from "../db/schema.ts";
import { logger } from "../logger.ts";

let webPushEnabled = false;

export function initWebPush(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey) {
    logger.warn(
      "VAPID keys not configured. Web push notifications are disabled. Generate keys with: npx web-push generate-vapid-keys",
    );
    return false;
  }

  webpush.setVapidDetails(
    subject || "mailto:admin@example.com",
    publicKey,
    privateKey,
  );

  webPushEnabled = true;
  return true;
}

export function isWebPushEnabled(): boolean {
  return webPushEnabled;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!webPushEnabled || userIds.length === 0) return;

  const subscriptions = await db
    .select()
    .from(pushSubscription)
    .where(inArray(pushSubscription.userId, userIds));

  if (subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keysP256dh,
              auth: sub.keysAuth,
            },
          },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db
            .delete(pushSubscription)
            .where(eq(pushSubscription.id, sub.id));
          logger.info(
            { endpoint: sub.endpoint },
            "Removed stale push subscription",
          );
        } else {
          throw err;
        }
      }
    }),
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    logger.warn(
      { failureCount: failures.length, totalCount: results.length },
      "Some push notifications failed to send",
    );
  }
}

export async function sendPushForWorkspaceNotification(
  workspaceId: string,
  payload: PushPayload,
): Promise<void> {
  if (!webPushEnabled) return;

  // Find the workspace to get owner and org
  const [ws] = await db
    .select({
      ownerId: workspaceTable.ownerId,
      organizationId: workspaceTable.organizationId,
    })
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);

  if (!ws) return;

  // Collect user IDs: workspace owner + org admins + super admins
  const userIds = new Set<string>();
  userIds.add(ws.ownerId);

  // Org admins
  const orgAdmins = await db
    .select({ userId: organizationMember.userId })
    .from(organizationMember)
    .where(eq(organizationMember.organizationId, ws.organizationId));

  for (const member of orgAdmins) {
    if (member.userId) userIds.add(member.userId);
  }

  // Super admins (user.role = "admin")
  const superAdmins = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.role, "admin"));

  for (const admin of superAdmins) {
    userIds.add(admin.id);
  }

  await sendPushToUsers(Array.from(userIds), payload);
}
