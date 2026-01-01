"use client";

import { ActivityFeed } from "@/components/ActivityFeed";
import { PubList } from "@/components/PubList";
import { Scoreboard } from "@/components/Scoreboard";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { useRealtimeGame } from "@/lib/hooks/useRealtimeGame";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { player, loading } = usePlayer();
  const { pubs, captures, bonusPoints } = useRealtimeGame();

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
      <Scoreboard teams={[]} pubs={pubs} bonusPoints={bonusPoints} />
      <PubList pubs={pubs} teams={[]} />
      <ActivityFeed feed={feed} />
    </div>
  );
}
