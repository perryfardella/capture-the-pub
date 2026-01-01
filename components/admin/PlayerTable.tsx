"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PlayerTable({
  players,
  teams,
  reload,
}: {
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  players: any[];
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teams: any[];
  reload: () => void;
}) {
  const supabase = createSupabaseBrowserClient();

  async function reassignPlayer(playerId: string, teamId: string) {
    await supabase
      .from("players")
      .update({ team_id: teamId })
      .eq("id", playerId);
    reload();
  }

  return (
    <table className="w-full border rounded">
      <thead>
        <tr>
          <th>Nickname</th>
          <th>Team</th>
        </tr>
      </thead>
      <tbody>
        {players.map((player) => (
          <tr key={player.id}>
            <td>{player.nickname}</td>
            <td>
              <select
                value={player.team_id}
                onChange={(e) => reassignPlayer(player.id, e.target.value)}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
