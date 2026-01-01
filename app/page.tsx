"use client";

import { PubList } from "@/components/PubList";
import { Scoreboard } from "@/components/Scoreboard";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { useRealtimeGame } from "@/lib/hooks/useRealtimeGame";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { player, loading } = usePlayer();
  const { pubs, captures, bonusPoints } = useRealtimeGame();

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
    </div>
  );
}
