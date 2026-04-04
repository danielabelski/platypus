"use client";

import { useState, useEffect, useCallback } from "react";
import { useBackendUrl } from "@/app/client-context";
import { fetcher } from "@/lib/utils";
import { joinUrl } from "@/lib/utils";

type PushState =
  | "loading"
  | "unsupported"
  | "denied"
  | "subscribed"
  | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const backendUrl = useBackendUrl();
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setState(subscription ? "subscribed" : "unsubscribed");
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!backendUrl) return;

    const { publicKey } = await fetcher(joinUrl(backendUrl, "/push/vapid-key"));
    if (!publicKey) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
        .buffer as ArrayBuffer,
    });

    const json = subscription.toJSON();

    await fetcher(joinUrl(backendUrl, "/push/subscriptions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
      }),
    });

    setState("subscribed");
  }, [backendUrl]);

  const unsubscribe = useCallback(async () => {
    if (!backendUrl) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetcher(joinUrl(backendUrl, "/push/subscriptions"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    }

    setState("unsubscribed");
  }, [backendUrl]);

  return { state, subscribe, unsubscribe };
}
