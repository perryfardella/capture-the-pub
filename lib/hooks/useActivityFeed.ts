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
      const [{ data: captures }, { data: attempts }, { data: bonus }, { data: pubs }] =
        await Promise.all([
          supabase.from("captures").select("*, teams(*), players(*), pubs(name)"),
          supabase.from("challenge_attempts").select("*, teams(*), players(*), challenges(pub_id, description, pubs(name))"),
          supabase.from("bonus_points").select("*, teams(*), players(*), challenges(description)"),
          supabase.from("pubs").select("id, name"),
        ]);

      // Create a lookup map for pub names
      const pubNameMap = new Map((pubs ?? []).map(p => [p.id, p.name]));

      const all = [
        ...(captures ?? []).map((c) => ({
          ...c,
          type: "capture",
          created_at: c.created_at,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pubName: (c as any).pubs?.name || pubNameMap.get(c.pub_id),
        })),
        ...(attempts ?? []).map((a) => ({
          ...a,
          type: "challenge",
          created_at: a.created_at,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pubName: (a as any).challenges?.pubs?.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          challengeDescription: (a as any).challenges?.description,
        })),
        ...(bonus ?? []).map((b) => ({
          ...b,
          type: "bonus",
          created_at: b.created_at,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          challengeDescription: (b as any).challenges?.description,
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
