// Custom service worker code for push notifications
// This will be merged with next-pwa's generated service worker

// Push notification handler
self.addEventListener("push", function (event) {
  const data = event.data?.json() || {};
  const title = data.title || "Capture the Pub";
  const options = {
    body: data.body || "New game update",
    icon: "/manifest-icon-192.maskable.png",
    badge: "/manifest-icon-192.maskable.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "game-update",
    data: data.data || {},
    requireInteraction: false,
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

