import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockDb, resetMockDb } from "../test-utils.ts";

// Mock web-push
const mockSetVapidDetails = vi.fn();
const mockSendNotification = vi.fn();
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: (...args: any[]) => mockSetVapidDetails(...args),
    sendNotification: (...args: any[]) => mockSendNotification(...args),
  },
}));

// Mock logger
vi.mock("../logger.ts", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
import {
  initWebPush,
  isWebPushEnabled,
  getVapidPublicKey,
  sendPushToUsers,
  sendPushForWorkspaceNotification,
} from "./push-notification.ts";

describe("Push Notification Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetMockDb();
    vi.clearAllMocks();
    // Reset env vars
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("initWebPush", () => {
    it("should return false when VAPID keys are not configured", () => {
      const result = initWebPush();
      expect(result).toBe(false);
      expect(mockSetVapidDetails).not.toHaveBeenCalled();
    });

    it("should return true and configure web-push when VAPID keys are set", () => {
      process.env.VAPID_PUBLIC_KEY = "test-public-key";
      process.env.VAPID_PRIVATE_KEY = "test-private-key";
      process.env.VAPID_SUBJECT = "mailto:test@example.com";

      const result = initWebPush();
      expect(result).toBe(true);
      expect(mockSetVapidDetails).toHaveBeenCalledWith(
        "mailto:test@example.com",
        "test-public-key",
        "test-private-key",
      );
    });

    it("should use default VAPID subject when not set", () => {
      process.env.VAPID_PUBLIC_KEY = "test-public-key";
      process.env.VAPID_PRIVATE_KEY = "test-private-key";

      initWebPush();
      expect(mockSetVapidDetails).toHaveBeenCalledWith(
        "mailto:admin@example.com",
        "test-public-key",
        "test-private-key",
      );
    });
  });

  describe("getVapidPublicKey", () => {
    it("should return null when VAPID_PUBLIC_KEY is not set", () => {
      expect(getVapidPublicKey()).toBeNull();
    });

    it("should return the public key when set", () => {
      process.env.VAPID_PUBLIC_KEY = "my-public-key";
      expect(getVapidPublicKey()).toBe("my-public-key");
    });
  });

  describe("sendPushToUsers", () => {
    it("should return early when no user IDs provided", async () => {
      process.env.VAPID_PUBLIC_KEY = "key";
      process.env.VAPID_PRIVATE_KEY = "key";
      initWebPush();

      await sendPushToUsers([], { title: "Test", body: "Body" });
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("should send notifications to all subscriptions for given users", async () => {
      process.env.VAPID_PUBLIC_KEY = "key";
      process.env.VAPID_PRIVATE_KEY = "key";
      initWebPush();

      const subscriptions = [
        {
          id: "sub-1",
          userId: "user-1",
          endpoint: "https://push.example.com/1",
          keysP256dh: "p256dh-1",
          keysAuth: "auth-1",
        },
        {
          id: "sub-2",
          userId: "user-1",
          endpoint: "https://push.example.com/2",
          keysP256dh: "p256dh-2",
          keysAuth: "auth-2",
        },
      ];
      mockDb.where.mockResolvedValueOnce(subscriptions);
      mockSendNotification.mockResolvedValue({});

      await sendPushToUsers(["user-1"], { title: "Test", body: "Body" });
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });

    it("should return early when no subscriptions found", async () => {
      process.env.VAPID_PUBLIC_KEY = "key";
      process.env.VAPID_PRIVATE_KEY = "key";
      initWebPush();

      mockDb.where.mockResolvedValueOnce([]);

      await sendPushToUsers(["user-1"], { title: "Test", body: "Body" });
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("should delete stale subscriptions on 410 error", async () => {
      process.env.VAPID_PUBLIC_KEY = "key";
      process.env.VAPID_PRIVATE_KEY = "key";
      initWebPush();

      const subscriptions = [
        {
          id: "sub-1",
          userId: "user-1",
          endpoint: "https://push.example.com/1",
          keysP256dh: "p256dh-1",
          keysAuth: "auth-1",
        },
      ];
      mockDb.where
        .mockResolvedValueOnce(subscriptions) // select subscriptions
        .mockResolvedValueOnce({}); // delete stale

      const error: any = new Error("Gone");
      error.statusCode = 410;
      mockSendNotification.mockRejectedValueOnce(error);

      await sendPushToUsers(["user-1"], { title: "Test", body: "Body" });
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe("sendPushForWorkspaceNotification", () => {
    it("should return early when workspace not found", async () => {
      process.env.VAPID_PUBLIC_KEY = "key";
      process.env.VAPID_PRIVATE_KEY = "key";
      initWebPush();

      mockDb.limit.mockResolvedValueOnce([]); // workspace not found

      await sendPushForWorkspaceNotification("ws-1", {
        title: "Test",
        body: "Body",
      });
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("should collect workspace owner, org members, and super admins", async () => {
      process.env.VAPID_PUBLIC_KEY = "key";
      process.env.VAPID_PRIVATE_KEY = "key";
      initWebPush();

      // Workspace lookup
      mockDb.limit.mockResolvedValueOnce([
        { ownerId: "owner-1", organizationId: "org-1" },
      ]);
      // Org members
      mockDb.where
        .mockReturnValueOnce(mockDb) // workspace where (chaining)
        .mockResolvedValueOnce([{ userId: "admin-1" }, { userId: "member-1" }]) // org members
        .mockResolvedValueOnce([{ id: "super-1" }]) // super admins
        .mockResolvedValueOnce([]); // subscriptions query (no subs found)

      await sendPushForWorkspaceNotification("ws-1", {
        title: "Test",
        body: "Body",
      });

      // Should have queried for subscriptions (even if none found)
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
