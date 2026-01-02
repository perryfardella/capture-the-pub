// Service worker for push notifications
// Based on Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps

// Activate immediately when installed (skip waiting)
self.addEventListener("install", function (event) {
  console.log("Service worker installing, skipping wait");
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  console.log("Service worker activating, claiming clients");
  event.waitUntil(self.clients.claim());
});

// Push notification handler
self.addEventListener("push", function (event) {
  console.log("=== PUSH EVENT RECEIVED ===");
  console.log("Push event:", event);
  console.log("Has data:", !!event.data);

  const promiseChain = event.data
    ? (async () => {
        try {
          // Get the data as text first, then parse JSON
          const text = await event.data.text();
          console.log("Push data as text:", text);
          
          let data;
          try {
            data = JSON.parse(text);
            console.log("Parsed push data:", data);
          } catch (parseErr) {
            console.error("Failed to parse JSON, using text as body:", parseErr);
            // If it's not JSON, treat the entire text as the notification body
            data = {
              title: "Reuben's Bucks",
              body: text,
            };
          }
          
          const title = data.title || "Reuben's Bucks";
          const body = data.body || "New game update";

          const options = {
            body: body,
            icon: "/manifest-icon-192.maskable.png",
            badge: "/manifest-icon-192.maskable.png",
            vibrate: [200, 100, 200],
            tag: data.tag || "game-update",
            data: data.data || {},
            requireInteraction: true, // Keep notification visible until user interacts
            silent: false, // Ensure sound/vibration works
            timestamp: Date.now(),
            renotify: true, // Show notification even if one with same tag exists
            actions: data.actions || [],
          };

          console.log("Showing notification:", title, options);
          await self.registration.showNotification(title, options);
          console.log("✅ Notification displayed successfully");
        } catch (err) {
          console.error("Error processing push notification:", err);
          // Last resort: show default notification
          try {
            await self.registration.showNotification("Reuben's Bucks", {
              body: "New game update",
              icon: "/manifest-icon-192.maskable.png",
              requireInteraction: true,
              silent: false,
            });
            console.log("Default notification displayed");
          } catch (notifErr) {
            console.error("Failed to show default notification:", notifErr);
          }
        }
      })()
    : Promise.resolve(
        self.registration.showNotification("Reuben's Bucks", {
          body: "New game update",
          icon: "/manifest-icon-192.maskable.png",
          requireInteraction: true,
          silent: false,
        }).then(() => {
          console.log("No-data notification displayed");
        }).catch((err) => {
          console.error("Failed to show no-data notification:", err);
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
