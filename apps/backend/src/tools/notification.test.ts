import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, dbMethods } = vi.hoisted(() => {
  const mock: any = {};
  const methods = [
    "select",
    "from",
    "where",
    "limit",
    "orderBy",
    "insert",
    "values",
    "update",
    "set",
    "delete",
    "returning",
  ];
  methods.forEach((method) => {
    mock[method] = vi.fn().mockReturnValue(mock);
  });
  return { mockDb: mock, dbMethods: methods };
});

vi.mock("../index.ts", () => ({
  db: mockDb,
}));

vi.mock("../services/event-dispatch.ts", () => ({
  dispatchEvent: vi.fn(),
}));

import { createNotificationTools } from "./notification.ts";
import { dispatchEvent } from "../services/event-dispatch.ts";

const ctx = { toolCallId: "test", messages: [] };
const workspaceId = "ws-1";
const agentId = "agent-1";

function resetDb() {
  dbMethods.forEach((method) => {
    mockDb[method] = vi.fn().mockReturnValue(mockDb);
  });
}

describe("createNotificationTools", () => {
  let tools: ReturnType<typeof createNotificationTools>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    tools = createNotificationTools(workspaceId, agentId);
  });

  it("returns the expected tool names", () => {
    expect(Object.keys(tools)).toEqual([
      "createNotification",
      "listNotifications",
      "updateNotification",
      "deleteNotification",
    ]);
  });

  describe("createNotification", () => {
    it("inserts a notification and dispatches event", async () => {
      const record = {
        id: "notif-1",
        workspaceId,
        agentId,
        title: "Test",
        body: "Hello",
      };
      mockDb.returning.mockResolvedValue([record]);

      const result = await tools.createNotification.execute(
        { title: "Test", body: "Hello" },
        ctx,
      );

      expect(result).toEqual(record);
      expect(dispatchEvent).toHaveBeenCalledWith(
        workspaceId,
        "notification.created",
        record,
      );
    });
  });

  describe("listNotifications", () => {
    it("returns notifications with default limit", async () => {
      const notifications = [
        { id: "n1", body: "First" },
        { id: "n2", body: "Second" },
      ];
      mockDb.limit.mockResolvedValue(notifications);

      const result = await tools.listNotifications.execute({}, ctx);
      expect(result).toEqual(notifications);
    });
  });

  describe("updateNotification", () => {
    it("returns error when notification not found", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await tools.updateNotification.execute(
        { notificationId: "bad-id", body: "Updated" },
        ctx,
      );

      expect(result).toEqual({ error: "Notification not found" });
    });

    it("updates and dispatches event when found", async () => {
      const updated = { id: "n1", body: "Updated" };
      mockDb.limit.mockResolvedValue([{ id: "n1" }]);
      mockDb.returning.mockResolvedValue([updated]);

      const result = await tools.updateNotification.execute(
        { notificationId: "n1", body: "Updated" },
        ctx,
      );

      expect(result).toEqual(updated);
      expect(dispatchEvent).toHaveBeenCalledWith(
        workspaceId,
        "notification.updated",
        updated,
      );
    });
  });

  describe("deleteNotification", () => {
    it("returns error when notification not found", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await tools.deleteNotification.execute(
        { notificationId: "bad-id" },
        ctx,
      );

      expect(result).toEqual({ error: "Notification not found" });
    });

    it("deletes and dispatches event when found", async () => {
      mockDb.limit.mockResolvedValue([{ id: "n1" }]);

      const result = await tools.deleteNotification.execute(
        { notificationId: "n1" },
        ctx,
      );

      expect(result).toEqual({ success: true });
      expect(dispatchEvent).toHaveBeenCalledWith(
        workspaceId,
        "notification.dismissed",
        { notificationId: "n1" },
      );
    });
  });
});
