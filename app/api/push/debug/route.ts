import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServiceRoleClient();

    // Check VAPID keys
    const hasPublicKey = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const hasPrivateKey = !!process.env.VAPID_PRIVATE_KEY;

    // Get subscription count
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("player_id, endpoint, created_at");

    return NextResponse.json({
      vapid: {
        publicKeyConfigured: hasPublicKey,
        privateKeyConfigured: hasPrivateKey,
        publicKey: hasPublicKey
          ? `${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 20)}...`
          : null,
      },
      subscriptions: {
        count: subscriptions?.length || 0,
        data: subscriptions || [],
        error: error?.message || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get debug info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
