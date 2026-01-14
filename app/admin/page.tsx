"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PlayerTable } from "@/components/admin/PlayerTable";
import { PubTable } from "@/components/admin/PubTable";
import { ChallengeTable } from "@/components/admin/ChallengeTable";
import { TeamTable } from "@/components/admin/TeamTable";
import { CaptureLog } from "@/components/admin/CaptureLog";
import { ActivityOverview } from "@/components/admin/ActivityOverview";
import { PubCoordinatesForm } from "@/components/admin/PubCoordinatesForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Tab =
  | "game"
  | "teams"
  | "players"
  | "pubs"
  | "coordinates"
  | "challenges"
  | "captures"
  | "activity";

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

interface Pub {
  id: string;
  name: string;
  controlling_team_id: string | null;
  drink_count: number;
  is_locked: boolean;
  locked_by_team_id: string | null;
}

interface Challenge {
  id: string;
  type: "pub" | "global";
  pub_id: string | null;
  description: string;
  is_consumed: boolean;
  completed_by_team_id: string | null;
  created_at: string;
}

interface Capture {
  id: string;
  pub_id: string;
  team_id: string;
  drink_count: number;
  media_url: string;
  created_at: string;
  teams?: Team;
  pubs?: Pub;
}

interface ChallengeAttempt {
  id: string;
  challenge_id: string;
  team_id: string;
  step: "start" | "result";
  success: boolean | null;
  media_url: string;
  created_at: string;
}

interface BonusPoint {
  id: string;
  team_id: string;
  challenge_id: string;
  created_at: string;
}

export default function AdminPage() {
  const supabase = createSupabaseBrowserClient();
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("game");
  const [loading, setLoading] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [challengeAttempts, setChallengeAttempts] = useState<
    ChallengeAttempt[]
  >([]);
  const [bonusPoints, setBonusPoints] = useState<BonusPoint[]>([]);
  const [gameState, setGameState] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: playersData },
        { data: teamsData },
        { data: pubsData },
        { data: challengesData },
        { data: capturesData },
        { data: attemptsData },
        { data: bonusData },
        { data: game },
      ] = await Promise.all([
        supabase
          .from("players")
          .select("*, teams(*)")
          .order("created_at", { ascending: false }),
        supabase.from("teams").select("*").order("name"),
        supabase.from("pubs").select("*").order("name"),
        supabase
          .from("challenges")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("captures")
          .select("*, teams(*), pubs(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("challenge_attempts")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("bonus_points")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("game_state").select("is_active").single(),
      ]);
      setPlayers(playersData ?? []);
      setTeams(teamsData ?? []);
      setPubs(pubsData ?? []);
      setChallenges(challengesData ?? []);
      setCaptures(capturesData ?? []);
      setChallengeAttempts(attemptsData ?? []);
      setBonusPoints(bonusData ?? []);
      setGameState(game?.is_active ?? false);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, loadData]);

  const toggleGame = async () => {
    await supabase
      .from("game_state")
      .update({ is_active: !gameState })
      .eq("id", true);
    setGameState(!gameState);
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl mb-4">🎮</div>
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-slate-400 text-sm">Enter password to continue</p>
          </div>
          <div className="space-y-4 bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  try {
                    const response = await fetch("/api/admin/auth", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ password }),
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                      setAuthorized(true);
                      sessionStorage.setItem("admin_auth", "true");
                    } else {
                      alert(data.error || "Wrong password");
                    }
                  } catch (error) {
                    alert("Authentication failed");
                  }
                }
              }}
              className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              autoComplete="current-password"
            />
            <Button
              onClick={async () => {
                try {
                  const response = await fetch("/api/admin/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password }),
                  });

                  const data = await response.json();

                  if (response.ok && data.success) {
                    setAuthorized(true);
                    sessionStorage.setItem("admin_auth", "true");
                  } else {
                    alert(data.error || "Wrong password");
                  }
                } catch (error) {
                  alert("Authentication failed");
                }
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              Enter Admin Panel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "game", label: "Game", icon: "🎮" },
    { id: "teams", label: "Teams", icon: "👥" },
    { id: "players", label: "Players", icon: "🧑" },
    { id: "pubs", label: "Pubs", icon: "🍺" },
    { id: "coordinates", label: "Map Setup", icon: "🗺️" },
    { id: "challenges", label: "Challenges", icon: "🎯" },
    { id: "captures", label: "Captures", icon: "📸" },
    { id: "activity", label: "Activity", icon: "📊" },
  ];

  // Calculate stats
  const totalPlayers = players.length;
  const totalCaptures = captures.length;
  const lockedPubs = pubs.filter((p) => p.is_locked).length;
  const capturedPubs = pubs.filter((p) => p.controlling_team_id).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-slate-900/80 border-b border-slate-700">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎮</span>
              <div>
                <h1 className="text-lg font-bold text-white">Admin Panel</h1>
                <p className="text-xs text-slate-400">Capture the Pub</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild className="bg-slate-800/50 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
                <Link href="/">🏠 Home</Link>
              </Button>
              {loading && (
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              )}
              <Badge
                variant={gameState ? "default" : "secondary"}
                className={
                  gameState
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }
              >
                {gameState ? "🟢 Live" : "🔴 Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Scrollable */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-4 pb-3 min-w-max">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-amber-500 text-slate-900"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-8">
        {tab === "game" && (
          <div className="space-y-6">
            {/* Game State Control */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🎮</span> Game State Control
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    Game is currently{" "}
                    <span
                      className={gameState ? "text-green-400" : "text-red-400"}
                    >
                      {gameState ? "Active" : "Inactive"}
                    </span>
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {gameState
                      ? "Players can capture pubs and complete challenges"
                      : "Game is in read-only mode"}
                  </p>
                </div>
                <Button
                  onClick={toggleGame}
                  variant={gameState ? "destructive" : "default"}
                  className={gameState ? "" : "bg-green-600 hover:bg-green-700"}
                >
                  {gameState ? "Stop Game" : "Start Game"}
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
                <div className="text-3xl font-bold text-amber-400">
                  {totalPlayers}
                </div>
                <div className="text-sm text-slate-400">Total Players</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
                <div className="text-3xl font-bold text-amber-400">
                  {teams.length}
                </div>
                <div className="text-sm text-slate-400">Teams</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
                <div className="text-3xl font-bold text-amber-400">
                  {capturedPubs}/{pubs.length}
                </div>
                <div className="text-sm text-slate-400">Pubs Captured</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
                <div className="text-3xl font-bold text-amber-400">
                  {lockedPubs}
                </div>
                <div className="text-sm text-slate-400">Pubs Locked</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
                <div className="text-3xl font-bold text-amber-400">
                  {totalCaptures}
                </div>
                <div className="text-sm text-slate-400">Total Captures</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
                <div className="text-3xl font-bold text-amber-400">
                  {bonusPoints.length}
                </div>
                <div className="text-sm text-slate-400">Challenges Won</div>
              </div>
            </div>

            {/* Team Standings */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🏆</span> Current Standings
              </h2>
              <div className="space-y-3">
                {teams.map((team) => {
                  const teamPubs = pubs.filter(
                    (p) => p.controlling_team_id === team.id
                  ).length;
                  const teamBonus = bonusPoints.filter(
                    (b) => b.team_id === team.id
                  ).length;
                  const totalScore = teamPubs + teamBonus;
                  const teamPlayers = players.filter(
                    (p) => p.team_id === team.id
                  ).length;

                  return (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        backgroundColor: team.color + "15",
                        borderLeft: `4px solid ${team.color}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <div>
                          <div className="font-medium text-white">
                            {team.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {teamPlayers} players
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">
                          {totalScore}
                        </div>
                        <div className="text-xs text-slate-400">
                          {teamPubs} pubs + {teamBonus} bonus
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "teams" && <TeamTable teams={teams} reload={loadData} />}
        {tab === "players" && (
          <PlayerTable players={players} teams={teams} reload={loadData} />
        )}
        {tab === "pubs" && (
          <PubTable
            pubs={pubs}
            teams={teams}
            captures={captures}
            reload={loadData}
          />
        )}
        {tab === "coordinates" && (
          <PubCoordinatesForm
            pubs={pubs}
            onComplete={loadData}
          />
        )}
        {tab === "challenges" && (
          <ChallengeTable
            challenges={challenges}
            pubs={pubs}
            teams={teams}
            reload={loadData}
          />
        )}
        {tab === "captures" && (
          <CaptureLog
            captures={captures}
            pubs={pubs}
            teams={teams}
            reload={loadData}
          />
        )}
        {tab === "activity" && (
          <ActivityOverview
            captures={captures}
            challengeAttempts={challengeAttempts}
            bonusPoints={bonusPoints}
            teams={teams}
            pubs={pubs}
            challenges={challenges}
          />
        )}
      </main>
    </div>
  );
}
