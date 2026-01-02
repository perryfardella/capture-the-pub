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
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setState((prev) => ({
            ...prev,
            subscription,
            isSubscribed: !!subscription,
          }));
        });
      });
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

        if (!registration) {
          // Try to register the service worker (next-pwa generates this)
          // Try both possible paths
          try {
            registration = await navigator.serviceWorker.register("/sw.js");
          } catch {
            // If sw.js doesn't exist, try the workbox-generated one
            registration = await navigator.serviceWorker
              .register("/sw.js", {
                scope: "/",
              })
              .catch(() => {
                throw new Error(
                  "Service worker not available. Make sure you're running a production build (pnpm build && pnpm start). Push notifications don't work in development mode."
                );
              });
          }
        }

        // Wait for registration to be ready
        await navigator.serviceWorker.ready;

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
