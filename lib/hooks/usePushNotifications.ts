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
      // Check service worker and subscription (following Next.js PWA guide)
      const checkServiceWorker = async () => {
        try {
          // Check if running as PWA
          const isPWA = window.matchMedia("(display-mode: standalone)").matches || 
                       (window.navigator as any).standalone === true;
          
          console.log("Checking subscription in", isPWA ? "PWA" : "browser", "mode");
          
          // Get existing registration or register
          let registration = await navigator.serviceWorker.getRegistration();
          
          if (!registration) {
            // Register service worker
            registration = await navigator.serviceWorker.register("/sw.js", {
              scope: "/",
              updateViaCache: "none",
            });
            console.log("Service worker registered for subscription check");
          }
          
          await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          console.log("Current subscription:", subscription ? "Found" : "None", "in", isPWA ? "PWA" : "browser");
          setState((prev) => ({
            ...prev,
            subscription,
            isSubscribed: !!subscription,
          }));
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
    console.log("requestPermission() called");
    if (!state.isSupported) {
      console.warn("Push notifications are not supported");
      return false;
    }

    if (state.permission === "granted") {
      console.log("Permission already granted");
      return true;
    }

    console.log("Requesting notification permission from browser...");
    const permission = await Notification.requestPermission();
    console.log("Browser returned permission:", permission);
    setState((prev) => ({ ...prev, permission }));

    if (permission === "granted") {
      console.log("✅ Permission granted by user");
    } else if (permission === "denied") {
      console.warn("❌ Permission denied by user");
    } else {
      console.warn("⚠️ Permission default (user dismissed prompt)");
    }

    return permission === "granted";
  }, [state.isSupported, state.permission]);

  const subscribe = useCallback(
    async (playerId: string): Promise<boolean> => {
      console.log("subscribe() called with playerId:", playerId);
      console.log("Current state:", {
        isSupported: state.isSupported,
        permission: state.permission,
        isSubscribed: state.isSubscribed,
      });

      if (!state.isSupported) {
        console.warn("Push notifications are not supported");
        return false;
      }

      if (state.permission !== "granted") {
        console.log("Permission not granted, requesting permission...");
        const granted = await requestPermission();
        console.log("Permission request result:", granted);
        if (!granted) {
          console.warn("Permission was denied or not granted");
          return false;
        }
        console.log("Permission granted, continuing with subscription...");
      }

      try {
        console.log("Step 1: Checking service worker registration...");
        // Ensure service worker is registered first
        let registration = await navigator.serviceWorker.getRegistration();

        console.log("Current service worker registration:", registration ? "Found" : "Not found");

        if (!registration) {
          console.log("No service worker found, attempting to register...");
          
          // Register service worker (following Next.js PWA guide)
          console.log("Registering service worker at /sw.js...");
          try {
            registration = await navigator.serviceWorker.register("/sw.js", {
              scope: "/",
              updateViaCache: "none",
            });
            console.log("Service worker registered successfully:", registration.scope);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            console.error("Failed to register service worker:", err);
            throw new Error(
              `Failed to register service worker: ${errorMsg}. Make sure /sw.js exists in the public folder.`
            );
          }
        }

        // Wait for registration to be ready
        console.log("Step 2: Waiting for service worker to be ready...");
        const readyRegistration = await navigator.serviceWorker.ready;
        console.log("Service worker is ready:", readyRegistration.active?.state);
        
        // Use the ready registration
        registration = readyRegistration;

        // Get VAPID public key from server
        console.log("Step 3: Fetching VAPID public key...");
        const response = await fetch("/api/push/vapid-public-key");
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to get VAPID key:", response.status, errorText);
          throw new Error(`Failed to get VAPID key: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("VAPID key response:", { hasPublicKey: !!data.publicKey });
        const { publicKey } = data;

        if (!publicKey) {
          console.error("VAPID public key is missing from response:", data);
          throw new Error(
            "VAPID public key not available. Make sure NEXT_PUBLIC_VAPID_PUBLIC_KEY is set in your environment variables."
          );
        }

        // Convert VAPID key to Uint8Array
        console.log("Step 4: Converting VAPID key...");
        let applicationServerKey;
        try {
          applicationServerKey = urlBase64ToUint8Array(publicKey);
          console.log("VAPID key converted successfully");
        } catch (err) {
          console.error("Failed to convert VAPID key:", err);
          throw new Error(`Failed to convert VAPID key: ${err instanceof Error ? err.message : "Unknown error"}`);
        }

        // Subscribe to push notifications
        console.log("Step 5: Subscribing to push manager...");
        let subscription;
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
          console.log("Successfully subscribed to push manager:", {
            endpoint: subscription.endpoint?.substring(0, 50) + "...",
            hasKeys: !!subscription.getKey("p256dh") && !!subscription.getKey("auth"),
          });
        } catch (err) {
          console.error("Failed to subscribe to push manager:", err);
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          throw new Error(`Failed to subscribe to push notifications: ${errorMsg}`);
        }

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
