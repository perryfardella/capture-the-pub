import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendPushNotificationToOthers } from "@/lib/utils/push-notifications";
import { waitUntil } from "@vercel/functions";

export async function POST(req: Request) {
  const supabase = createSupabaseServiceRoleClient();

  const formData = await req.formData();
  const pubId = formData.get("pubId") as string;
  const mediaUrl = formData.get("mediaUrl") as string;

  if (!pubId || !mediaUrl) {
    return new NextResponse("Invalid submission", { status: 400 });
  }

  // Ensure game is active
  const { data: game } = await supabase
    .from("game_state")
    .select("is_active")
    .single();

  if (!game?.is_active) {
    return new NextResponse("Game inactive", { status: 403 });
  }

  // Get player_id from request
  const playerId = formData.get("playerId") as string;

  if (!playerId) {
    return new NextResponse("No player session", { status: 401 });
  }

  // Fetch player
  const { data: player } = await supabase
    .from("players")
    .select("*, teams(*)")
    .eq("id", playerId)
    .single();

  if (!player) {
    return new NextResponse("Player not found", { status: 404 });
  }

  // Fetch pub with current state
  const { data: pub } = await supabase
    .from("pubs")
    .select("*")
    .eq("id", pubId)
    .single();

  if (!pub || pub.is_locked) {
    return new NextResponse("Pub is locked", { status: 403 });
  }

  // Media is already uploaded directly from client, use the provided URL
  const nextDrinkCount = pub.drink_count + 1;

  // Use optimistic locking: Update pub first with a WHERE clause that checks current drink_count
  // This prevents race conditions where two teams capture simultaneously
  const { data: updatedPub, error: pubUpdateError } = await supabase
    .from("pubs")
    .update({
      controlling_team_id: player.team_id,
      drink_count: nextDrinkCount,
    })
    .eq("id", pubId)
    .eq("drink_count", pub.drink_count) // Optimistic locking: only update if drink_count hasn't changed
    .eq("is_locked", false) // Also ensure still unlocked
    .select()
    .single();

  if (pubUpdateError || !updatedPub) {
    // If update failed, another team captured first or pub was locked
    console.error("Pub capture race condition detected or pub locked:", pubUpdateError);
    return new NextResponse(
      "This pub was just captured by another team or locked. Please try again!",
      { status: 409 } // 409 Conflict
    );
  }

  // Pub updated successfully, now insert capture record
  const { error: captureError } = await supabase.from("captures").insert({
    pub_id: pubId,
    team_id: player.team_id,
    player_id: playerId,
    drink_count: nextDrinkCount,
    media_url: mediaUrl,
  });

  if (captureError) {
    console.error("Failed to insert capture after pub update:", captureError);
    // Pub is already updated, but capture record failed - this is bad but rare
    // Log it but don't rollback (would require transactions)
    // The pub state is the source of truth, capture is just history
    return new NextResponse("Pub captured but failed to log capture", { status: 500 });
  }

  // Send push notification to all other players
  // Use waitUntil to ensure the notification is sent before the function terminates
  const teamName = (player.teams as { name: string } | null)?.name || "A team";
  waitUntil(
    sendPushNotificationToOthers(playerId, {
      title: "Pub Captured! 🍺",
      body: `${teamName} captured ${pub.name}`,
      tag: `capture-${pubId}`,
      data: {
        url: "/?tab=activity",
        type: "capture",
        pubId,
      },
    }).catch((error) => {
      console.error("Error sending push notification:", error);
    })
  );

  return NextResponse.json({ success: true });
}
