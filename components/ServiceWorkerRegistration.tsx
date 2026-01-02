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

      console.log("ServiceWorkerRegistration:", {
        isPWA,
        displayMode: window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
      });

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
              
              // Wait for service worker to be ready
              await navigator.serviceWorker.ready;
              console.log("Service worker is ready in", isPWA ? "PWA" : "browser", "mode");
            } catch (err) {
              console.error("Failed to register service worker:", err);
            }
          } else {
            console.log("Service worker already registered:", registration.scope);
            
            // Ensure it's active
            if (registration.active) {
              console.log("Service worker is active in", isPWA ? "PWA" : "browser", "mode");
            } else if (registration.installing) {
              console.log("Service worker is installing...");
            } else if (registration.waiting) {
              console.log("Service worker is waiting, skipping wait...");
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

