import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Missing subscription endpoint" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Remove subscription from database
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint);

    if (error) {
      console.error("Error removing push subscription:", error);
      return NextResponse.json(
        { error: "Failed to remove subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in push unsubscribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

