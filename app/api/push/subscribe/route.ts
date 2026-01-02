import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, playerId } = body;

    console.log("Received subscription request:", {
      playerId,
      hasSubscription: !!subscription,
      endpoint: subscription?.endpoint?.substring(0, 50) + "...",
      hasKeys: !!subscription?.keys,
    });

    if (!subscription || !playerId) {
      console.error("Missing subscription or playerId:", { subscription: !!subscription, playerId });
      return NextResponse.json(
        { error: "Missing subscription or playerId" },
        { status: 400 }
      );
    }

    if (!subscription.endpoint) {
      console.error("Subscription missing endpoint:", subscription);
      return NextResponse.json(
        { error: "Subscription missing endpoint" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Store subscription in database
    const subscriptionData = {
      player_id: playerId,
      subscription: subscription,
      endpoint: subscription.endpoint,
      created_at: new Date().toISOString(),
    };

    console.log("Saving subscription to database:", {
      player_id: subscriptionData.player_id,
      endpoint: subscriptionData.endpoint.substring(0, 50) + "...",
    });

    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(subscriptionData, {
        onConflict: "player_id",
      })
      .select();

    if (error) {
      console.error("Error saving push subscription:", error);
      return NextResponse.json(
        { error: `Failed to save subscription: ${error.message}`, details: error },
        { status: 500 }
      );
    }

    console.log("Subscription saved successfully:", data);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in push subscribe:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

