import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/utils/admin-actions";

// DELETE - Undo/delete a capture
export async function DELETE(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { captureId, pubId } = await req.json();

    if (!captureId || !pubId) {
      return NextResponse.json(
        { error: "Capture ID and Pub ID are required" },
        { status: 400 }
      );
    }

    // Get all captures for this pub with player, team, and pub info
    const { data: pubCaptures } = await supabase
      .from("captures")
      .select("*, players(nickname), teams(name), pubs(name)")
      .eq("pub_id", pubId)
      .order("created_at", { ascending: false });

    if (!pubCaptures || pubCaptures.length === 0) {
      return NextResponse.json(
        { error: "No captures found for this pub" },
        { status: 404 }
      );
    }

    // Find if this capture is the latest one
    const isLatestCapture = pubCaptures[0].id === captureId;

    // Delete the capture
    const { error: deleteError } = await supabase
      .from("captures")
      .delete()
      .eq("id", captureId);

    if (deleteError) {
      console.error("Error deleting capture:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete capture: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // If this was the latest capture, update the pub state
    if (isLatestCapture) {
      if (pubCaptures.length === 1) {
        // This was the only capture, reset the pub
        await supabase
          .from("pubs")
          .update({
            controlling_team_id: null,
            drink_count: 0,
          })
          .eq("id", pubId);
      } else {
        // Set to the previous capture's state
        const previousCapture = pubCaptures[1];
        await supabase
          .from("pubs")
          .update({
            controlling_team_id: previousCapture.team_id,
            drink_count: previousCapture.drink_count,
          })
          .eq("id", pubId);
      }
    }

    // Get capture details for logging
    const capture = pubCaptures.find((c) => c.id === captureId);
    const playerName = (capture as any)?.players?.nickname || "unknown";
    const teamName = (capture as any)?.teams?.name || "unknown team";
    const pubName = (capture as any)?.pubs?.name || "pub";

    // Log admin action with details
    await logAdminAction({
      action_type: "capture_undo",
      description: `Admin undid ${teamName}'s capture at ${pubName} by ${playerName}`,
      team_id: capture?.team_id || null,
      pub_id: pubId,
      metadata: {
        was_latest: isLatestCapture,
        drink_count: capture?.drink_count,
        player_name: playerName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in capture DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
