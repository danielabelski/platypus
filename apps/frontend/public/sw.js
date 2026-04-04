self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) =>
  event.respondWith(fetch(event.request)),
);

self.addEventListener("push", (event) => {
  let payload;
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "Platypus", body: event.data.text() };
    }
  } else {
    payload = { title: "Platypus", body: "New notification" };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Platypus", {
      body: payload.body || "",
      icon: "/icon-192x192.png",
      tag: payload.data?.notificationId,
      data: payload.data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/");
    }),
  );
});
