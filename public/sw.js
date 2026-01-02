// Service worker for push notifications
// Based on Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps

// Push notification handler
self.addEventListener("push", function (event) {
  console.log("Push event received:", event);

  let data = {};
  let title = "Reuben's Bucks";
  let body = "New game update";

  // Try to parse the push data
  if (event.data) {
    try {
      // Check if it's JSON text
      const text = event.data.text();
      if (text) {
        data = JSON.parse(text);
        title = data.title || title;
        body = data.body || body;
      }
    } catch (e) {
      console.error("Error parsing push data:", e);
      // Fallback: try json() method if available
      try {
        data = event.data.json();
        title = data.title || title;
        body = data.body || body;
      } catch (e2) {
        console.error("Error parsing push data with json():", e2);
      }
    }
  }

  const options = {
    body: body,
    icon: "/manifest-icon-192.maskable.png",
    badge: "/manifest-icon-192.maskable.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "game-update",
    data: data.data || {},
    requireInteraction: false,
    actions: data.actions || [],
  };

  console.log("Showing notification:", title, options);

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error("Error showing notification:", err);
    })
  );
});

// Notification click handler
self.addEventListener("notificationclick", function (event) {
  console.log("Notification click received.");
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

