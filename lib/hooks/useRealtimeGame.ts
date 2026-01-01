"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useRealtimeGame() {
  const supabase = createSupabaseBrowserClient();

  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pubs, setPubs] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [captures, setCaptures] = useState<any[]>([]);
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bonusPoints, setBonusPoints] = useState<any[]>([]);

  // Initial load
  useEffect(() => {
    async function load() {
      const [{ data: pubsData }, { data: capturesData }, { data: bonus }] =
        await Promise.all([
          supabase.from("pubs").select("*"),
          supabase.from("captures").select("*"),
          supabase.from("bonus_points").select("*"),
        ]);

      setPubs(pubsData ?? []);
      setCaptures(capturesData ?? []);
      setBonusPoints(bonus ?? []);
    }

    load();
  }, []);

  // Subscribe to pubs
  useEffect(() => {
    const pubsChannel = supabase
      .channel("realtime-pubs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pubs" },
        (payload) => {
          setPubs((prev) =>
            prev.map((p) =>
              p.id === (payload.new as { id: string }).id ? payload.new : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pubsChannel);
    };
  }, []);

  // Subscribe to captures
  useEffect(() => {
    const capturesChannel = supabase
      .channel("realtime-captures")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "captures" },
        (payload) => {
          setCaptures((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(capturesChannel);
    };
  }, []);

  // Subscribe to bonus points
  useEffect(() => {
    const bonusChannel = supabase
      .channel("realtime-bonus")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bonus_points" },
        (payload) => {
          setBonusPoints((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bonusChannel);
    };
  }, []);

  return { pubs, captures, bonusPoints };
}
