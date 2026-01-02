// Service worker for push notifications
// Based on Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps

// Push notification handler
self.addEventListener("push", function (event) {
  console.log("Push event received:", event);

  const promiseChain = event.data
    ? event.data
        .json()
        .then((data) => {
          console.log("Parsed push data:", data);
          const title = data.title || "Reuben's Bucks";
          const body = data.body || "New game update";

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
          return self.registration.showNotification(title, options);
        })
        .catch((err) => {
          console.error("Error parsing push data:", err);
          // Fallback: try text() method
          return event.data
            .text()
            .then((text) => {
              const data = JSON.parse(text);
              const title = data.title || "Reuben's Bucks";
              const body = data.body || "New game update";

              return self.registration.showNotification(title, {
                body: body,
                icon: "/manifest-icon-192.maskable.png",
                badge: "/manifest-icon-192.maskable.png",
                vibrate: [200, 100, 200],
                tag: data.tag || "game-update",
                data: data.data || {},
              });
            })
            .catch((err2) => {
              console.error("Error parsing push data as text:", err2);
              // Last resort: show default notification
              return self.registration.showNotification("Reuben's Bucks", {
                body: "New game update",
                icon: "/manifest-icon-192.maskable.png",
              });
            });
        })
    : Promise.resolve(
        self.registration.showNotification("Reuben's Bucks", {
          body: "New game update",
          icon: "/manifest-icon-192.maskable.png",
        })
      );

  event.waitUntil(promiseChain);
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

