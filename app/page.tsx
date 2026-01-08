"use client";

import { ActivityFeed } from "@/components/ActivityFeed";
import { ChallengeDialog } from "@/components/ChallengeDialog";
import { Scoreboard } from "@/components/Scoreboard";
import dynamic from "next/dynamic";

const TerritorialMap = dynamic(() => import("@/components/TerritorialMap").then(mod => ({ default: mod.TerritorialMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-slate-800 rounded-lg">
      <div className="text-center text-slate-400">
        <div className="text-4xl mb-3">🗺️</div>
        <p>Loading map...</p>
      </div>
    </div>
  ),
});
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PushNotificationDebug } from "@/components/PushNotificationDebug";
import { useGameState } from "@/lib/hooks/useGameState";
import { useOffline } from "@/lib/hooks/useOffline";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { useRealtimeManager } from "@/lib/hooks/useRealtimeManager";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";

export default function Home() {
  const { player, loading } = usePlayer();
  const { 
    pubs, 
    captures, 
    bonusPoints, 
    teams, 
    playersByTeam, 
    challenges: globalChallenges, 
    challengeAttempts, 
    isLoading: gameDataLoading 
  } = useRealtimeManager();
  const offline = useOffline();
  const { isActive } = useGameState();
  const [activeTab, setActiveTab] = useState<
    "map" | "scoreboard" | "activity" | "challenges"
  >("map");

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

  // Memoize expensive feed merging calculation
  const feed = useMemo(() => {
    const processedChallengeAttempts = challengeAttempts.map((attempt) => {
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

    return [
      ...captures.map((c) => {
        const pub = pubs.find((p) => p.id === c.pub_id);
        return { ...c, type: "capture", pubName: pub?.name || c.pub_id };
      }),
      ...processedChallengeAttempts,
      ...bonusPoints.map((b) => ({
        ...b,
        type: "bonus",
        challengeDescription: b.challenges?.description || null,
      })),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [captures, challengeAttempts, bonusPoints, pubs]);

  const router = useRouter();

  useEffect(() => {
    if (!loading && !player) {
      router.replace("/join");
    }
  }, [loading, player, router]);

  if (loading || gameDataLoading) return null;
  if (!player) return null; // Prevent rendering before redirect completes

  const tabs = [
    { id: "map" as const, label: "Map", icon: "🗺️" },
    { id: "scoreboard" as const, label: "Scores", icon: "🏆" },
    { id: "activity" as const, label: "Feed", icon: "📸" },
    { id: "challenges" as const, label: "Global Challenges", icon: "🎯" },
  ];

  const playerTeam = player?.teams;

  return (
    <div className="flex flex-col h-screen pb-[max(5rem,calc(5rem+env(safe-area-inset-bottom)))]">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSecretTap}
              className="text-2xl select-none active:scale-95 transition-transform"
              aria-label="Logo"
            >
              🍻
            </button>
            <div className="flex flex-col">
              <h1 className="text-base font-bold leading-tight">
                Capture the Pub
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">
                Reuben&apos;s Bucks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {playerTeam && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: playerTeam.color + "15",
                  borderColor: playerTeam.color + "40",
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: playerTeam.color }}
                />
                <span
                  className="font-semibold text-sm"
                  style={{ color: playerTeam.color }}
                >
                  {player?.nickname}
                </span>
              </div>
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
        {activeTab === "map" && <TerritorialMap pubs={pubs} teams={teams} playerTeamId={player?.team_id} />}
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
                            ? "bg-linear-to-br from-background to-muted/20 border-primary/20 shadow-sm"
                            : "bg-muted/10 border-muted"
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
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
                                <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                                  Completed
                                </span>
                              )}
                              {!isActive && (
                                <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
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
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm">
        <div className="grid grid-cols-4 gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Haptic feedback
                  if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(10);
                  }
                }}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-1 rounded-lg transition-all active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span
                  className={`text-xl transition-transform ${
                    isActive ? "scale-110" : ""
                  }`}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[10px] text-center leading-tight whitespace-nowrap ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                >
                  {tab.id === "challenges" ? "Challenges" : tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Prompt */}
      <NotificationPrompt />

      {/* Install Prompt */}
      <InstallPrompt />

      {/* Debug Panel (only shows with ?debug query param) */}
      <PushNotificationDebug />
    </div>
  );
}
