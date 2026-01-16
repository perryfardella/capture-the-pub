import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export interface LogAdminActionParams {
  action_type: string;
  description: string;
  team_id?: string | null;
  player_id?: string | null;
  pub_id?: string | null;
  challenge_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an admin action to the admin_actions table for audit trail
 * This appears in the activity feed for transparency
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  try {
    const supabase = createSupabaseServiceRoleClient();

    const { error } = await supabase.from("admin_actions").insert({
      action_type: params.action_type,
      description: params.description,
      team_id: params.team_id || null,
      player_id: params.player_id || null,
      pub_id: params.pub_id || null,
      challenge_id: params.challenge_id || null,
      metadata: params.metadata || null,
    });

    if (error) {
      console.error("Failed to log admin action:", error);
      // Don't throw - we don't want to fail the main action if logging fails
    } else {
      console.log(`✅ Admin action logged: ${params.action_type}`);
    }
  } catch (error) {
    console.error("Error logging admin action:", error);
    // Don't throw - logging is non-critical
  }
}
