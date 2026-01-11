"use client";

import { useEffect, useState, useCallback } from "react";

interface PushSubscriptionState {
  subscription: PushSubscription | null;
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushSubscriptionState>({
    subscription: null,
    isSupported: false,
    permission: "default",
    isSubscribed: false,
    isLoading: false,
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
      // Check service worker and subscription
      // Note: Service worker registration is handled by ServiceWorkerRegistration component
      const checkServiceWorker = async () => {
        try {
          // Wait for existing registration (should be registered by ServiceWorkerRegistration component)
          const registration = await navigator.serviceWorker.ready;

          if (!registration) {
            console.warn("[usePushNotifications] No service worker registration found");
            return;
          }

          console.log("[usePushNotifications] Service worker ready, checking subscription");

          const subscription = await registration.pushManager.getSubscription();
          setState((prev) => ({
            ...prev,
            subscription,
            isSubscribed: !!subscription,
          }));

          console.log(
            "[usePushNotifications] Subscription status:",
            !!subscription
          );
        } catch (err) {
          console.warn("[usePushNotifications] Error checking subscription:", err);
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
      return false;
    }

    // Check actual permission status (not just state) to handle cases where
    // permission was granted but state hasn't updated yet
    const currentPermission = Notification.permission;
    
    if (currentPermission === "granted") {
      // Update state to reflect current permission
      setState((prev) => ({ ...prev, permission: currentPermission }));
      return true;
    }

    // Permission must be requested from a user gesture (click handler)
    // This function should only be called from a user gesture handler
    setState((prev) => ({ ...prev, isLoading: true }));
    
    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission, isLoading: false }));
      return permission === "granted";
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  const subscribe = useCallback(
    async (playerId: string): Promise<boolean> => {
      if (!state.isSupported) {
        return false;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      // Check actual permission status (not just state) in case it was updated elsewhere
      const currentPermission = Notification.permission;
      
      if (currentPermission !== "granted") {
        // Update state to reflect current permission
        setState((prev) => ({ ...prev, permission: currentPermission }));
        
        // Only request permission if it's still "default"
        // If it was already requested in the component, it should be "granted" by now
        if (currentPermission === "default") {
          const granted = await requestPermission();
          if (!granted) {
            setState((prev) => ({ ...prev, isLoading: false }));
            return false;
          }
        } else {
          // Permission was denied
          setState((prev) => ({ ...prev, isLoading: false }));
          return false;
        }
      }

      try {
        console.log("[usePushNotifications] Starting subscription process...");

        // Wait for service worker to be ready (should already be registered by ServiceWorkerRegistration component)
        const registration = await navigator.serviceWorker.ready;

        if (!registration) {
          setState((prev) => ({ ...prev, isLoading: false }));
          throw new Error(
            "Service worker not registered. Please refresh the page and try again."
          );
        }

        // Verify service worker is active and controlling the page
        if (!registration.active) {
          setState((prev) => ({ ...prev, isLoading: false }));
          throw new Error(
            "Service worker is not active. Please refresh the page and try again."
          );
        }

        console.log(
          "[usePushNotifications] Service worker ready, state:",
          registration.active.state
        );

        // Get VAPID public key from server
        console.log("[usePushNotifications] Fetching VAPID public key...");
        const response = await fetch("/api/push/vapid-public-key");
        if (!response.ok) {
          const errorText = await response.text();
          setState((prev) => ({ ...prev, isLoading: false }));
          throw new Error(`Failed to get VAPID key: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const { publicKey } = data;

        if (!publicKey) {
          setState((prev) => ({ ...prev, isLoading: false }));
          throw new Error(
            "VAPID public key not available. Make sure NEXT_PUBLIC_VAPID_PUBLIC_KEY is set in your environment variables."
          );
        }

        console.log("[usePushNotifications] VAPID key received, subscribing to push manager...");

        // Convert VAPID key to Uint8Array
        let applicationServerKey;
        try {
          applicationServerKey = urlBase64ToUint8Array(publicKey);
        } catch (err) {
          setState((prev) => ({ ...prev, isLoading: false }));
          throw new Error(`Failed to convert VAPID key: ${err instanceof Error ? err.message : "Unknown error"}`);
        }

        // Subscribe to push notifications
        let subscription;
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
          console.log("[usePushNotifications] Successfully subscribed to push manager");
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          setState((prev) => ({ ...prev, isLoading: false }));
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

        console.log("[usePushNotifications] Saving subscription to server...");

        // Send subscription to server
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
          setState((prev) => ({ ...prev, isLoading: false }));
          throw new Error(
            errorData.error ||
              `Failed to save subscription: ${subscribeResponse.statusText}`
          );
        }

        console.log("[usePushNotifications] ✅ Subscription saved successfully!");

        setState((prev) => ({
          ...prev,
          subscription,
          isSubscribed: true,
          permission: "granted",
          isLoading: false,
        }));

        return true;
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
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
      // Convert subscription to JSON format before sending
      const subscriptionJson = {
        endpoint: state.subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(state.subscription.getKey("p256dh")!),
          auth: arrayBufferToBase64(state.subscription.getKey("auth")!),
        },
      };

      await state.subscription.unsubscribe();

      // Notify server to remove subscription
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscriptionJson,
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
