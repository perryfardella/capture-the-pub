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

export default function Home() {
  const { player, loading } = usePlayer();
  const { pubs, captures, bonusPoints } = useRealtimeGame();
  const offline = useOffline();
  const { isActive } = useGameState();
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [globalChallenges, setGlobalChallenges] = useState<any[]>([]);

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

  return (
    <div className="p-4 space-y-6">
      {offline && (
        <div className="bg-destructive text-white text-center p-2">
          You are offline — submissions will not work
        </div>
      )}
      <Scoreboard teams={[]} pubs={pubs} bonusPoints={bonusPoints} />
      <PubList pubs={pubs} teams={[]} />
      <ActivityFeed feed={feed} />

      <div className="space-y-2">
        <h2 className="font-bold">Global Challenges</h2>
        {globalChallenges.map((c) => (
          <ChallengeDialog
            key={c.id}
            challengeId={c.id}
            challengeType="global"
            disabled={!isActive || c.is_consumed}
          />
        ))}
      </div>
    </div>
  );
}
