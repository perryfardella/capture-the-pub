"use client";

import { usePlayer } from "@/lib/hooks/usePlayer";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { player, loading } = usePlayer();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !player) {
      router.replace("/join");
    }
  }, [loading, player, router]);

  if (loading) return null;
  if (!player) return null; // Prevent rendering before redirect completes

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Welcome, {player.nickname}</h1>
    </div>
  );
}
