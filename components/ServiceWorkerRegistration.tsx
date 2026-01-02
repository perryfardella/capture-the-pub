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
    if (process.env.NODE_ENV === "development") return;

    if ("serviceWorker" in navigator) {
      // Check if running as PWA
      const isPWA = window.matchMedia("(display-mode: standalone)").matches || 
                     (window.navigator as any).standalone === true ||
                     document.referrer.includes("android-app://");

      // Wait for page to load
      const registerSW = async () => {
        try {
          // Check if already registered
          let registration = await navigator.serviceWorker.getRegistration();
          
          if (!registration) {
            // Register service worker (following Next.js PWA guide)
            try {
              registration = await navigator.serviceWorker.register("/sw.js", {
                scope: "/",
                updateViaCache: "none",
              });
              
              // Wait for service worker to be ready
              await navigator.serviceWorker.ready;
            } catch (err) {
              console.error("Failed to register service worker:", err);
            }
          } else {
            // Ensure it's active
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          }
        } catch (error) {
          console.error("Service worker registration failed:", error);
        }
      };

      // Register after page load (sooner for PWA)
      const delay = isPWA ? 500 : 1000;
      setTimeout(registerSW, delay);
    }
  }, []);

  return null;
}

