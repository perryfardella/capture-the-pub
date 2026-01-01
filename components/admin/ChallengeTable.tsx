"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ChallengeTable({
  challenges,
  reload,
}: {
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  challenges: any[];
  reload: () => void;
}) {
  const supabase = createSupabaseBrowserClient();

  async function markComplete(challengeId: string) {
    await supabase
      .from("challenges")
      .update({ is_consumed: true })
      .eq("id", challengeId);
    reload();
  }

  async function resetChallenge(challengeId: string) {
    await supabase
      .from("challenges")
      .update({ is_consumed: false, completed_by_team_id: null })
      .eq("id", challengeId);
    reload();
  }

  return (
    <table className="w-full border rounded">
      <thead>
        <tr>
          <th>Description</th>
          <th>Type</th>
          <th>Completed By</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {challenges.map((c) => (
          <tr key={c.id}>
            <td>{c.description}</td>
            <td>{c.type}</td>
            <td>{c.completed_by_team_id || "—"}</td>
            <td className="space-x-2">
              <button onClick={() => markComplete(c.id)}>Complete</button>
              <button onClick={() => resetChallenge(c.id)}>Reset</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
