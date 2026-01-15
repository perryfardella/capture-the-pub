import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * Admin endpoint to clean up invalid/expired push subscriptions
 *
 * This can be called manually or set up as a cron job to periodically
 * validate all subscriptions and remove ones that are no longer valid.
 *
 * Usage: POST /api/push/cleanup
 */
export async function POST() {
  try {
    const supabase = createSupabaseServiceRoleClient();

    console.log("[Push Cleanup] Starting subscription cleanup...");

    // Get all subscriptions from database
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("player_id, endpoint, subscription, created_at");

    if (error) {
      console.error("[Push Cleanup] Error fetching subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions", details: error.message },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[Push Cleanup] No subscriptions found");
      return NextResponse.json({
        success: true,
        message: "No subscriptions to clean up",
        stats: { total: 0, invalid: 0, valid: 0 },
      });
    }

    console.log(`[Push Cleanup] Found ${subscriptions.length} subscriptions to validate`);

    const stats = {
      total: subscriptions.length,
      invalid: 0,
      valid: 0,
      errors: 0,
    };

    const invalidEndpoints: string[] = [];

    // Validate each subscription by attempting to send a test notification
    // Note: We won't actually send it, just validate the subscription format
    for (const sub of subscriptions) {
      try {
        const subscription = sub.subscription as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
        };

        // Basic validation
        if (!subscription || !subscription.endpoint || !subscription.keys) {
          console.log(
            `[Push Cleanup] Invalid subscription format for player ${sub.player_id}`
          );
          invalidEndpoints.push(sub.endpoint);
          stats.invalid++;
          continue;
        }

        if (!subscription.keys.p256dh || !subscription.keys.auth) {
          console.log(
            `[Push Cleanup] Missing keys for player ${sub.player_id}`
          );
          invalidEndpoints.push(sub.endpoint);
          stats.invalid++;
          continue;
        }

        // Check if subscription is very old (over 90 days)
        const createdAt = new Date(sub.created_at);
        const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > 90) {
          console.log(
            `[Push Cleanup] Subscription for player ${sub.player_id} is ${Math.round(ageInDays)} days old - marking for review`
          );
          // Don't delete automatically, but log it
        }

        stats.valid++;
      } catch (err) {
        console.error(
          `[Push Cleanup] Error validating subscription for player ${sub.player_id}:`,
          err
        );
        stats.errors++;
      }
    }

    // Remove invalid subscriptions
    if (invalidEndpoints.length > 0) {
      console.log(`[Push Cleanup] Removing ${invalidEndpoints.length} invalid subscriptions`);

      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", invalidEndpoints);

      if (deleteError) {
        console.error("[Push Cleanup] Error deleting invalid subscriptions:", deleteError);
        return NextResponse.json(
          {
            error: "Failed to delete invalid subscriptions",
            details: deleteError.message,
            stats,
          },
          { status: 500 }
        );
      }

      console.log(`[Push Cleanup] ✅ Successfully removed ${invalidEndpoints.length} invalid subscriptions`);
    }

    console.log("[Push Cleanup] Cleanup complete", stats);

    return NextResponse.json({
      success: true,
      message: "Subscription cleanup completed",
      stats,
      invalidRemoved: invalidEndpoints.length,
    });
  } catch (error) {
    console.error("[Push Cleanup] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error during cleanup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
