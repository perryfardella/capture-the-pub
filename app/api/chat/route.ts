import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createSupabaseServiceRoleClient();

  const formData = await req.formData();
  const playerId = formData.get("playerId") as string;
  const content = formData.get("content") as string | null;
  const mediaUrl = formData.get("mediaUrl") as string | null;

  if (!playerId) {
    return new NextResponse("No player session", { status: 401 });
  }

  if (!content?.trim() && !mediaUrl) {
    return new NextResponse("Message must have content or media", {
      status: 400,
    });
  }

  // Fetch player with team info
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, team_id, nickname, teams(id, name, color)")
    .eq("id", playerId)
    .single();

  if (playerError || !player) {
    return new NextResponse("Player not found", { status: 404 });
  }

  if (!player.team_id) {
    return new NextResponse("Player must be on a team to chat", { status: 403 });
  }

  // Insert message
  const { data: message, error: insertError } = await supabase
    .from("chat_messages")
    .insert({
      player_id: playerId,
      team_id: player.team_id,
      content: content?.trim() || null,
      media_url: mediaUrl || null,
    })
    .select("*, players(id, nickname), teams(id, name, color)")
    .single();

  if (insertError) {
    console.error("Failed to insert chat message:", insertError);
    return new NextResponse("Failed to send message", { status: 500 });
  }

  return NextResponse.json({ message });
}
