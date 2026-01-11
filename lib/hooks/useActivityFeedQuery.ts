"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect } from "react";

export function useActivityFeedQuery() {
  const queryClient = useQueryClient();
  const supabase = createSupabaseBrowserClient();

  // Query for activity feed data
  const {
    data: feed = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: async () => {
      const [{ data: captures }, { data: attempts }, { data: bonus }, { data: pubs }] =
        await Promise.all([
          supabase.from("captures").select("*, teams(*), players(*), pubs(name)"),
          supabase.from("challenge_attempts").select("*, teams(*), players(*), challenges(pub_id, description, pubs(name))"),
          supabase.from("bonus_points").select("*, teams(*), players(*), challenges(description)"),
          supabase.from("pubs").select("id, name"),
        ]);

      // Create a lookup map for pub names
      const pubNameMap = new Map((pubs ?? []).map(p => [p.id, p.name]));

      const processedChallengeAttempts = (attempts ?? [])
        .filter((attempt) => {
          // Filter out global challenge result attempts (shown via bonus_points)
          const challenge = attempt.challenges;
          return !(challenge?.type === "global" && attempt.step === "result");
        })
        .map((attempt) => {
          const challenge = attempt.challenges;
          const pub = challenge?.pub_id
            ? pubs?.find((p) => p.id === challenge.pub_id)
            : null;
          return {
            ...attempt,
            type: "challenge",
            pubName: pub?.name || null,
            challengeDescription: challenge?.description || null,
          };
        });

      const all = [
        ...(captures ?? []).map((c) => ({
          ...c,
          type: "capture",
          created_at: c.created_at,
          pubName: (c as any).pubs?.name || pubNameMap.get(c.pub_id),
        })),
        ...processedChallengeAttempts,
        ...(bonus ?? []).map((b) => ({
          ...b,
          type: "bonus",
          created_at: b.created_at,
          challengeDescription: (b as any).challenges?.description,
        })),
      ];

      return all.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    // Refetch every 30 seconds to get new data
    refetchInterval: 30000,
    // Keep data fresh for 1 minute
    staleTime: 60000,
  });

  // Setup realtime subscriptions to invalidate cache on changes
  useEffect(() => {
    const channels = [
      supabase
        .channel("activity-feed-captures")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "captures" },
          () => {
            // Invalidate the query to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
          }
        )
        .subscribe(),
      supabase
        .channel("activity-feed-challenges")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "challenge_attempts" },
          () => {
            queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
          }
        )
        .subscribe(),
      supabase
        .channel("activity-feed-bonus")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bonus_points" },
          () => {
            queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
          }
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [queryClient, supabase]);

  return {
    feed,
    isLoading,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["activity-feed"] }),
  };
}