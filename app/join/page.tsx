"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function JoinPage() {
  const supabase = createSupabaseBrowserClient();
  const [nickname, setNickname] = useState("");
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("teams")
      .select("*")
      .then(({ data }) => {
        setTeams(data ?? []);
      });
  }, []);

  async function handleJoin() {
    if (!nickname || !teamId) return;
    setLoading(true);

    const { data: player, error } = await supabase
      .from("players")
      .insert({ nickname, team_id: teamId })
      .select()
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Store player_id locally
    localStorage.setItem("player_id", player.id);

    setLoading(false);
    window.location.href = "/";
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Join the Game 🍻</h1>

      <Input
        placeholder="Nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />

      <div className="space-y-2">
        {teams.map((team) => (
          <label
            key={team.id}
            className="flex items-center gap-2 border p-2 rounded"
          >
            <input
              type="radio"
              name="team"
              value={team.id}
              checked={teamId === team.id}
              onChange={() => setTeamId(team.id)}
            />
            <span>{team.name}</span>
          </label>
        ))}
      </div>

      <Button disabled={loading} onClick={handleJoin}>
        Join Game
      </Button>
    </div>
  );
}
