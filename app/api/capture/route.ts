import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createSupabaseServiceRoleClient();

  const formData = await req.formData();
  const pubId = formData.get("pubId") as string;
  const file = formData.get("file") as File;

  if (!pubId || !file) {
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
    .select("*")
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

  // Upload media
  const path = `captures/${pubId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("evidence")
    .upload(path, file);

  if (uploadError) {
    return new NextResponse(uploadError.message, { status: 500 });
  }

  const mediaUrl = supabase.storage.from("evidence").getPublicUrl(path)
    .data.publicUrl;

  const nextDrinkCount = pub.drink_count + 1;

  // Insert capture
  const { error: captureError } = await supabase.from("captures").insert({
    pub_id: pubId,
    team_id: player.team_id,
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

  return NextResponse.json({ success: true });
}
