"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { Button } from "@/components/ui/button";

interface DebugInfo {
  vapid?: {
    publicKeyConfigured: boolean;
    privateKeyConfigured: boolean;
  };
  subscriptions?: {
    count: number;
  };
  serviceWorker?: {
    state?: string;
    isActive?: boolean;
    isWaiting?: boolean;
    isInstalling?: boolean;
    scope?: string;
    error?: string;
  };
}

export function PushNotificationDebug() {
  const { isSupported, permission, isSubscribed, subscription } =
    usePushNotifications();
  const { player } = usePlayer();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch("/api/push/debug");
      const data = await response.json();

      // Also check service worker state
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          data.serviceWorker = {
            state: registration.active?.state || "unknown",
            isActive: !!registration.active,
            isWaiting: !!registration.waiting,
            isInstalling: !!registration.installing,
            scope: registration.scope,
          };
        } else {
          data.serviceWorker = { error: "No service worker registered" };
        }
      }

      setDebugInfo(data);
    } catch (error) {
      console.error("Error fetching debug info:", error);
    }
  };

  const sendTestNotification = async () => {
    try {
      setTestResult("Sending...");

      // Check service worker registration
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        console.log("Service worker registration:", registration);
        console.log("Service worker state:", registration.active?.state);
      }

      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Test notification from debug panel" }),
      });
      const data = await response.json();
      setTestResult(
        data.success
          ? `✅ ${data.message}\n\nCheck the Service Worker console (DevTools > Application > Service Workers) to see if the push event was received.`
          : `❌ Error: ${data.error || "Unknown error"}`
      );

      // Wait a moment and check if notification was shown
      setTimeout(() => {
        console.log(
          "After sending notification, check browser notifications and service worker console"
        );
      }, 2000);
    } catch (error) {
      setTestResult(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  // Show debug panel ONLY if debug query param is present
  const [showDebug, setShowDebug] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.has("debug");
  });

  if (!showDebug) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-background border border-border rounded-lg shadow-lg p-4 z-50 max-w-md mx-auto">
      <h3 className="font-semibold text-sm mb-2">Push Notification Debug</h3>

      <div className="space-y-2 text-xs">
        <div>
          <strong>Supported:</strong> {isSupported ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Permission:</strong> {permission}
        </div>
        <div>
          <strong>Subscribed:</strong> {isSubscribed ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Player ID:</strong> {player?.id || "Not logged in"}
        </div>
        {subscription && (
          <div>
            <strong>Endpoint:</strong>{" "}
            <span className="text-xs break-all">
              {subscription.endpoint?.substring(0, 50)}...
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={fetchDebugInfo} className="text-xs h-8">
          Check Server
        </Button>
        <Button
          size="sm"
          onClick={sendTestNotification}
          className="text-xs h-8"
          disabled={!isSubscribed}
        >
          Test Notification
        </Button>
      </div>

      {debugInfo && (
        <div className="mt-4 text-xs space-y-1">
          <div>
            <strong>VAPID Public Key:</strong>{" "}
            {debugInfo.vapid?.publicKeyConfigured ? "✅" : "❌"}
          </div>
          <div>
            <strong>VAPID Private Key:</strong>{" "}
            {debugInfo.vapid?.privateKeyConfigured ? "✅" : "❌"}
          </div>
          <div>
            <strong>Subscriptions in DB:</strong>{" "}
            {debugInfo.subscriptions?.count || 0}
          </div>
          {debugInfo.serviceWorker && (
            <>
              <div className="mt-2 pt-2 border-t">
                <strong>Service Worker:</strong>
              </div>
              {debugInfo.serviceWorker.error ? (
                <div className="text-red-500">
                  ❌ {debugInfo.serviceWorker.error}
                </div>
              ) : (
                <>
                  <div>
                    <strong>State:</strong> {debugInfo.serviceWorker.state}
                  </div>
                  <div>
                    <strong>Active:</strong>{" "}
                    {debugInfo.serviceWorker.isActive ? "✅" : "❌"}
                  </div>
                  {debugInfo.serviceWorker.isWaiting && (
                    <div className="text-yellow-600">⚠️ Update waiting</div>
                  )}
                  {debugInfo.serviceWorker.isInstalling && (
                    <div>Installing...</div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {testResult && <div className="mt-2 text-xs">{testResult}</div>}
    </div>
  );
}
