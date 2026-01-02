import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { subscription, playerId } = await req.json();

    if (!subscription || !playerId) {
      return NextResponse.json(
        { error: "Missing subscription or playerId" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Store subscription in database
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        player_id: playerId,
        subscription: subscription,
        endpoint: subscription.endpoint,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "player_id",
      }
    );

    if (error) {
      console.error("Error saving push subscription:", error);
      return NextResponse.json(
        { error: `Failed to save subscription: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in push subscribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

