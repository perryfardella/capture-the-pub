"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function usePlayer() {
  const supabase = createSupabaseBrowserClient();
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [player, setPlayer] = useState<any>(null);
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
