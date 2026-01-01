"use client";

import { PubList } from "@/components/PubList";
import { Scoreboard } from "@/components/Scoreboard";
import { useGameData } from "@/lib/hooks/useGameData";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { player, loading } = usePlayer();
  const { teams, pubs, bonusPoints } = useGameData();

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
      <Scoreboard teams={teams} pubs={pubs} bonusPoints={bonusPoints} />

      <PubList pubs={pubs} teams={teams} />
    </div>
  );
}
