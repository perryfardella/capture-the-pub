"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PubTable({
  pubs,
  teams,
  reload,
}: {
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pubs: any[];
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teams: any[];
  reload: () => void;
}) {
  const supabase = createSupabaseBrowserClient();

  async function toggleLock(pubId: string, lock: boolean) {
    await supabase.from("pubs").update({ is_locked: lock }).eq("id", pubId);
    reload();
  }

  async function changeOwner(pubId: string, teamId: string) {
    await supabase
      .from("pubs")
      .update({ controlling_team_id: teamId })
      .eq("id", pubId);
    reload();
  }

  return (
    <table className="w-full border rounded">
      <thead>
        <tr>
          <th>Pub</th>
          <th>Owner</th>
          <th>Locked</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pubs.map((pub) => (
          <tr key={pub.id}>
            <td>{pub.name}</td>
            <td>
              <select
                value={pub.controlling_team_id || ""}
                onChange={(e) => changeOwner(pub.id, e.target.value)}
              >
                <option value="">None</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </td>
            <td>{pub.is_locked ? "Yes" : "No"}</td>
            <td>
              <button onClick={() => toggleLock(pub.id, !pub.is_locked)}>
                {pub.is_locked ? "Unlock" : "Lock"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
