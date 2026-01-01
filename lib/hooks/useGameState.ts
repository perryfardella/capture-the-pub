"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useGameState() {
  const [isActive, setIsActive] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function load() {
      const { data, error } = await supabase
        .from("game_state")
        .select("is_active")
        .single();

      if (error) {
        console.error("Error loading game state:", error);
        return;
      }

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
          console.log("Game state changed (realtime):", payload);
          const newState = payload.new as { is_active?: boolean } | null;
          if (newState && typeof newState.is_active === "boolean") {
            setIsActive(newState.is_active);
          } else {
            // Fallback: reload from database if payload structure is unexpected
            console.warn("Unexpected payload structure, reloading state");
            load();
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to game_state changes");
        } else if (status === "CHANNEL_ERROR") {
          console.warn(
            "Temporary error subscribing to game_state changes. Supabase will automatically retry."
          );
        } else if (status === "CLOSED") {
          console.log(
            "Game state subscription closed. This is normal during connection retries."
          );
        } else if (status === "TIMED_OUT") {
          console.warn(
            "Game state subscription timed out. Supabase will automatically retry."
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isActive };
}
