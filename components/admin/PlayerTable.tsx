"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Player {
  id: string;
  nickname: string;
  team_id: string;
  created_at: string;
  teams?: Team;
}

export function PlayerTable({
  players,
  teams,
  reload,
}: {
  players: Player[];
  teams: Team[];
  reload: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState<string>("all");

  async function reassignPlayer(playerId: string, teamId: string) {
    await supabase
      .from("players")
      .update({ team_id: teamId })
      .eq("id", playerId);
    reload();
  }

  async function deletePlayer(playerId: string, nickname: string) {
    if (!confirm(`Delete player "${nickname}"? This cannot be undone.`)) return;
    await supabase.from("players").delete().eq("id", playerId);
    reload();
  }

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.nickname
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesTeam = filterTeam === "all" || player.team_id === filterTeam;
    return matchesSearch && matchesTeam;
  });

  // Group players by team for summary
  const playersByTeam = teams.map((team) => ({
    team,
    count: players.filter((p) => p.team_id === team.id).length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🧑</span> Players ({players.length})
        </h2>
      </div>

      {/* Team Summary */}
      <div className="flex flex-wrap gap-2">
        {playersByTeam.map(({ team, count }) => (
          <div
            key={team.id}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: team.color + "20",
              color: team.color,
              border: `1px solid ${team.color}40`,
            }}
          >
            {team.name}: {count}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Input
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
        />
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm"
        >
          <option value="all">All Teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Players List */}
      <div className="space-y-2">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No players found
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const team = teams.find((t) => t.id === player.team_id);
            return (
              <div
                key={player.id}
                className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: team?.color || "#888" }}
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">
                        {player.nickname}
                      </div>
                      <div className="text-xs text-slate-400">
                        Joined {new Date(player.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={player.team_id}
                      onChange={(e) => reassignPlayer(player.id, e.target.value)}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={() => deletePlayer(player.id, player.nickname)}
                      variant="destructive"
                      size="sm"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
