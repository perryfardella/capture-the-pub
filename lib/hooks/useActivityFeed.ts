"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useActivityFeed() {
  const supabase = createSupabaseBrowserClient();
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: captures }, { data: attempts }, { data: bonus }] =
        await Promise.all([
          supabase.from("captures").select("*, teams(*), players(*)"),
          supabase.from("challenge_attempts").select("*, teams(*), players(*)"),
          supabase.from("bonus_points").select("*, teams(*), players(*)"),
        ]);

      const all = [
        ...(captures ?? []).map((c) => ({
          ...c,
          type: "capture",
          created_at: c.created_at,
        })),
        ...(attempts ?? []).map((a) => ({
          ...a,
          type: "challenge",
          created_at: a.created_at,
        })),
        ...(bonus ?? []).map((b) => ({
          ...b,
          type: "bonus",
          created_at: b.created_at,
        })),
      ];

      setFeed(
        all.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    }

    load();

    // Realtime subscriptions
    // Note: Realtime events don't include joined data, so we'll reload on changes
    const channels = [
      supabase
        .channel("realtime-captures")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "captures" },
          () => load()
        )
        .subscribe(),
      supabase
        .channel("realtime-challenges")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "challenge_attempts" },
          () => load()
        )
        .subscribe(),
      supabase
        .channel("realtime-bonus")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bonus_points" },
          () => load()
        )
        .subscribe(),
    ];

    return () => channels.forEach((c) => supabase.removeChannel(c));
  }, []);

  return { feed };
}
