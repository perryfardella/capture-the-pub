import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { playerId, teamId } = await req.json();

    if (!playerId || !teamId) {
      return new NextResponse("Player ID and Team ID are required", { status: 400 });
    }

    const { error } = await supabase
      .from("players")
      .update({ team_id: teamId })
      .eq("id", playerId);

    if (error) {
      console.error("Error updating player team:", error);
      return new NextResponse(`Database error: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in player API route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { playerId } = await req.json();

    if (!playerId) {
      return new NextResponse("Player ID is required", { status: 400 });
    }

    // Delete player's push subscriptions first (not a foreign key, so we handle it manually)
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("player_id", playerId);

    // Delete the player
    // Note: Foreign keys on captures, challenge_attempts, and bonus_points
    // are set to ON DELETE SET NULL, so historical records are preserved
    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (error) {
      console.error("Error deleting player:", error);
      return new NextResponse(`Database error: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in player DELETE API route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}