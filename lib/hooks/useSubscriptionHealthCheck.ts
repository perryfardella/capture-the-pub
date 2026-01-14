"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePushNotifications } from "./usePushNotifications";
import { usePlayer } from "./usePlayer";

/**
 * Monitors push notification subscription health and automatically re-subscribes if needed
 *
 * PWA push subscriptions can expire for various reasons:
 * - Browser updates
 * - FCM token rotation
 * - User clearing browser data
 * - Long periods of inactivity
 *
 * This hook checks subscription validity periodically and attempts to re-subscribe if expired.
 */
export function useSubscriptionHealthCheck() {
  const { isSupported, isSubscribed, subscription, subscribe, permission } = usePushNotifications();
  const { player } = usePlayer();
  const lastCheckRef = useRef<number>(0);
  const isCheckingRef = useRef(false);

  const checkSubscriptionHealth = useCallback(async () => {
    // Skip if not supported or already checking
    if (!isSupported || isCheckingRef.current) {
      return;
    }

    // Skip if no player (not logged in)
    if (!player?.id) {
      return;
    }

    // Throttle checks - only check once every 5 minutes
    const now = Date.now();
    if (now - lastCheckRef.current < 5 * 60 * 1000) {
      return;
    }

    isCheckingRef.current = true;
    lastCheckRef.current = now;

    try {
      console.log("[SubscriptionHealthCheck] Running health check...");

      // Check if we have a subscription in browser
      if (!("serviceWorker" in navigator)) {
        isCheckingRef.current = false;
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const currentSubscription = await registration.pushManager.getSubscription();

      // Case 1: We think we're subscribed but browser says no - clean up
      if (isSubscribed && !currentSubscription) {
        console.warn("[SubscriptionHealthCheck] ⚠️ Subscription mismatch - browser has no subscription but app thinks it does");

        // Clear the dismissed flag to allow notification prompt to show again
        localStorage.removeItem("notification-prompt-dismissed");

        // The usePushNotifications hook will update its state on next check
        isCheckingRef.current = false;
        return;
      }

      // Case 2: Browser has subscription, verify it matches what we expect
      if (currentSubscription && subscription) {
        const currentEndpoint = currentSubscription.endpoint;
        const storedEndpoint = subscription.endpoint;

        if (currentEndpoint !== storedEndpoint) {
          console.warn("[SubscriptionHealthCheck] ⚠️ Subscription endpoint mismatch");

          // Unsubscribe the old one and clear dismissed flag
          await currentSubscription.unsubscribe();
          localStorage.removeItem("notification-prompt-dismissed");

          isCheckingRef.current = false;
          return;
        }
      }

      // Case 3: Permission was revoked - clear everything
      if (permission === "denied" && isSubscribed) {
        console.warn("[SubscriptionHealthCheck] ⚠️ Permission revoked but still marked as subscribed");

        if (currentSubscription) {
          await currentSubscription.unsubscribe();
        }

        isCheckingRef.current = false;
        return;
      }

      // Case 4: Permission granted but not subscribed - auto re-subscribe if previously dismissed
      if (
        permission === "granted" &&
        !isSubscribed &&
        !currentSubscription &&
        localStorage.getItem("notification-prompt-dismissed") === "true"
      ) {
        console.log("[SubscriptionHealthCheck] 🔄 Attempting automatic re-subscription...");

        try {
          const success = await subscribe(player.id);
          if (success) {
            console.log("[SubscriptionHealthCheck] ✅ Automatic re-subscription successful");
          } else {
            console.warn("[SubscriptionHealthCheck] ❌ Automatic re-subscription failed");
            // Clear dismissed flag to show prompt again
            localStorage.removeItem("notification-prompt-dismissed");
          }
        } catch (error) {
          console.error("[SubscriptionHealthCheck] Error during auto re-subscription:", error);
          localStorage.removeItem("notification-prompt-dismissed");
        }
      }

      console.log("[SubscriptionHealthCheck] ✅ Health check complete");
    } catch (error) {
      console.error("[SubscriptionHealthCheck] Error during health check:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [isSupported, isSubscribed, subscription, permission, player, subscribe]);

  // Run health check on mount and when app comes back into focus
  useEffect(() => {
    if (!isSupported) return;

    // Initial check after 10 seconds (give time for app to load)
    const initialTimeout = setTimeout(checkSubscriptionHealth, 10000);

    // Check when app comes back into focus
    const handleFocus = () => {
      console.log("[SubscriptionHealthCheck] App focused, scheduling health check");
      // Wait 2 seconds after focus to avoid interrupting user
      setTimeout(checkSubscriptionHealth, 2000);
    };

    // Check when app becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[SubscriptionHealthCheck] App visible, scheduling health check");
        setTimeout(checkSubscriptionHealth, 2000);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialTimeout);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupported, checkSubscriptionHealth]);

  // Periodic health check every 30 minutes while app is active
  useEffect(() => {
    if (!isSupported) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkSubscriptionHealth();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [isSupported, checkSubscriptionHealth]);
}
