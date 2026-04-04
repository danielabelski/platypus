import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePushNotifications } from "./use-push-notifications";

// Mock the backend URL hook
vi.mock("@/app/client-context", () => ({
  useBackendUrl: vi.fn(() => "http://localhost:4000"),
}));

// Mock fetcher
const mockFetcher = vi.fn();
vi.mock("@/lib/utils", () => ({
  fetcher: (...args: any[]) => mockFetcher(...args),
  joinUrl: (base: string, path: string) => `${base}${path}`,
}));

// Mock browser APIs
const mockGetSubscription = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();

const mockPushManager = {
  getSubscription: mockGetSubscription,
  subscribe: mockSubscribe,
};

const mockRegistration = {
  pushManager: mockPushManager,
};

describe("usePushNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSubscription.mockResolvedValue(null);

    // Set up navigator.serviceWorker mock
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve(mockRegistration),
      },
      writable: true,
      configurable: true,
    });

    // Set up window.PushManager mock
    Object.defineProperty(window, "PushManager", {
      value: class {},
      writable: true,
      configurable: true,
    });

    // Set up Notification mock
    Object.defineProperty(window, "Notification", {
      value: { permission: "default" },
      writable: true,
      configurable: true,
    });
  });

  it("should start in loading state then resolve to unsubscribed", async () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.state).toBe("loading");

    await waitFor(() => {
      expect(result.current.state).toBe("unsubscribed");
    });
  });

  it("should report unsupported when serviceWorker is not available", async () => {
    const savedSW = navigator.serviceWorker;
    // @ts-expect-error - deleting to simulate unsupported browser
    delete (navigator as any).serviceWorker;

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.state).toBe("unsupported");
    });

    // Restore for subsequent tests
    Object.defineProperty(navigator, "serviceWorker", {
      value: savedSW,
      writable: true,
      configurable: true,
    });
  });

  it("should report denied when Notification.permission is denied", async () => {
    Object.defineProperty(window, "Notification", {
      value: { permission: "denied" },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.state).toBe("denied");
    });
  });

  it("should report subscribed when an existing subscription is found", async () => {
    mockGetSubscription.mockResolvedValue({ endpoint: "https://example.com" });

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.state).toBe("subscribed");
    });
  });

  it("should subscribe and post subscription to backend", async () => {
    mockFetcher.mockResolvedValueOnce({ publicKey: "test-vapid-key" });

    const mockSub = {
      toJSON: () => ({
        endpoint: "https://push.example.com/sub",
        keys: { p256dh: "p256dh-val", auth: "auth-val" },
      }),
    };
    mockSubscribe.mockResolvedValue(mockSub);
    mockFetcher.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.state).toBe("unsubscribed");
    });

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mockFetcher).toHaveBeenCalledWith(
      "http://localhost:4000/push/vapid-key",
    );
    expect(mockSubscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(ArrayBuffer),
    });
    expect(mockFetcher).toHaveBeenCalledWith(
      "http://localhost:4000/push/subscriptions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          endpoint: "https://push.example.com/sub",
          keys: { p256dh: "p256dh-val", auth: "auth-val" },
        }),
      }),
    );
    expect(result.current.state).toBe("subscribed");
  });

  it("should not subscribe when VAPID key is null", async () => {
    mockFetcher.mockResolvedValueOnce({ publicKey: null });

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.state).toBe("unsubscribed");
    });

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(result.current.state).toBe("unsubscribed");
  });

  it("should unsubscribe and delete subscription from backend", async () => {
    const mockSub = {
      endpoint: "https://push.example.com/sub",
      unsubscribe: mockUnsubscribe,
    };
    mockGetSubscription.mockResolvedValue(mockSub);
    mockUnsubscribe.mockResolvedValue(true);
    mockFetcher.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.state).toBe("subscribed");
    });

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockFetcher).toHaveBeenCalledWith(
      "http://localhost:4000/push/subscriptions",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({
          endpoint: "https://push.example.com/sub",
        }),
      }),
    );
    expect(result.current.state).toBe("unsubscribed");
  });
});
