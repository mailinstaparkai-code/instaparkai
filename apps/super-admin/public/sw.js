self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: payload.data,
      vibrate: [200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/parking-admin/m/") && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/parking-admin/m/queue");
    })
  );
});
