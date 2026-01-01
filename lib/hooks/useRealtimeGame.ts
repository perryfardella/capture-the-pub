"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useRealtimeGame() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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
      const [
        { data: pubsData, error: pubsError },
        { data: capturesData, error: capturesError },
        { data: bonus, error: bonusError },
      ] = await Promise.all([
        supabase.from("pubs").select("*"),
        supabase.from("captures").select("*"),
        supabase.from("bonus_points").select("*"),
      ]);

      if (pubsError) {
        console.error("Error loading pubs:", pubsError);
      } else {
        setPubs(pubsData ?? []);
      }

      if (capturesError) {
        console.error("Error loading captures:", capturesError);
      } else {
        setCaptures(capturesData ?? []);
      }

      if (bonusError) {
        console.error("Error loading bonus points:", bonusError);
      } else {
        setBonusPoints(bonus ?? []);
      }
    }

    load();
  }, [supabase]);

  // Subscribe to pubs
  useEffect(() => {
    const pubsChannel = supabase
      .channel("realtime-pubs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pubs" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPubs((prev) => [...prev, payload.new as any]);
          } else if (payload.eventType === "UPDATE") {
            setPubs((prev) =>
              prev.map((p) =>
                p.id === (payload.new as { id: string }).id ? payload.new : p
              )
            );
          } else if (payload.eventType === "DELETE") {
            setPubs((prev) =>
              prev.filter((p) => p.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to pubs changes");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to pubs changes");
        }
      });

    return () => {
      supabase.removeChannel(pubsChannel);
    };
  }, [supabase]);

  // Subscribe to captures
  useEffect(() => {
    const capturesChannel = supabase
      .channel("realtime-captures")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "captures" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCaptures((prev) => [...prev, payload.new as any]);
          } else if (payload.eventType === "UPDATE") {
            setCaptures((prev) =>
              prev.map((c) =>
                c.id === (payload.new as { id: string }).id ? payload.new : c
              )
            );
          } else if (payload.eventType === "DELETE") {
            setCaptures((prev) =>
              prev.filter((c) => c.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to captures changes");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to captures changes");
        }
      });

    return () => {
      supabase.removeChannel(capturesChannel);
    };
  }, [supabase]);

  // Subscribe to bonus points
  useEffect(() => {
    const bonusChannel = supabase
      .channel("realtime-bonus")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bonus_points" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBonusPoints((prev) => [...prev, payload.new as any]);
          } else if (payload.eventType === "UPDATE") {
            setBonusPoints((prev) =>
              prev.map((b) =>
                b.id === (payload.new as { id: string }).id ? payload.new : b
              )
            );
          } else if (payload.eventType === "DELETE") {
            setBonusPoints((prev) =>
              prev.filter((b) => b.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to bonus_points changes");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to bonus_points changes");
        }
      });

    return () => {
      supabase.removeChannel(bonusChannel);
    };
  }, [supabase]);

  return { pubs, captures, bonusPoints };
}
