import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockDb,
  mockSession,
  mockNoSession,
  resetMockDb,
} from "../test-utils.ts";
import app from "../server.ts";

// Mock nanoid to return predictable IDs
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-id-123"),
}));

// Mock the push notification service
vi.mock("../services/push-notification.ts", () => ({
  getVapidPublicKey: vi.fn(() => "test-vapid-public-key"),
  initWebPush: vi.fn(() => true),
  isWebPushEnabled: vi.fn(() => true),
  sendPushToUsers: vi.fn(),
  sendPushForWorkspaceNotification: vi.fn(),
}));

describe("Push Subscription Routes", () => {
  beforeEach(() => {
    resetMockDb();
    vi.clearAllMocks();
  });

  describe("GET /push/vapid-key", () => {
    it("should return 401 if not authenticated", async () => {
      mockNoSession();
      const res = await app.request("/push/vapid-key");
      expect(res.status).toBe(401);
    });

    it("should return the VAPID public key", async () => {
      mockSession();
      const res = await app.request("/push/vapid-key");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.publicKey).toBe("test-vapid-public-key");
    });
  });

  describe("POST /push/subscriptions", () => {
    const validPayload = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
      keys: {
        p256dh: "test-p256dh-key",
        auth: "test-auth-key",
      },
    };

    it("should return 401 if not authenticated", async () => {
      mockNoSession();
      const res = await app.request("/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      });
      expect(res.status).toBe(401);
    });

    it("should create a push subscription", async () => {
      mockSession();
      mockDb.onConflictDoUpdate = vi.fn().mockResolvedValueOnce({});
      mockDb.values.mockReturnValueOnce(mockDb);

      const res = await app.request("/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return 422 for invalid payload", async () => {
      mockSession();
      const res = await app.request("/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "not-a-url" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /push/subscriptions", () => {
    it("should return 401 if not authenticated", async () => {
      mockNoSession();
      const res = await app.request("/push/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "https://fcm.googleapis.com/fcm/send/test",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("should delete a push subscription by endpoint", async () => {
      mockSession();
      mockDb.where.mockResolvedValueOnce({});

      const res = await app.request("/push/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "https://fcm.googleapis.com/fcm/send/test",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should return 400 if endpoint is missing", async () => {
      mockSession();
      const res = await app.request("/push/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("endpoint is required");
    });
  });
});
