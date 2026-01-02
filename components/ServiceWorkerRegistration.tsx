"use client";

import { useEffect } from "react";

/**
 * Component to ensure service worker is registered
 * This is a fallback in case next-pwa's auto-registration doesn't work
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "development") return;

    if ("serviceWorker" in navigator) {
      // Wait for page to load
      const registerSW = async () => {
        try {
          // Check if already registered
          let registration = await navigator.serviceWorker.getRegistration();
          
          if (!registration) {
            // Register service worker (following Next.js PWA guide)
            console.log("Registering service worker...");
            try {
              registration = await navigator.serviceWorker.register("/sw.js", {
                scope: "/",
                updateViaCache: "none",
              });
              console.log("Service worker registered:", registration.scope);
            } catch (err) {
              console.error("Failed to register service worker:", err);
            }
          } else {
            console.log("Service worker already registered:", registration.scope);
          }
        } catch (error) {
          console.error("Service worker registration failed:", error);
        }
      };

      // Register after a short delay to let next-pwa try first
      setTimeout(registerSW, 1000);
    }
  }, []);

  return null;
}

