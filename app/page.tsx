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
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pubs" | "scoreboard" | "activity" | "challenges">("pubs");

  useEffect(() => {
    async function loadGlobalChallenges() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .eq("type", "global")
        .eq("is_consumed", false); // only show uncompleted
      setGlobalChallenges(data ?? []);
    }

    loadGlobalChallenges();
  }, []);

  useEffect(() => {
    async function loadTeams() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("teams").select("*");
      setTeams(data ?? []);
    }

    loadTeams();
  }, []);

  // Merge feed items
  const feed = [
    ...captures.map((c) => ({ ...c, type: "capture" })),
    ...bonusPoints.map((b) => ({ ...b, type: "bonus" })),
    // challenge attempts handled in Phase 8
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
    { id: "challenges" as const, label: "Challenges", icon: "🎯" },
  ];

  const playerTeam = player?.teams;

  return (
    <div className="flex flex-col h-screen pb-20">
      {/* Header */}
      <header className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">{player?.nickname}</span>
            {playerTeam && (
              <>
                <span className="text-muted-foreground">•</span>
                <span
                  className="px-2 py-1 rounded text-sm font-medium"
                  style={{
                    backgroundColor: playerTeam.color + "22",
                    color: playerTeam.color,
                  }}
                >
                  {playerTeam.name}
                </span>
              </>
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
          <Scoreboard teams={teams} pubs={pubs} bonusPoints={bonusPoints} />
        )}
        {activeTab === "activity" && <ActivityFeed feed={feed} />}
        {activeTab === "challenges" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">Global Challenges</h2>
            {globalChallenges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active challenges
              </p>
            ) : (
              <div className="space-y-2">
                {globalChallenges.map((c) => (
                  <ChallengeDialog
                    key={c.id}
                    challengeId={c.id}
                    challengeType="global"
                    disabled={!isActive || c.is_consumed}
                  />
                ))}
              </div>
            )}
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
              <span>{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
