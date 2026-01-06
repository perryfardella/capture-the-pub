import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { name, color } = await req.json();

    if (!name || !color) {
      return new NextResponse("Name and color are required", { status: 400 });
    }

    const { error } = await supabase
      .from("teams")
      .insert({ name: name.trim(), color });

    if (error) {
      console.error("Error creating team:", error);
      return new NextResponse(`Database error: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in team POST API route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { teamId, name, color } = await req.json();

    if (!teamId || !name || !color) {
      return new NextResponse("Team ID, name, and color are required", { status: 400 });
    }

    const { error } = await supabase
      .from("teams")
      .update({ name, color })
      .eq("id", teamId);

    if (error) {
      console.error("Error updating team:", error);
      return new NextResponse(`Database error: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in team PATCH API route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { teamId } = await req.json();

    if (!teamId) {
      return new NextResponse("Team ID is required", { status: 400 });
    }

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (error) {
      console.error("Error deleting team:", error);
      return new NextResponse(`Database error: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in team DELETE API route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}