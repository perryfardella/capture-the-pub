"use client";

import { ActivityFeed } from "@/components/ActivityFeed";
import { ChallengeDialog } from "@/components/ChallengeDialog";
import { PubList } from "@/components/PubList";
import { Scoreboard } from "@/components/Scoreboard";
import { useGameState } from "@/lib/hooks/useGameState";
import { useOffline } from "@/lib/hooks/useOffline";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { useRealtimeGame } from "@/lib/hooks/useRealtimeGame";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { player, loading } = usePlayer();
  const { pubs, captures, bonusPoints } = useRealtimeGame();
  const offline = useOffline();
  const { isActive } = useGameState();
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [globalChallenges, setGlobalChallenges] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [challengeAttempts, setChallengeAttempts] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [playersByTeam, setPlayersByTeam] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<
    "pubs" | "scoreboard" | "activity" | "challenges"
  >("pubs");

  useEffect(() => {
    async function loadGlobalChallenges() {
      const supabase = createSupabaseBrowserClient();
      // Load all global challenges (not filtered by is_consumed)
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .eq("type", "global");
      setGlobalChallenges(data ?? []);
    }

    loadGlobalChallenges();

    // Subscribe to global challenges updates
    const supabase = createSupabaseBrowserClient();
    const challengesChannel = supabase
      .channel("realtime-global-challenges")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenges",
          filter: "type=eq.global",
        },
        () => {
          loadGlobalChallenges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(challengesChannel);
    };
  }, [player?.team_id]);

  useEffect(() => {
    async function loadTeams() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("teams").select("*");
      setTeams(data ?? []);
    }

    async function loadPlayers() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("players")
        .select("id, nickname, team_id")
        .order("nickname");

      if (data) {
        const grouped = data.reduce((acc, player) => {
          const teamId = String(player.team_id);
          if (!acc[teamId]) {
            acc[teamId] = [];
          }
          acc[teamId].push(player);
          return acc;
        }, {} as Record<string, typeof data>);
        console.log(
          "Loaded players:",
          data.length,
          "Grouped by team:",
          grouped
        );
        setPlayersByTeam(grouped);
      } else {
        console.log("No players data returned");
      }
    }

    loadTeams();
    loadPlayers();

    // Subscribe to players updates
    const supabase = createSupabaseBrowserClient();
    const playersChannel = supabase
      .channel("realtime-players")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        async () => {
          // Reload all players when any change occurs
          const { data } = await supabase
            .from("players")
            .select("id, nickname, team_id")
            .order("nickname");

          if (data) {
            const grouped = data.reduce((acc, player) => {
              const teamId = String(player.team_id);
              if (!acc[teamId]) {
                acc[teamId] = [];
              }
              acc[teamId].push(player);
              return acc;
            }, {} as Record<string, typeof data>);
            setPlayersByTeam(grouped);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, []);

  // Load challenge attempts for activity feed
  // Filter out global challenge result attempts (they're shown via bonus_points instead)
  useEffect(() => {
    async function loadChallengeAttempts() {
      const supabase = createSupabaseBrowserClient();
      const { data: attempts } = await supabase
        .from("challenge_attempts")
        .select("*, teams(*), challenges(*), players(*)");

      if (attempts) {
        const attemptsWithPubNames = attempts
          .filter((attempt) => {
            // Filter out global challenge result attempts (shown via bonus_points)
            const challenge = attempt.challenges;
            return !(challenge?.type === "global" && attempt.step === "result");
          })
          .map((attempt) => {
            const challenge = attempt.challenges;
            const pub = challenge?.pub_id
              ? pubs.find((p) => p.id === challenge.pub_id)
              : null;
            return {
              ...attempt,
              type: "challenge",
              pubName: pub?.name || null,
              challengeDescription: challenge?.description || null,
            };
          });
        setChallengeAttempts(attemptsWithPubNames);
      }
    }

    loadChallengeAttempts();

    // Subscribe to challenge attempts updates
    const supabase = createSupabaseBrowserClient();
    const attemptsChannel = supabase
      .channel("realtime-challenge-attempts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_attempts" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch team, challenge, and player data for new attempt
            const { data: attempt } = await supabase
              .from("challenge_attempts")
              .select("*, teams(*), challenges(*), players(*)")
              .eq("id", (payload.new as unknown as { id: string }).id)
              .single();

            if (attempt) {
              const challenge = attempt.challenges;
              // Filter out global challenge result attempts (shown via bonus_points)
              if (challenge?.type === "global" && attempt.step === "result") {
                return;
              }
              const pub = challenge?.pub_id
                ? pubs.find((p) => p.id === challenge.pub_id)
                : null;
              setChallengeAttempts((prev) => [
                {
                  ...attempt,
                  type: "challenge",
                  pubName: pub?.name || null,
                  challengeDescription: challenge?.description || null,
                },
                ...prev,
              ]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attemptsChannel);
    };
  }, [pubs]);

  // Merge feed items with pub names
  // Include challenge data with bonus points
  const feed = [
    ...captures.map((c) => {
      const pub = pubs.find((p) => p.id === c.pub_id);
      return { ...c, type: "capture", pubName: pub?.name || c.pub_id };
    }),
    ...challengeAttempts,
    ...bonusPoints.map((b) => ({
      ...b,
      type: "bonus",
      challengeDescription: b.challenges?.description || null,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const router = useRouter();

  useEffect(() => {
    if (!loading && !player) {
      router.replace("/join");
    }
  }, [loading, player, router]);

  if (loading) return null;
  if (!player) return null; // Prevent rendering before redirect completes

  const tabs = [
    { id: "pubs" as const, label: "Pubs", icon: "📍" },
    { id: "scoreboard" as const, label: "Scores", icon: "🏆" },
    { id: "activity" as const, label: "Feed", icon: "📸" },
    { id: "challenges" as const, label: "Global Challenges", icon: "🎯" },
  ];

  const playerTeam = player?.teams;

  return (
    <div className="flex flex-col h-screen pb-20">
      {/* Header */}
      <header className="border-b bg-background px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-base font-bold leading-tight">
              Capture the Pub
            </h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Reuben's Bucks
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-medium text-sm">{player?.nickname}</span>
            {playerTeam && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: playerTeam.color + "22",
                  color: playerTeam.color,
                }}
              >
                {playerTeam.name}
              </span>
            )}
          </div>
        </div>
      </header>

      {offline && (
        <div className="bg-destructive text-white text-center p-2">
          You are offline — submissions will not work
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "pubs" && <PubList pubs={pubs} teams={teams} />}
        {activeTab === "scoreboard" && (
          <Scoreboard
            teams={teams}
            pubs={pubs}
            bonusPoints={bonusPoints}
            playersByTeam={playersByTeam}
          />
        )}
        {activeTab === "activity" && <ActivityFeed feed={feed} />}
        {activeTab === "challenges" && (
          <div className="space-y-6">
            {/* Active Challenges */}
            <div className="space-y-4">
              {globalChallenges.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    No active global challenges
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {globalChallenges.map((c) => {
                    // Check if this team has completed this challenge via bonus_points
                    const isTeamCompleted =
                      player?.team_id &&
                      bonusPoints.some(
                        (bp) =>
                          bp.challenge_id === c.id &&
                          bp.team_id === player.team_id
                      );
                    const isAvailable = isActive && !isTeamCompleted;

                    return (
                      <div
                        key={c.id}
                        className={`border rounded-xl p-4 transition-all ${
                          isTeamCompleted
                            ? "bg-muted/30 border-amber-200"
                            : isAvailable
                            ? "bg-gradient-to-br from-background to-muted/20 border-primary/20 shadow-sm"
                            : "bg-muted/10 border-muted"
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                              isTeamCompleted
                                ? "bg-amber-100 text-amber-600"
                                : isAvailable
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isTeamCompleted ? "✓" : "🎯"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-base leading-tight">
                                {c.description}
                              </h3>
                              {isTeamCompleted && (
                                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                                  Completed
                                </span>
                              )}
                              {!isActive && (
                                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {!isActive && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Game is currently inactive
                              </p>
                            )}
                          </div>
                        </div>

                        {isAvailable && (
                          <ChallengeDialog
                            challengeId={c.id}
                            challengeType="global"
                            description={c.description}
                            disabled={!isActive}
                            playerTeamId={player?.team_id}
                            completedByTeamId={
                              isTeamCompleted ? player?.team_id : undefined
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="grid grid-cols-4 gap-1 p-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className="flex flex-col items-center gap-1 h-auto py-2 px-1 text-xs"
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-center leading-tight whitespace-normal break-words">
                {tab.label}
              </span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
