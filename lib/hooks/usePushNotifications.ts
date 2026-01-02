"use client";

import { useEffect, useState, useCallback } from "react";

interface PushSubscriptionState {
  subscription: PushSubscription | null;
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushSubscriptionState>({
    subscription: null,
    isSupported: false,
    permission: "default",
    isSubscribed: false,
  });

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    const permission = Notification.permission;

    setState((prev) => ({
      ...prev,
      isSupported,
      permission,
    }));

    // Check if already subscribed
    if (isSupported && "serviceWorker" in navigator) {
      // Wait for page to fully load before checking service worker
      const checkServiceWorker = async () => {
        try {
          // Wait a bit for next-pwa's auto-registration
          await new Promise((resolve) => setTimeout(resolve, 2000));
          
          let registration = await navigator.serviceWorker.getRegistration();
          
          // If still no registration, try to register manually
          if (!registration) {
            try {
              registration = await navigator.serviceWorker.register("/sw.js", {
                scope: "/",
              });
              console.log("Manually registered service worker");
            } catch (err) {
              console.warn("Could not register service worker:", err);
              return;
            }
          }
          
          if (registration) {
            await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            console.log("Current subscription:", subscription ? "Found" : "None");
            setState((prev) => ({
              ...prev,
              subscription,
              isSubscribed: !!subscription,
            }));
          }
        } catch (err) {
          console.warn("Error checking subscription:", err);
        }
      };
      
      // Run after page load
      if (document.readyState === "complete") {
        checkServiceWorker();
      } else {
        window.addEventListener("load", checkServiceWorker);
      }
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn("Push notifications are not supported");
      return false;
    }

    if (state.permission === "granted") {
      return true;
    }

    const permission = await Notification.requestPermission();
    setState((prev) => ({ ...prev, permission }));

    return permission === "granted";
  }, [state.isSupported, state.permission]);

  const subscribe = useCallback(
    async (playerId: string): Promise<boolean> => {
      if (!state.isSupported) {
        console.warn("Push notifications are not supported");
        return false;
      }

      if (state.permission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          return false;
        }
      }

      try {
        // Ensure service worker is registered first
        let registration = await navigator.serviceWorker.getRegistration();

        console.log("Current service worker registration:", registration);

        if (!registration) {
          console.log("No service worker found, attempting to register...");
          
          // Wait a bit for next-pwa to inject the registration script
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // Check again after waiting
          registration = await navigator.serviceWorker.getRegistration();
          
          if (!registration) {
            // Try to register the service worker manually
            // next-pwa generates sw.js in the public folder
            const swPaths = ["/sw.js", "/sw.js?timestamp=" + Date.now()];
            
            let lastError: Error | null = null;
            
            for (const swPath of swPaths) {
              try {
                console.log(`Attempting to register service worker at ${swPath}`);
                registration = await navigator.serviceWorker.register(swPath, {
                  scope: "/",
                });
                console.log("Service worker registered successfully at:", swPath);
                break;
              } catch (err) {
                console.warn(`Failed to register at ${swPath}:`, err);
                lastError = err instanceof Error ? err : new Error(String(err));
              }
            }
            
            if (!registration) {
              // Check if we're in production
              const isProduction = process.env.NODE_ENV === "production";
              const errorMsg = isProduction
                ? `Service worker file not found. Check that next-pwa generated /sw.js in the public folder. Error: ${lastError?.message || "Unknown"}`
                : "Service worker not available. Make sure you're running a production build (pnpm build && pnpm start). Push notifications don't work in development mode.";
              throw new Error(errorMsg);
            }
          }
        }

        // Wait for registration to be ready
        console.log("Waiting for service worker to be ready...");
        await navigator.serviceWorker.ready;
        console.log("Service worker is ready");

        // Get VAPID public key from server
        const response = await fetch("/api/push/vapid-public-key");
        if (!response.ok) {
          throw new Error(`Failed to get VAPID key: ${response.statusText}`);
        }

        const data = await response.json();
        const { publicKey } = data;

        if (!publicKey) {
          throw new Error(
            "VAPID public key not available. Make sure NEXT_PUBLIC_VAPID_PUBLIC_KEY is set in your environment variables."
          );
        }

        // Convert VAPID key to Uint8Array
        const applicationServerKey = urlBase64ToUint8Array(publicKey);

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // Convert subscription to JSON-serializable format
        const subscriptionJson = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
            auth: arrayBufferToBase64(subscription.getKey("auth")!),
          },
        };

        // Send subscription to server
        console.log("Sending subscription to server:", {
          playerId,
          endpoint: subscriptionJson.endpoint.substring(0, 50) + "...",
          hasKeys: !!subscriptionJson.keys,
        });

        const subscribeResponse = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription: subscriptionJson,
            playerId,
          }),
        });

        if (!subscribeResponse.ok) {
          const errorData = await subscribeResponse.json().catch(() => ({}));
          console.error("Failed to save subscription:", errorData);
          throw new Error(
            errorData.error ||
              `Failed to save subscription: ${subscribeResponse.statusText}`
          );
        }

        const result = await subscribeResponse.json();
        console.log("Subscription saved successfully:", result);

        setState((prev) => ({
          ...prev,
          subscription,
          isSubscribed: true,
          permission: "granted",
        }));

        return true;
      } catch (error) {
        console.error("Error subscribing to push notifications:", error);
        // Re-throw to allow component to handle it
        throw error;
      }
    },
    [state.isSupported, state.permission, requestPermission]
  );

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) {
      return false;
    }

    try {
      await state.subscription.unsubscribe();

      // Notify server to remove subscription
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: state.subscription,
        }),
      });

      setState((prev) => ({
        ...prev,
        subscription: null,
        isSubscribed: false,
      }));

      return true;
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      return false;
    }
  }, [state.subscription]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
