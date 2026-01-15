"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Challenge {
  id: string;
  type: string;
  pub_id?: string | null;
  description?: string;
  is_consumed?: boolean;
  completed_by_team_id?: string | null;
}

interface Player {
  id: string;
  nickname: string;
  team_id: string;
}

interface Pub {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  controlling_team_id?: string | null;
  drink_count: number;
  is_locked: boolean;
  locked_by_team_id?: string | null;
  challenge?: Challenge | null;
}

interface Capture {
  id: string;
  team_id: string;
  player_id?: string | null;
  pub_id: string;
  drink_count: number;
  media_url?: string;
  created_at: string;
  teams?: Team | null;
  players?: Player | null;
}

interface BonusPoint {
  id: string;
  team_id: string;
  challenge_id: string;
  player_id?: string | null;
  created_at: string;
  teams?: Team | null;
  challenges?: Challenge | null;
  players?: Player | null;
}

export function useRealtimeGame() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [pubs, setPubs] = useState<Pub[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [bonusPoints, setBonusPoints] = useState<BonusPoint[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

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
            const newPub = payload.new as Pub;
            const { data: challenge } = await supabase
              .from("challenges")
              .select("*")
              .eq("type", "pub")
              .eq("pub_id", newPub.id)
              .single();
            setPubs((prev) => [
              ...prev,
              { ...newPub, challenge: challenge || null },
            ]);
          } else if (payload.eventType === "UPDATE") {
            const updatedPub = payload.new as Pub;
            setPubs((prev) =>
              prev.map((p) =>
                p.id === updatedPub.id
                  ? { ...updatedPub, challenge: p.challenge }
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
            const newCapture = payload.new as Capture;
            const [{ data: teamData }, { data: playerData }] =
              await Promise.all([
                supabase
                  .from("teams")
                  .select("*")
                  .eq("id", newCapture.team_id)
                  .single(),
                newCapture.player_id
                  ? supabase
                      .from("players")
                      .select("*")
                      .eq("id", newCapture.player_id)
                      .single()
                  : Promise.resolve({ data: null }),
              ]);
            setCaptures((prev) => [
              ...prev,
              {
                ...newCapture,
                teams: teamData || null,
                players: playerData || null,
              },
            ]);
          } else if (payload.eventType === "UPDATE") {
            // Fetch team and player data for the updated capture
            const updatedCapture = payload.new as Capture;
            const [{ data: teamData }, { data: playerData }] =
              await Promise.all([
                supabase
                  .from("teams")
                  .select("*")
                  .eq("id", updatedCapture.team_id)
                  .single(),
                updatedCapture.player_id
                  ? supabase
                      .from("players")
                      .select("*")
                      .eq("id", updatedCapture.player_id)
                      .single()
                  : Promise.resolve({ data: null }),
              ]);
            setCaptures((prev) =>
              prev.map((c) =>
                c.id === updatedCapture.id
                  ? {
                      ...updatedCapture,
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
            const newBonus = payload.new as BonusPoint;
            const [
              { data: teamData },
              { data: challengeData },
              { data: playerData },
            ] = await Promise.all([
              supabase
                .from("teams")
                .select("*")
                .eq("id", newBonus.team_id)
                .single(),
              supabase
                .from("challenges")
                .select("*")
                .eq("id", newBonus.challenge_id)
                .single(),
              newBonus.player_id
                ? supabase
                    .from("players")
                    .select("*")
                    .eq("id", newBonus.player_id)
                    .single()
                : Promise.resolve({ data: null }),
            ]);
            setBonusPoints((prev) => [
              ...prev,
              {
                ...newBonus,
                teams: teamData || null,
                challenges: challengeData || null,
                players: playerData || null,
              },
            ]);
          } else if (payload.eventType === "UPDATE") {
            // Fetch team, challenge, and player data for the updated bonus point
            const updatedBonus = payload.new as BonusPoint;
            const [
              { data: teamData },
              { data: challengeData },
              { data: playerData },
            ] = await Promise.all([
              supabase
                .from("teams")
                .select("*")
                .eq("id", updatedBonus.team_id)
                .single(),
              supabase
                .from("challenges")
                .select("*")
                .eq("id", updatedBonus.challenge_id)
                .single(),
              updatedBonus.player_id
                ? supabase
                    .from("players")
                    .select("*")
                    .eq("id", updatedBonus.player_id)
                    .single()
                : Promise.resolve({ data: null }),
            ]);
            setBonusPoints((prev) =>
              prev.map((b) =>
                b.id === updatedBonus.id
                  ? {
                      ...updatedBonus,
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
