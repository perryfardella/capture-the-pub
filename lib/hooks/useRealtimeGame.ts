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
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);

  // Initial load
  useEffect(() => {
    async function load() {
      const [
        { data: pubsData, error: pubsError },
        { data: capturesData, error: capturesError },
        { data: bonus, error: bonusError },
        { data: teamsData, error: teamsError },
        { data: challengesData, error: challengesError },
      ] = await Promise.all([
        supabase.from("pubs").select("*"),
        supabase.from("captures").select("*, players(*)"),
        supabase.from("bonus_points").select("*, challenges(*), players(*)"),
        supabase.from("teams").select("*"),
        supabase.from("challenges").select("*").eq("type", "pub"),
      ]);

      if (pubsError) {
        console.error("Error loading pubs:", pubsError);
      } else {
        // Join challenges with pubs
        const pubsWithChallenges = (pubsData ?? []).map((pub) => {
          const challenge = (challengesData ?? []).find(
            (c) => c.pub_id === pub.id
          );
          return { ...pub, challenge: challenge || null };
        });
        setPubs(pubsWithChallenges);
      }

      if (challengesError) {
        console.error("Error loading challenges:", challengesError);
      }

      if (capturesError) {
        console.error("Error loading captures:", capturesError);
      } else {
        // Manually join team data (player data is already joined via select)
        const capturesWithTeams = (capturesData ?? []).map((capture) => {
          const team = (teamsData ?? []).find((t) => t.id === capture.team_id);
          return { ...capture, teams: team };
        });
        setCaptures(capturesWithTeams);
      }

      if (bonusError) {
        console.error("Error loading bonus points:", bonusError);
      } else {
        // Manually join team data (challenge and player data are already joined via select)
        const bonusWithTeams = (bonus ?? []).map((bp) => {
          const team = (teamsData ?? []).find((t) => t.id === bp.team_id);
          return { ...bp, teams: team };
        });
        setBonusPoints(bonusWithTeams);
      }

      if (teamsError) {
        console.error("Error loading teams:", teamsError);
      } else {
        setTeams(teamsData ?? []);
      }
    }

    load();
  }, [supabase]);

  // Re-join teams when teams data changes
  useEffect(() => {
    if (teams.length > 0) {
      setCaptures((prev) =>
        prev.map((capture) => {
          if (capture.teams) return capture; // Already has team data
          const team = teams.find((t) => t.id === capture.team_id);
          return { ...capture, teams: team || null };
        })
      );
      setBonusPoints((prev) =>
        prev.map((bp) => {
          if (bp.teams) return bp; // Already has team data
          const team = teams.find((t) => t.id === bp.team_id);
          return { ...bp, teams: team || null };
        })
      );
    }
  }, [teams]);

  // Subscribe to pubs
  useEffect(() => {
    const pubsChannel = supabase
      .channel("realtime-pubs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pubs" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch challenge for new pub
            const { data: challenge } = await supabase
              .from("challenges")
              .select("*")
              .eq("type", "pub")
              .eq("pub_id", (payload.new as any).id)
              .single();
            setPubs((prev) => [
              ...prev,
              { ...payload.new, challenge: challenge || null } as any,
            ]);
          } else if (payload.eventType === "UPDATE") {
            setPubs((prev) =>
              prev.map((p) =>
                p.id === (payload.new as { id: string }).id
                  ? { ...payload.new, challenge: p.challenge }
                  : p
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
        if (status === "CHANNEL_ERROR") {
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
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch team and player data for the new capture
            const [{ data: teamData }, { data: playerData }] =
              await Promise.all([
                supabase
                  .from("teams")
                  .select("*")
                  .eq("id", (payload.new as any).team_id)
                  .single(),
                (payload.new as any).player_id
                  ? supabase
                      .from("players")
                      .select("*")
                      .eq("id", (payload.new as any).player_id)
                      .single()
                  : Promise.resolve({ data: null }),
              ]);
            setCaptures((prev) => [
              ...prev,
              {
                ...payload.new,
                teams: teamData || null,
                players: playerData || null,
              } as any,
            ]);
          } else if (payload.eventType === "UPDATE") {
            // Fetch team and player data for the updated capture
            const [{ data: teamData }, { data: playerData }] =
              await Promise.all([
                supabase
                  .from("teams")
                  .select("*")
                  .eq("id", (payload.new as any).team_id)
                  .single(),
                (payload.new as any).player_id
                  ? supabase
                      .from("players")
                      .select("*")
                      .eq("id", (payload.new as any).player_id)
                      .single()
                  : Promise.resolve({ data: null }),
              ]);
            setCaptures((prev) =>
              prev.map((c) =>
                c.id === (payload.new as { id: string }).id
                  ? {
                      ...payload.new,
                      teams: teamData || null,
                      players: playerData || null,
                    }
                  : c
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
        if (status === "CHANNEL_ERROR") {
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
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch team, challenge, and player data for the new bonus point
            const [
              { data: teamData },
              { data: challengeData },
              { data: playerData },
            ] = await Promise.all([
              supabase
                .from("teams")
                .select("*")
                .eq("id", (payload.new as any).team_id)
                .single(),
              supabase
                .from("challenges")
                .select("*")
                .eq("id", (payload.new as any).challenge_id)
                .single(),
              (payload.new as any).player_id
                ? supabase
                    .from("players")
                    .select("*")
                    .eq("id", (payload.new as any).player_id)
                    .single()
                : Promise.resolve({ data: null }),
            ]);
            setBonusPoints((prev) => [
              ...prev,
              {
                ...payload.new,
                teams: teamData || null,
                challenges: challengeData || null,
                players: playerData || null,
              } as any,
            ]);
          } else if (payload.eventType === "UPDATE") {
            // Fetch team, challenge, and player data for the updated bonus point
            const [
              { data: teamData },
              { data: challengeData },
              { data: playerData },
            ] = await Promise.all([
              supabase
                .from("teams")
                .select("*")
                .eq("id", (payload.new as any).team_id)
                .single(),
              supabase
                .from("challenges")
                .select("*")
                .eq("id", (payload.new as any).challenge_id)
                .single(),
              (payload.new as any).player_id
                ? supabase
                    .from("players")
                    .select("*")
                    .eq("id", (payload.new as any).player_id)
                    .single()
                : Promise.resolve({ data: null }),
            ]);
            setBonusPoints((prev) =>
              prev.map((b) =>
                b.id === (payload.new as { id: string }).id
                  ? {
                      ...payload.new,
                      teams: teamData || null,
                      challenges: challengeData || null,
                      players: playerData || null,
                    }
                  : b
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
        if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to bonus_points changes");
        }
      });

    return () => {
      supabase.removeChannel(bonusChannel);
    };
  }, [supabase]);

  return { pubs, captures, bonusPoints, teams };
}
