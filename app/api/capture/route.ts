import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendPushNotificationToOthers } from "@/lib/utils/push-notifications";

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

  // Fetch player & pub inside transaction-ish flow
  const { data: player } = await supabase
    .from("players")
    .select("*, teams(*)")
    .eq("id", playerId)
    .single();

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

  // Insert capture
  const { error: captureError } = await supabase.from("captures").insert({
    pub_id: pubId,
    team_id: player.team_id,
    player_id: playerId,
    drink_count: nextDrinkCount,
    media_url: mediaUrl,
  });

  if (captureError) {
    return new NextResponse(captureError.message, { status: 500 });
  }

  // Update pub ownership
  const { error: pubUpdateError } = await supabase
    .from("pubs")
    .update({
      controlling_team_id: player.team_id,
      drink_count: nextDrinkCount,
    })
    .eq("id", pubId);

  if (pubUpdateError) {
    return new NextResponse(pubUpdateError.message, { status: 500 });
  }

  // Send push notification to all other players
  // Don't await - send in background
  const teamName = (player.teams as { name: string } | null)?.name || "A team";
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
  });

  return NextResponse.json({ success: true });
}
