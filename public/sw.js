self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "New message", body: event.data ? event.data.text() : "You have a new notification." };
  }

  const title = data.title || "New notification";
  const options = {
    body: data.body || "Open the app to view details.",
    icon: data.icon || "/images/icons/icon-192.png",
    badge: data.badge || "/images/icons/icon-192.png",
    tag: data.tag || "nga-notification",
    data: {
      url: data.url || "/admin/messages",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/admin/messages";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
