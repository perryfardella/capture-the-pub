import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendPushNotificationToOthers } from "@/lib/utils/push-notifications";
import { waitUntil } from "@vercel/functions";

export async function POST(req: Request) {
  const supabase = createSupabaseServiceRoleClient();
  const formData = await req.formData();
  const challengeId = formData.get("challengeId") as string;
  const step = formData.get("step") as "start" | "result";
  const pubId = formData.get("pubId") as string | null;
  const mediaUrl = formData.get("mediaUrl") as string | null;
  const successParam = formData.get("success") as string | null;
  const success = successParam === null ? null : successParam === "true";

  if (!challengeId || !step)
    return new NextResponse("Invalid submission", { status: 400 });

  // Get player_id from request (sent from client localStorage)
  const playerId = formData.get("playerId") as string;
  if (!playerId) {
    return new NextResponse("No player session", { status: 401 });
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();
  if (!challenge)
    return new NextResponse("Challenge not found", { status: 404 });

  const { data: player } = await supabase
    .from("players")
    .select("*, teams(*)")
    .eq("id", playerId)
    .single();
  if (!player) return new NextResponse("Player not found", { status: 404 });

  // Media is already uploaded directly from client, use the provided URL

  // Pub-specific challenges: enforce drink for start
  if (challenge.type === "pub" && step === "start") {
    if (!mediaUrl)
      return new NextResponse("Photo/video required to start pub challenge", {
        status: 400,
      });
  }

  // Insert challenge attempt (only for pub challenges, or for global challenge start steps)
  // For global challenge results, we only insert bonus_point (below) to avoid duplicate feed items
  if (challenge.type === "pub" || (challenge.type === "global" && step === "start")) {
    await supabase.from("challenge_attempts").insert({
      challenge_id: challengeId,
      team_id: player.team_id,
      player_id: playerId,
      step,
      success: step === "result" ? success : null,
      media_url: mediaUrl ?? "",
    });
  }

  // Handle pub-specific challenge result → lock pub only on success
  if (challenge.type === "pub" && step === "result" && success === true) {
    const { error: lockError } = await supabase
      .from("pubs")
      .update({
        is_locked: true,
        locked_by_team_id: player.team_id,
        controlling_team_id: player.team_id,
      })
      .eq("id", pubId);

    if (lockError) return new NextResponse(lockError.message, { status: 500 });

    // Send push notification for pub lock
    const { data: pub } = await supabase
      .from("pubs")
      .select("name")
      .eq("id", pubId)
      .single();

    const teamName = (player.teams as { name: string } | null)?.name || "A team";
    waitUntil(
      sendPushNotificationToOthers(playerId, {
        title: "Pub Locked! 🔒",
        body: `${teamName} locked ${pub?.name || "a pub"} by completing the challenge!`,
        tag: `challenge-lock-${pubId}`,
        data: {
          url: "/?tab=activity",
          type: "challenge",
          pubId,
        },
      }).catch((error) => {
        console.error("Error sending push notification:", error);
      })
    );
  }

  // Handle global challenge → bonus point (with media_url)
  // Allow multiple teams to complete the same global challenge
  if (challenge.type === "global" && step === "result") {
    // Check if this team has already completed this challenge
    const { data: existingBonusPoint } = await supabase
      .from("bonus_points")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("team_id", player.team_id)
      .single();

    if (existingBonusPoint) {
      return new NextResponse(
        "Your team has already completed this challenge",
        { status: 400 }
      );
    }

    // Insert bonus point for this team
    const { error: insertError } = await supabase.from("bonus_points").insert({
      team_id: player.team_id,
      player_id: playerId,
      challenge_id: challengeId,
      media_url: mediaUrl ?? "",
    });

    if (insertError) {
      return new NextResponse(insertError.message, { status: 500 });
    }

    // Send push notification for global challenge completion
    const teamName = (player.teams as { name: string } | null)?.name || "A team";
    waitUntil(
      sendPushNotificationToOthers(playerId, {
        title: "Challenge Completed! ⭐",
        body: `${teamName} completed a global challenge and earned a bonus point!`,
        tag: `challenge-global-${challengeId}`,
        data: {
          url: "/?tab=scoreboard",
          type: "bonus",
          challengeId,
        },
      }).catch((error) => {
        console.error("Error sending push notification:", error);
      })
    );
  }

  return NextResponse.json({ success: true });
}
