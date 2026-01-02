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
    async function loadTeams() {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) {
        console.error("Error loading teams:", error);
        return;
      }
      setTeams(data ?? []);
    }
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin() {
    console.log("handleJoin called", { nickname, teamId });

    if (!nickname || !teamId) {
      console.log("Validation failed", { nickname, teamId });
      alert("Please enter a nickname and select a team");
      return;
    }

    setLoading(true);

    // Normalize nickname: trim whitespace and convert to lowercase for comparison
    const normalizedNickname = nickname.trim();
    const normalizedLower = normalizedNickname.toLowerCase();

    // Check if a player with this nickname AND team already exists (case-insensitive)
    // This allows the same nickname on different teams, but reuses players rejoining the same team
    // We need to fetch players and filter client-side since Supabase JS doesn't
    // directly support case-insensitive filtering
    const { data: allPlayers, error: fetchError } = await supabase
      .from("players")
      .select("*");

    if (fetchError) {
      console.error("Error fetching players:", fetchError);
      alert("Error checking for existing player. Please try again.");
      setLoading(false);
      return;
    }

    // Find existing player with case-insensitive nickname match AND matching team_id
    const existingPlayer = allPlayers?.find(
      (p) =>
        p.nickname.trim().toLowerCase() === normalizedLower &&
        p.team_id === teamId
    );

    let player;

    if (existingPlayer) {
      // Player with this nickname on this team already exists - reuse them
      console.log("Found existing player:", existingPlayer);
      player = existingPlayer;
    } else {
      // No existing player on this team - create a new one
      // This allows multiple players with the same name on different teams
      console.log("Creating new player...");
      const { data: newPlayer, error } = await supabase
        .from("players")
        .insert({ nickname: normalizedNickname, team_id: teamId })
        .select()
        .single();

      if (error) {
        console.error("Error inserting player:", error);
        alert(error.message);
        setLoading(false);
        return;
      }

      player = newPlayer;
      console.log("Player created successfully:", player);
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
        <label className="text-sm font-medium">Select Your Team</label>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No teams available. Please contact the admin.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {teams.map((team) => (
              <label
                key={team.id}
                className={`flex items-center gap-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  teamId === team.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="team"
                  value={team.id}
                  checked={teamId === team.id}
                  onChange={() => setTeamId(team.id)}
                  className="sr-only"
                />
                <div
                  className="w-8 h-8 rounded-full shrink-0 border-2 border-white shadow-sm"
                  style={{ backgroundColor: team.color }}
                />
                <span className="font-medium flex-1">{team.name}</span>
                {teamId === team.id && <span className="text-primary">✓</span>}
              </label>
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        disabled={loading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Button clicked!");
          handleJoin();
        }}
      >
        {loading ? "Joining..." : "Join Game"}
      </Button>
    </div>
  );
}
