"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface GameData {
  pubs: any[];
  captures: any[];
  bonusPoints: any[];
  teams: any[];
  playersByTeam: Record<string, any[]>;
  challenges: any[];
  challengeAttempts: any[];
}

export function useRealtimeManager() {
  const [data, setData] = useState<GameData>({
    pubs: [],
    captures: [],
    bonusPoints: [],
    teams: [],
    playersByTeam: {},
    challenges: [],
    challengeAttempts: [],
  });

  const [isLoading, setIsLoading] = useState(true);

  // Initial data loading
  const loadInitialData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    
    try {
      // Load all data in parallel
      const [
        { data: pubs },
        { data: captures },
        { data: bonusPoints },
        { data: teams },
        { data: players },
        { data: challenges },
        { data: challengeAttempts },
      ] = await Promise.all([
        supabase.from("pubs").select("*, challenges(*)").order("name"),
        supabase.from("captures").select("*, teams(*), players(*), pubs(*)").order("created_at", { ascending: false }),
        supabase.from("bonus_points").select("*, teams(*), challenges(*), players(*)").order("created_at", { ascending: false }),
        supabase.from("teams").select("*").order("name"),
        supabase.from("players").select("id, nickname, team_id").order("nickname"),
        supabase.from("challenges").select("*").eq("type", "global"),
        supabase.from("challenge_attempts").select("*, teams(*), challenges(*), players(*)").order("created_at", { ascending: false }),
      ]);

      // Group players by team
      const playersByTeam = (players || []).reduce((acc: Record<string, any[]>, player: any) => {
        const teamId = String(player.team_id);
        if (!acc[teamId]) {
          acc[teamId] = [];
        }
        acc[teamId].push(player);
        return acc;
      }, {});

      setData({
        pubs: pubs || [],
        captures: captures || [],
        bonusPoints: bonusPoints || [],
        teams: teams || [],
        playersByTeam,
        challenges: challenges || [],
        challengeAttempts: challengeAttempts || [],
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading initial data:", error);
      setIsLoading(false);
    }
  }, []);

  // Realtime update handlers
  const handlePubUpdate = useCallback((payload: any) => {
    const updatedPub = payload.new;
    setData(prev => ({
      ...prev,
      pubs: prev.pubs.map(pub => 
        pub.id === updatedPub.id ? { ...pub, ...updatedPub } : pub
      )
    }));
  }, []);

  const handleCaptureInsert = useCallback(async (payload: any) => {
    const supabase = createSupabaseBrowserClient();
    
    // Fetch complete capture data with relations
    const { data: capture } = await supabase
      .from("captures")
      .select("*, teams(*), players(*), pubs(*)")
      .eq("id", payload.new.id)
      .single();

    if (capture) {
      setData(prev => ({
        ...prev,
        captures: [capture, ...prev.captures]
      }));
    }
  }, []);

  const handleBonusPointInsert = useCallback(async (payload: any) => {
    const supabase = createSupabaseBrowserClient();
    
    // Fetch complete bonus point data with relations
    const { data: bonusPoint } = await supabase
      .from("bonus_points")
      .select("*, teams(*), challenges(*), players(*)")
      .eq("id", payload.new.id)
      .single();

    if (bonusPoint) {
      setData(prev => ({
        ...prev,
        bonusPoints: [bonusPoint, ...prev.bonusPoints]
      }));
    }
  }, []);

  const handleChallengeUpdate = useCallback((payload: any) => {
    const updatedChallenge = payload.new;
    setData(prev => ({
      ...prev,
      challenges: prev.challenges.map(challenge => 
        challenge.id === updatedChallenge.id ? { ...challenge, ...updatedChallenge } : challenge
      )
    }));
  }, []);

  const handleChallengeAttemptInsert = useCallback(async (payload: any) => {
    const supabase = createSupabaseBrowserClient();
    
    // Filter out global challenge result attempts (they're shown via bonus_points instead)
    const attempt = payload.new;
    const { data: challenge } = await supabase
      .from("challenges")
      .select("type")
      .eq("id", attempt.challenge_id)
      .single();

    if (challenge?.type === "global" && attempt.step === "result") {
      return; // Skip global challenge results
    }

    // Fetch complete attempt data with relations
    const { data: challengeAttempt } = await supabase
      .from("challenge_attempts")
      .select("*, teams(*), challenges(*), players(*)")
      .eq("id", attempt.id)
      .single();

    if (challengeAttempt) {
      setData(prev => ({
        ...prev,
        challengeAttempts: [challengeAttempt, ...prev.challengeAttempts]
      }));
    }
  }, []);

  const handlePlayerUpdate = useCallback(async (payload: any) => {
    const supabase = createSupabaseBrowserClient();
    
    // Reload all players to update grouping
    const { data: players } = await supabase
      .from("players")
      .select("id, nickname, team_id")
      .order("nickname");

    if (players) {
      const playersByTeam = players.reduce((acc: Record<string, any[]>, player: any) => {
        const teamId = String(player.team_id);
        if (!acc[teamId]) {
          acc[teamId] = [];
        }
        acc[teamId].push(player);
        return acc;
      }, {});

      setData(prev => ({
        ...prev,
        playersByTeam
      }));
    }
  }, []);

  // Setup single multiplexed realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    // Load initial data
    loadInitialData();

    // Create single channel for all realtime updates
    const gameChannel = supabase
      .channel("game-realtime")
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "pubs" 
      }, handlePubUpdate)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "captures" 
      }, handleCaptureInsert)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "bonus_points" 
      }, handleBonusPointInsert)
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "challenges",
        filter: "type=eq.global"
      }, handleChallengeUpdate)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "challenge_attempts" 
      }, handleChallengeAttemptInsert)
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "players" 
      }, handlePlayerUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [loadInitialData, handlePubUpdate, handleCaptureInsert, handleBonusPointInsert, handleChallengeUpdate, handleChallengeAttemptInsert, handlePlayerUpdate]);

  return {
    ...data,
    isLoading,
    refetch: loadInitialData,
  };
}