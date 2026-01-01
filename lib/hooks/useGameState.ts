"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useGameState() {
  const [isActive, setIsActive] = useState<boolean | null>(null);

  // TODO: I don't like this useEffect, especially with createSupabaseBrowserClient() in it
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function load() {
      const { data } = await supabase
        .from("game_state")
        .select("is_active")
        .single();

      setIsActive(data?.is_active ?? false);
    }

    load();

    const channel = supabase
      .channel("game-state")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
        },
        (payload) => {
          setIsActive(
            // TODO: Fix this
            (payload.new as { is_active?: boolean })?.is_active ?? false
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isActive };
}
