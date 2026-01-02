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

    let successCount = 0;
    const promises = subscriptions.map(async (sub) => {
      const success = await sendPushNotification(sub.subscription, payload);
      if (success) successCount++;
    });

    await Promise.allSettled(promises);

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

    if (error || !subscriptions || subscriptions.length === 0) {
      return 0;
    }

    let successCount = 0;
    const promises = subscriptions.map(async (sub) => {
      const success = await sendPushNotification(sub.subscription, payload);
      if (success) successCount++;
    });

    await Promise.allSettled(promises);

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
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (error) {
    // Handle expired/invalid subscriptions
    if (
      error instanceof Error &&
      (error.message.includes("410") || error.message.includes("expired"))
    ) {
      console.log("Subscription expired, removing from database");
      // Optionally remove expired subscription from database
      const supabase = createSupabaseServiceRoleClient();
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", (subscription as { endpoint: string }).endpoint);
    } else {
      console.error("Error sending push notification:", error);
    }
    return false;
  }
}

