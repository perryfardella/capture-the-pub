"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JoinPage() {
  const supabase = createSupabaseBrowserClient();
  const [nickname, setNickname] = useState("");
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Secret admin access - tap beer emoji 5 times quickly
  const secretTapCountRef = useRef(0);
  const secretTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSecretTap = useCallback(() => {
    secretTapCountRef.current += 1;

    // Clear existing timeout
    if (secretTapTimeoutRef.current) {
      clearTimeout(secretTapTimeoutRef.current);
    }

    // If we hit 5 taps, navigate to admin
    if (secretTapCountRef.current >= 5) {
      secretTapCountRef.current = 0;
      window.location.href = "/admin";
      return;
    }

    // Reset counter after 2 seconds of no tapping
    secretTapTimeoutRef.current = setTimeout(() => {
      secretTapCountRef.current = 0;
    }, 2000);
  }, []);

  useEffect(() => {
    async function loadTeams() {
      setTeamsLoading(true);
      const { data, error } = await supabase.from("teams").select("*");
      if (error) {
        console.error("Error loading teams:", error);
        setTeamsLoading(false);
        return;
      }
      setTeams(data ?? []);
      setTeamsLoading(false);
    }
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin() {
    if (!nickname.trim() || !teamId) {
      return;
    }

    setLoading(true);

    // Normalize nickname: trim whitespace and convert to lowercase for comparison
    const normalizedNickname = nickname.trim();
    const normalizedLower = normalizedNickname.toLowerCase();

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
      player = existingPlayer;
    } else {
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
    }

    // Store player_id locally
    localStorage.setItem("player_id", player.id);

    setLoading(false);
    window.location.href = "/";
  }

  const selectedTeam = teams.find((t) => t.id === teamId);
  const canJoin = nickname.trim().length > 0 && teamId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Hero */}
      <div className="px-6 pt-10 pb-6 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <button
          onClick={handleSecretTap}
          className="text-6xl mb-3 select-none active:scale-95 transition-transform"
          aria-label="Logo"
        >
          🍻
        </button>
        <h1 className="text-2xl font-black text-amber-900">Capture the Pub</h1>
        <p className="text-amber-700 mt-1">Reuben&apos;s Bucks Party</p>
      </div>

      {/* Form Card */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 overflow-hidden max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Join the Game</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a name and choose your team
              </p>
            </div>

            {/* Nickname Input */}
            <div className="space-y-2">
              <Label className="text-gray-700">Your Nickname</Label>
              <Input
                placeholder="e.g. Big Davo"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="text-lg py-6 px-4"
                autoComplete="off"
                autoCapitalize="words"
              />
            </div>

            {/* Team Selection */}
            <div className="space-y-3">
              <Label className="text-gray-700">Choose Your Team</Label>
              {teamsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-xl bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No teams available</p>
                  <p className="text-sm mt-1">Contact the admin</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {teams.map((team, index) => (
                    <Button
                      key={team.id}
                      type="button"
                      variant="outline"
                      onClick={() => setTeamId(team.id)}
                      className={`flex items-center justify-start gap-4 h-auto rounded-xl p-4 transition-all duration-200 text-left animate-in fade-in slide-in-from-left-4 ${
                        teamId === team.id
                          ? "shadow-md scale-[1.02] border-2"
                          : "hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] border-2"
                      }`}
                      style={{
                        borderColor:
                          teamId === team.id ? team.color : "var(--border)",
                        backgroundColor:
                          teamId === team.id ? team.color + "15" : undefined,
                        animationDelay: `${200 + index * 75}ms`,
                      }}
                    >
                      <div
                        className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-xl shadow-inner transition-transform ${
                          teamId === team.id ? "scale-110" : ""
                        }`}
                        style={{ backgroundColor: team.color }}
                      >
                        {teamId === team.id ? "✓" : ""}
                      </div>
                      <div className="flex-1">
                        <span
                          className="font-semibold text-lg"
                          style={{
                            color: teamId === team.id ? team.color : undefined,
                          }}
                        >
                          {team.name}
                        </span>
                      </div>
                      {teamId === team.id && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold animate-in zoom-in duration-200"
                          style={{ backgroundColor: team.color }}
                        >
                          ✓
                        </div>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Join Button */}
            <Button
              type="button"
              size="lg"
              disabled={loading || !canJoin}
              onClick={handleJoin}
              className={`w-full text-lg py-6 font-bold transition-all ${
                canJoin && selectedTeam ? "bg-amber-500 hover:bg-amber-600" : ""
              }`}
              style={
                canJoin && selectedTeam
                  ? {
                      backgroundColor: selectedTeam.color,
                    }
                  : undefined
              }
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Joining...
                </span>
              ) : (
                "Let's Go! 🍺"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-center px-6 pb-8 animate-in fade-in duration-1000 delay-500">
        <p className="text-xs text-amber-600">
          Already joined? Just enter the same name & team
        </p>
      </div>
    </div>
  );
}
