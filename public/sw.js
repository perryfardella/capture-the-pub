// Service worker for push notifications
// Based on Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps

// Activate immediately when installed (skip waiting)
self.addEventListener("install", function (event) {
  console.log("Service worker installing, skipping wait");
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  console.log("Service worker activating, claiming clients");
  // Claim all clients immediately so service worker can handle push events
  event.waitUntil(self.clients.claim());
});

// Listen for messages from clients to keep service worker active
self.addEventListener("message", function (event) {
  console.log("Service worker received message:", event.data);
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Push notification handler
self.addEventListener("push", function (event) {
  console.log("=== PUSH EVENT RECEIVED ===");
  console.log("Push event:", event);
  console.log("Has data:", !!event.data);

  // Use waitUntil to keep service worker alive until notification is shown
  event.waitUntil(
    (async () => {
      try {
        let data = {};
        let title = "Reuben's Bucks";
        let body = "New game update";

        if (event.data) {
          try {
            // Get the data as text first, then parse JSON
            const text = await event.data.text();
            console.log("Push data as text:", text);
            
            try {
              data = JSON.parse(text);
              console.log("Parsed push data:", data);
              title = data.title || title;
              body = data.body || body;
            } catch (parseErr) {
              console.error("Failed to parse JSON, using text as body:", parseErr);
              // If it's not JSON, treat the entire text as the notification body
              body = text;
            }
          } catch (dataErr) {
            console.error("Error reading push data:", dataErr);
          }
        }

        // Badge icon for status bar - Android requires monochrome (white/transparent silhouette)
        // If you see a white square, create a badge icon:
        // - Size: 72x72px (for xxhdpi) or 96x96px (for xxxhdpi)
        // - Format: PNG with transparent background
        // - Design: Simple monochrome silhouette (Android uses only alpha channel)
        // - Then add the badge icon path in the notification payload
        const options = {
          body: body,
          icon: "/manifest-icon-192.maskable.png", // Large icon for notification drawer
          // Only include badge if provided in payload - otherwise system uses app icon
          ...(data.badge && { badge: data.badge }),
          image: data.image, // Optional large image for expanded notification
          vibrate: [200, 100, 200],
          tag: data.tag || "game-update",
          data: data.data || {},
          requireInteraction: true, // Keep notification visible until user dismisses (critical for PWA)
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
            // Omit badge - system will use app icon
            requireInteraction: true,
            silent: false,
          });
          console.log("Default notification displayed");
        } catch (notifErr) {
          console.error("Failed to show default notification:", notifErr);
        }
      }
    })()
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
        // If there's an existing window, navigate it and focus
        if (clientList.length > 0) {
          const client = clientList[0];
          // Navigate to the target URL and focus
          client.navigate(urlToOpen);
          return client.focus();
        }
        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
