/* F10 device notifications: no private data is cached by this service worker. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let alert;
  try { alert = event.data ? event.data.json() : null; } catch { alert = null; }
  if (!alert || typeof alert.url !== "string" ||
    !/^\/app\/notifications\/open\/[a-f0-9-]{36}$/.test(alert.url)) return;
  event.waitUntil(self.registration.showNotification(
    typeof alert.title === "string" ? alert.title.slice(0, 120) : "F10 Operations",
    {
      body: typeof alert.body === "string" ? alert.body.slice(0, 180) : "Novo atendimento.",
      tag: typeof alert.id === "string" ? "f10-" + alert.id : "f10-alert",
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: { url: alert.url },
      requireInteraction: alert.kind === "chat.needs_attention",
    }
  ));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const path = event.notification.data?.url;
  if (typeof path !== "string" ||
    !/^\/app\/notifications\/open\/[a-f0-9-]{36}$/.test(path)) return;
  event.waitUntil((async () => {
    const url = new URL(path, self.location.origin).toString();
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
