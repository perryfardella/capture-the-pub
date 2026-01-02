import webpush from "web-push";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

// Initialize web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@capturethepub.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

/**
 * Send push notification to a specific player
 */
export async function sendPushNotificationToPlayer(
  playerId: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const supabase = createSupabaseServiceRoleClient();

    // Get player's push subscription
    const { data: subscription, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("player_id", playerId)
      .single();

    if (error || !subscription) {
      console.log(`No push subscription found for player ${playerId}`);
      return false;
    }

    return await sendPushNotification(subscription.subscription, payload);
  } catch (error) {
    console.error("Error sending push notification to player:", error);
    return false;
  }
}

/**
 * Send push notification to all players
 */
export async function sendPushNotificationToAll(
  payload: NotificationPayload
): Promise<number> {
  try {
    const supabase = createSupabaseServiceRoleClient();

    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("subscription");

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found");
      return 0;
    }

    console.log(`Retrieved ${subscriptions.length} subscriptions from database`);
    
    let successCount = 0;
    const promises = subscriptions.map(async (sub, index) => {
      console.log(`Processing subscription ${index + 1}/${subscriptions.length}:`, {
        hasSubscription: !!sub.subscription,
        subscriptionType: typeof sub.subscription,
        subscriptionKeys: sub.subscription ? Object.keys(sub.subscription) : null,
      });
      
      // Ensure subscription has the correct format
      const subscription = sub.subscription;
      if (!subscription || typeof subscription !== 'object') {
        console.error(`Invalid subscription format at index ${index}:`, subscription);
        return;
      }
      
      const success = await sendPushNotification(subscription, payload);
      if (success) successCount++;
      return success;
    });

    await Promise.allSettled(promises);

    console.log(`Successfully sent ${successCount} of ${subscriptions.length} notifications`);
    return successCount;
  } catch (error) {
    console.error("Error sending push notifications to all:", error);
    return 0;
  }
}

/**
 * Send push notification to all players except a specific player
 */
export async function sendPushNotificationToOthers(
  excludePlayerId: string,
  payload: NotificationPayload
): Promise<number> {
  try {
    const supabase = createSupabaseServiceRoleClient();

    // Get all push subscriptions except the excluded player
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .neq("player_id", excludePlayerId);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return 0;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No subscriptions found (excluding player ${excludePlayerId})`);
      return 0;
    }

    console.log(`Sending push notifications to ${subscriptions.length} subscribers`);

    let successCount = 0;
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const success = await sendPushNotification(sub.subscription, payload);
        if (success) successCount++;
        return success;
      })
    );

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Failed to send to subscription ${index}:`, result.reason);
      }
    });

    console.log(`Successfully sent ${successCount} of ${subscriptions.length} notifications`);
    return successCount;
  } catch (error) {
    console.error("Error sending push notifications to others:", error);
    return 0;
  }
}

/**
 * Send push notification to a specific subscription
 */
async function sendPushNotification(
  subscription: unknown,
  payload: NotificationPayload
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured, skipping push notification");
    return false;
  }

  try {
    // Ensure subscription is in the correct format for web-push
    // The subscription from DB should have: { endpoint, keys: { p256dh, auth } }
    const sub = subscription as {
      endpoint?: string;
      keys?: {
        p256dh?: string;
        auth?: string;
      };
    };

    if (!sub.endpoint) {
      console.error("Subscription missing endpoint:", subscription);
      return false;
    }

    if (!sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      console.error("Subscription missing keys:", {
        hasKeys: !!sub.keys,
        hasP256dh: !!sub.keys?.p256dh,
        hasAuth: !!sub.keys?.auth,
      });
      return false;
    }

    // Convert to web-push format
    const webPushSubscription: webpush.PushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    };

    console.log("Sending push notification to:", webPushSubscription.endpoint?.substring(0, 50) + "...");
    console.log("Payload:", payload);

    // web-push expects the payload as a string (JSON stringified)
    const result = await webpush.sendNotification(webPushSubscription, JSON.stringify(payload), {
      TTL: 86400, // 24 hours
    });
    console.log("Push notification sent successfully");
    return true;
  } catch (error) {
    // Handle expired/invalid subscriptions
    if (
      error instanceof Error &&
      (error.message.includes("410") ||
        error.message.includes("expired") ||
        error.message.includes("Gone"))
    ) {
      console.log("Subscription expired, removing from database");
      // Optionally remove expired subscription from database
      const supabase = createSupabaseServiceRoleClient();
      const sub = subscription as { endpoint?: string };
      if (sub.endpoint) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    } else {
      console.error("Error sending push notification:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
    }
    return false;
  }
}

