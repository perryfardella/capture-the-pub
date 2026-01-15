"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ActivityFeedItem {
  id: string;
  type: "capture" | "challenge" | "bonus";
  created_at: string;
  pubName?: string | null;
  challengeDescription?: string | null;
}

interface CaptureWithRelations {
  id: string;
  created_at: string;
  pub_id: string;
  pubs?: { name: string } | null;
}

interface ChallengeAttemptWithRelations {
  id: string;
  created_at: string;
  challenges?: {
    pub_id?: string;
    description?: string;
    pubs?: { name: string } | null;
  } | null;
}

interface BonusWithRelations {
  id: string;
  created_at: string;
  challenges?: { description: string } | null;
}

export function useActivityFeed() {
  const supabase = createSupabaseBrowserClient();
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);

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

      const all: ActivityFeedItem[] = [
        ...(captures ?? []).map((c) => {
          const capture = c as CaptureWithRelations;
          return {
            ...c,
            type: "capture" as const,
            created_at: c.created_at,
            pubName: capture.pubs?.name || pubNameMap.get(capture.pub_id),
          };
        }),
        ...(attempts ?? []).map((a) => {
          const attempt = a as ChallengeAttemptWithRelations;
          return {
            ...a,
            type: "challenge" as const,
            created_at: a.created_at,
            pubName: attempt.challenges?.pubs?.name,
            challengeDescription: attempt.challenges?.description,
          };
        }),
        ...(bonus ?? []).map((b) => {
          const bonusPoint = b as BonusWithRelations;
          return {
            ...b,
            type: "bonus" as const,
            created_at: b.created_at,
            challengeDescription: bonusPoint.challenges?.description,
          };
        }),
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
