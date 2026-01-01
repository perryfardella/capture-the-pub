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
    // TODO: Is this an issue?
  }, [loading, player]);

  if (loading) return null;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Welcome, {player.nickname}</h1>
    </div>
  );
}
