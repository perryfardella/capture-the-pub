"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function NotificationPrompt() {
  const { isSupported, permission, isSubscribed, subscribe } =
    usePushNotifications();
  const { player } = usePlayer();
  const [dismissed, setDismissed] = useState(false);

  // Check if user has previously dismissed the prompt
  useEffect(() => {
    const dismissed = localStorage.getItem("notification-prompt-dismissed");
    if (dismissed === "true") {
      setDismissed(true);
    }
  }, []);

  // Debug logging
  useEffect(() => {
    console.log("NotificationPrompt state:", {
      isSupported,
      isSubscribed,
      permission,
      dismissed,
      hasPlayer: !!player?.id,
      willShow: !(!isSupported || isSubscribed || permission === "denied" || dismissed),
    });
  }, [isSupported, isSubscribed, permission, dismissed, player]);

  // Debug logging
  useEffect(() => {
    console.log("NotificationPrompt state:", {
      isSupported,
      isSubscribed,
      permission,
      dismissed,
      hasPlayer: !!player?.id,
    });
  }, [isSupported, isSubscribed, permission, dismissed, player]);

  // Don't show if:
  // - Not supported
  // - Already subscribed
  // - Permission denied
  // - User dismissed it
  if (
    !isSupported ||
    isSubscribed ||
    permission === "denied" ||
    dismissed
  ) {
    return null;
  }

  const handleSubscribe = async () => {
    if (!player?.id) {
      console.warn("No player ID available");
      alert("Please join the game first to enable notifications");
      return;
    }

    // Check if service worker is available
    if (!("serviceWorker" in navigator)) {
      alert("Service workers are not supported in this browser");
      return;
    }

    try {
      console.log("Starting subscription process...");
      const success = await subscribe(player.id);
      console.log("Subscription result:", success);
      if (success) {
        setDismissed(true);
        localStorage.setItem("notification-prompt-dismissed", "true");
        console.log("Successfully subscribed to notifications");
      } else {
        console.error("Failed to subscribe to notifications - subscribe returned false");
        alert("Failed to enable notifications. Please check the console for details.");
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      console.error("Full error details:", { errorMessage, errorStack, error });
      alert(`Error enabling notifications: ${errorMessage}\n\nCheck the browser console for more details.`);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notification-prompt-dismissed", "true");
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Enable Notifications</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Get notified when pubs are captured, challenges are completed, or
            the game state changes.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubscribe}
              className="text-xs h-8"
            >
              Enable
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs h-8"
            >
              Maybe Later
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

