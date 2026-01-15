"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Player {
  id: string;
  nickname: string;
  team_id: string;
  teams?: Team;
}

export function usePlayer() {
  const supabase = createSupabaseBrowserClient();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const playerId = localStorage.getItem("player_id");
      if (!playerId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("players")
        .select("*, teams(*)")
        .eq("id", playerId)
        .single();

      setPlayer(data);
      setLoading(false);
    }

    load();
  }, []);

  return { player, loading };
}
