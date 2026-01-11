"use client";

import { useEffect } from "react";

/**
 * Component to ensure service worker is registered
 * Registers the service worker following Next.js PWA guide
 * Works in both browser and PWA (standalone) mode
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Note: Service worker registration also happens in usePushNotifications hook
    // This component ensures it's registered for PWA functionality
    // In development, the hook will handle registration when needed

    if ("serviceWorker" in navigator) {
      // Check if running as PWA
      const isPWA = window.matchMedia("(display-mode: standalone)").matches || 
                     (window.navigator as any).standalone === true ||
                     document.referrer.includes("android-app://");

      // Wait for page to load
      const registerSW = async () => {
        try {
          console.log("[SW Registration] Starting service worker registration...");

          // Check if already registered
          let registration = await navigator.serviceWorker.getRegistration();

          if (!registration) {
            // Register service worker (following Next.js PWA guide)
            console.log("[SW Registration] No existing registration, registering /sw.js");
            try {
              registration = await navigator.serviceWorker.register("/sw.js", {
                scope: "/",
                updateViaCache: "none",
              });

              console.log("[SW Registration] Registration successful, waiting for ready state...");

              // Wait for service worker to be ready
              await navigator.serviceWorker.ready;

              console.log("[SW Registration] Service worker is ready and active");
            } catch (err) {
              console.error("[SW Registration] Failed to register service worker:", err);
            }
          } else {
            console.log("[SW Registration] Service worker already registered");

            // Ensure it's active
            if (registration.waiting) {
              console.log("[SW Registration] Service worker waiting, sending SKIP_WAITING message");
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }

            // Verify it's active and controlling
            if (registration.active) {
              console.log("[SW Registration] Service worker state:", registration.active.state);
            }
          }
        } catch (error) {
          console.error("[SW Registration] Service worker registration failed:", error);
        }
      };

      // Register immediately for PWA, after small delay for browser
      // This ensures SW is ready ASAP for push notifications
      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}

