import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

// POST - Create new challenge
export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const body = await req.json();
    const { type, pub_id, description } = body;

    if (!type || !description) {
      return NextResponse.json(
        { error: "Type and description are required" },
        { status: 400 }
      );
    }

    if (type === "pub" && !pub_id) {
      return NextResponse.json(
        { error: "Pub ID is required for pub challenges" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("challenges")
      .insert({
        type,
        pub_id: type === "pub" ? pub_id : null,
        description: description.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating challenge:", error);
      return NextResponse.json(
        { error: `Failed to create challenge: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in challenge POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update challenge
export async function PATCH(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const body = await req.json();
    const { challengeId, updates } = body;

    if (!challengeId) {
      return NextResponse.json(
        { error: "Challenge ID is required" },
        { status: 400 }
      );
    }

    // Get the challenge to check if it's a pub challenge
    const { data: challenge } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Update the challenge
    const { error: updateError } = await supabase
      .from("challenges")
      .update(updates)
      .eq("id", challengeId);

    if (updateError) {
      console.error("Error updating challenge:", updateError);
      return NextResponse.json(
        { error: `Failed to update challenge: ${updateError.message}` },
        { status: 500 }
      );
    }

    // If marking a pub challenge as complete, lock the pub and transfer ownership
    if (
      challenge.type === "pub" &&
      challenge.pub_id &&
      updates.is_consumed === true &&
      updates.completed_by_team_id
    ) {
      console.log(
        `Locking pub ${challenge.pub_id} for team ${updates.completed_by_team_id}`
      );

      const { error: pubError } = await supabase
        .from("pubs")
        .update({
          is_locked: true,
          locked_by_team_id: updates.completed_by_team_id,
          controlling_team_id: updates.completed_by_team_id,
        })
        .eq("id", challenge.pub_id);

      if (pubError) {
        console.error("Error locking pub:", pubError);
        return NextResponse.json(
          { error: `Challenge updated but failed to lock pub: ${pubError.message}` },
          { status: 500 }
        );
      }

      console.log(`✅ Pub ${challenge.pub_id} locked successfully`);
    }

    // If resetting a pub challenge, unlock the pub
    if (
      challenge.type === "pub" &&
      challenge.pub_id &&
      updates.is_consumed === false &&
      challenge.is_consumed === true // Was previously consumed
    ) {
      console.log(`Unlocking pub ${challenge.pub_id}`);

      const { error: pubError } = await supabase
        .from("pubs")
        .update({
          is_locked: false,
          locked_by_team_id: null,
          // Note: We don't reset controlling_team_id as that's based on captures
        })
        .eq("id", challenge.pub_id);

      if (pubError) {
        console.error("Error unlocking pub:", pubError);
        return NextResponse.json(
          { error: `Challenge reset but failed to unlock pub: ${pubError.message}` },
          { status: 500 }
        );
      }

      console.log(`✅ Pub ${challenge.pub_id} unlocked successfully`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in challenge PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete challenge (and related data)
export async function DELETE(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { challengeId, deleteType } = await req.json();

    if (!challengeId) {
      return NextResponse.json(
        { error: "Challenge ID is required" },
        { status: 400 }
      );
    }

    // If deleteType is "bonus_points", only delete bonus points
    if (deleteType === "bonus_points") {
      const { error } = await supabase
        .from("bonus_points")
        .delete()
        .eq("challenge_id", challengeId);

      if (error) {
        console.error("Error deleting bonus points:", error);
        return NextResponse.json(
          { error: `Failed to delete bonus points: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Otherwise, delete the entire challenge and related data
    // Delete related data first (foreign key constraints)
    await supabase.from("challenge_attempts").delete().eq("challenge_id", challengeId);
    await supabase.from("bonus_points").delete().eq("challenge_id", challengeId);

    // Delete the challenge
    const { error } = await supabase
      .from("challenges")
      .delete()
      .eq("id", challengeId);

    if (error) {
      console.error("Error deleting challenge:", error);
      return NextResponse.json(
        { error: `Failed to delete challenge: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in challenge DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
