import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { name } = await req.json();

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const { error } = await supabase
      .from("pubs")
      .insert({ name: name.trim() });

    if (error) {
      console.error("Error creating pub:", error);
      return new NextResponse(`Database error: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in pub POST API route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { 
      pubId, 
      name, 
      controlling_team_id, 
      drink_count, 
      is_locked, 
      locked_by_team_id,
      action 
    } = await req.json();

    if (!pubId) {
      return new NextResponse("Pub ID is required", { status: 400 });
    }

    let updateData: any = {};

    switch (action) {
      case "update_name":
        if (!name) return new NextResponse("Name is required", { status: 400 });
        updateData = { name };
        break;
      case "change_owner":
        updateData = { controlling_team_id: controlling_team_id || null };
        break;
      case "set_drink_count":
        if (drink_count < 0) return new NextResponse("Drink count cannot be negative", { status: 400 });
        updateData = { drink_count };
        break;
      case "toggle_lock":
        updateData = { is_locked };
        break;
      case "reset":
        updateData = {
          controlling_team_id: null,
          drink_count: 0,
          is_locked: false,
          locked_by_team_id: null,
        };
        break;
      default:
        return new NextResponse("Invalid action", { status: 400 });
    }

    const { error } = await supabase
      .from("pubs")
      .update(updateData)
      .eq("id", pubId);

    if (error) {
      console.error("Error updating pub:", error);
      return new NextResponse(`Database error: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in pub PATCH API route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { pubId } = await req.json();

    if (!pubId) {
      return new NextResponse("Pub ID is required", { status: 400 });
    }

    // Delete related captures first
    const { error: capturesError } = await supabase
      .from("captures")
      .delete()
      .eq("pub_id", pubId);

    if (capturesError) {
      console.error("Error deleting captures:", capturesError);
      return new NextResponse(`Error deleting captures: ${capturesError.message}`, { status: 500 });
    }

    // Delete the pub
    const { error: pubError } = await supabase
      .from("pubs")
      .delete()
      .eq("id", pubId);

    if (pubError) {
      console.error("Error deleting pub:", pubError);
      return new NextResponse(`Database error: ${pubError.message}`, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in pub DELETE API route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}