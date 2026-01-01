"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PlayerTable } from "@/components/admin/PlayerTable";
import { PubTable } from "@/components/admin/PubTable";
import { ChallengeTable } from "@/components/admin/ChallengeTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const supabase = createSupabaseBrowserClient();
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"players" | "pubs" | "challenges" | "game">(
    "players"
  );

  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [players, setPlayers] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pubs, setPubs] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [challenges, setChallenges] = useState<any[]>([]);
  const [gameState, setGameState] = useState(false);

  async function loadData() {
    const [
      { data: playersData },
      { data: teamsData },
      { data: pubsData },
      { data: challengesData },
      { data: game },
    ] = await Promise.all([
      supabase.from("players").select("*"),
      supabase.from("teams").select("*"),
      supabase.from("pubs").select("*"),
      supabase.from("challenges").select("*"),
      supabase.from("game_state").select("is_active").single(),
    ]);
    setPlayers(playersData ?? []);
    setTeams(teamsData ?? []);
    setPubs(pubsData ?? []);
    setChallenges(challengesData ?? []);
    setGameState(game?.is_active ?? false);
  }

  useEffect(() => {
    if (authorized) {
      async function load() {
        await loadData();
      }
      load();
    }
  }, [authorized]);

  if (!authorized) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Admin Login</h1>
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          onClick={() => {
            if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD)
              setAuthorized(true);
            else alert("Wrong password");
          }}
        >
          Enter
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {["players", "pubs", "challenges", "game"].map((t) => (
          <Button
            key={t}
            onClick={() =>
              setTab(t as "players" | "pubs" | "challenges" | "game")
            }
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "players" && (
          <PlayerTable players={players} teams={teams} reload={loadData} />
        )}
        {tab === "pubs" && (
          <PubTable pubs={pubs} teams={teams} reload={loadData} />
        )}
        {tab === "challenges" && (
          <ChallengeTable challenges={challenges} reload={loadData} />
        )}
        {tab === "game" && (
          <div className="space-y-2">
            <p>Game is currently: {gameState ? "Active" : "Inactive"}</p>
            <Button
              onClick={async () => {
                await supabase
                  .from("game_state")
                  .update({ is_active: !gameState })
                  .eq("id", true);
                setGameState(!gameState);
              }}
            >
              Toggle Game
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
