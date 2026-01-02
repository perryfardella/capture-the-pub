"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { Button } from "@/components/ui/button";

export function PushNotificationDebug() {
  const { isSupported, permission, isSubscribed, subscription } =
    usePushNotifications();
  const { player } = usePlayer();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    // Only show in development or if query param is set
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (process.env.NODE_ENV === "production" && !params.has("debug")) {
      return;
    }
  }, []);

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch("/api/push/debug");
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error("Error fetching debug info:", error);
    }
  };

  const sendTestNotification = async () => {
    try {
      setTestResult("Sending...");
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Test notification from debug panel" }),
      });
      const data = await response.json();
      setTestResult(
        data.success
          ? `✅ ${data.message}`
          : `❌ Error: ${data.error || "Unknown error"}`
      );
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Only show if debug query param is present
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("debug")) {
      return null;
    }
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
            <strong>Subscriptions in DB:</strong> {debugInfo.subscriptions?.count || 0}
          </div>
        </div>
      )}

      {testResult && (
        <div className="mt-2 text-xs">{testResult}</div>
      )}
    </div>
  );
}

