import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const formData = await req.formData();
  const challengeId = formData.get("challengeId") as string;
  const step = formData.get("step") as "start" | "result";
  const pubId = formData.get("pubId") as string | null;
  const file = formData.get("file") as File | null;

  if (!challengeId || !step)
    return new NextResponse("Invalid submission", { status: 400 });

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();
  if (!challenge)
    return new NextResponse("Challenge not found", { status: 404 });

  // Restore player
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const playerId = (user?.user_metadata as { player_id: string })?.player_id;
  if (!playerId) return new NextResponse("No player session", { status: 401 });

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();
  if (!player) return new NextResponse("Player not found", { status: 404 });

  // Optional media upload
  let mediaUrl: string | null = null;
  if (file) {
    const path = `challenges/${challengeId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, file);
    if (uploadError)
      return new NextResponse(uploadError.message, { status: 500 });
    mediaUrl = supabase.storage.from("evidence").getPublicUrl(path)
      .data.publicUrl;
  }

  // Pub-specific challenges: enforce drink for start
  if (challenge.type === "pub" && step === "start") {
    if (!mediaUrl)
      return new NextResponse("Photo/video required to start pub challenge", {
        status: 400,
      });
  }

  // Insert challenge attempt
  await supabase.from("challenge_attempts").insert({
    challenge_id: challengeId,
    team_id: player.team_id,
    step,
    success: step === "result" ? true : null, // client can later toggle
    media_url: mediaUrl ?? "",
  });

  // Handle pub-specific challenge result → lock pub
  if (challenge.type === "pub" && step === "result") {
    const { error: lockError } = await supabase
      .from("pubs")
      .update({
        is_locked: true,
        locked_by_team_id: player.team_id,
        controlling_team_id: player.team_id,
      })
      .eq("id", pubId);

    if (lockError) return new NextResponse(lockError.message, { status: 500 });
  }

  // Handle global challenge → bonus point
  if (
    challenge.type === "global" &&
    step === "result" &&
    !challenge.is_consumed
  ) {
    await supabase.from("bonus_points").insert({
      team_id: player.team_id,
      challenge_id: challengeId,
    });
    await supabase
      .from("challenges")
      .update({ is_consumed: true, completed_by_team_id: player.team_id })
      .eq("id", challengeId);
  }

  return NextResponse.json({ success: true });
}
