"use client";

import { useEffect, useRef, useState } from "react";
import { ChallengeDialog } from "./ChallengeDialog";
import { CaptureDialog } from "./CaptureDialog";
import { useGameState } from "@/lib/hooks/useGameState";

interface Team {
  id: string;
  name?: string;
  color: string;
}

interface Challenge {
  id: string;
  description?: string;
}

interface Pub {
  id: string;
  name: string;
  drink_count: number;
  controlling_team_id?: string;
  is_locked: boolean;
  latitude?: number;
  longitude?: number;
  challenge?: Challenge;
}

interface PubListProps {
  pubs: Pub[];
  teams: Team[];
  playerTeamId?: string;
}

interface PubState {
  controlling_team_id?: string;
  drink_count: number;
  is_locked: boolean;
}

export function PubList({ pubs, teams, playerTeamId }: PubListProps) {
  const { isActive } = useGameState();
  const [animatingPubs, setAnimatingPubs] = useState<Set<string>>(new Set());
  const [animatingDrinks, setAnimatingDrinks] = useState<Set<string>>(new Set());
  const prevPubsRef = useRef<Map<string, PubState>>(new Map());

  // Detect changes and trigger animations
  useEffect(() => {
    const prevPubs = prevPubsRef.current;
    const newAnimatingPubs = new Set<string>();
    const newAnimatingDrinks = new Set<string>();

    for (const pub of pubs) {
      const prev = prevPubs.get(pub.id);
      if (prev) {
        // Check if controlling team changed
        if (prev.controlling_team_id !== pub.controlling_team_id) {
          newAnimatingPubs.add(pub.id);
        }
        // Check if drink count changed
        if (prev.drink_count !== pub.drink_count) {
          newAnimatingDrinks.add(pub.id);
        }
        // Check if locked state changed
        if (prev.is_locked !== pub.is_locked) {
          newAnimatingPubs.add(pub.id);
        }
      }
    }

    if (newAnimatingPubs.size > 0) {
      setAnimatingPubs(newAnimatingPubs);
      // Clear after animation completes
      setTimeout(() => setAnimatingPubs(new Set()), 800);
    }

    if (newAnimatingDrinks.size > 0) {
      setAnimatingDrinks(newAnimatingDrinks);
      // Clear after animation completes
      setTimeout(() => setAnimatingDrinks(new Set()), 400);
    }

    // Update previous state
    const newPrevPubs = new Map<string, PubState>();
    for (const pub of pubs) {
      newPrevPubs.set(pub.id, {
        controlling_team_id: pub.controlling_team_id,
        drink_count: pub.drink_count,
        is_locked: pub.is_locked,
      });
    }
    prevPubsRef.current = newPrevPubs;
  }, [pubs]);

  if (pubs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🍺</div>
        <p className="text-muted-foreground">No pubs available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pubs.map((pub) => {
        const controllingTeam = pub.controlling_team_id
          ? teams.find((t) => t.id === pub.controlling_team_id)
          : undefined;

        const isAnimating = animatingPubs.has(pub.id);
        const isDrinkAnimating = animatingDrinks.has(pub.id);

        return (
          <div
            key={pub.id}
            className={`relative rounded-xl border-2 overflow-hidden transition-all duration-300 ${
              isAnimating ? "animate-realtime-flash" : ""
            } ${pub.is_locked ? "opacity-75" : ""}`}
            style={{
              borderColor: controllingTeam?.color || "var(--border)",
              backgroundColor: controllingTeam?.color
                ? controllingTeam.color + "15"
                : undefined,
              // Set CSS variable for flash color
              ["--flash-color" as string]: controllingTeam?.color
                ? controllingTeam.color + "60"
                : undefined,
            }}
          >
            {/* Team color indicator bar */}
            {controllingTeam && (
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: controllingTeam.color }}
              />
            )}

            <div className="p-4 pt-3">
              <div className="flex items-start justify-between gap-3">
                {/* Pub info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {pub.is_locked && (
                      <span className="text-lg" title="Locked">
                        🔒
                      </span>
                    )}
                    <h3 className="font-semibold text-lg truncate">{pub.name}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Drinks:</span>
                      <span
                        className={`font-bold text-base ${
                          isDrinkAnimating ? "animate-number-pop text-primary" : ""
                        }`}
                      >
                        {pub.drink_count}
                      </span>
                    </div>

                    {controllingTeam && (
                      <div
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: controllingTeam.color + "20",
                          color: controllingTeam.color,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: controllingTeam.color }}
                        />
                        {controllingTeam.name || "Team"}
                      </div>
                    )}

                    {!controllingTeam && !pub.is_locked && (
                      <span className="text-xs text-muted-foreground italic">
                        Unclaimed
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  {!pub.is_locked && (
                    <CaptureDialog
                      pubId={pub.id}
                      pubName={pub.name}
                      currentDrinkCount={pub.drink_count}
                      disabled={!isActive}
                      triggerClassName="min-w-[90px]"
                    />
                  )}

                  {pub.challenge && !pub.is_locked && (
                    <ChallengeDialog
                      challengeId={pub.challenge.id}
                      challengeType="pub"
                      pubId={pub.id}
                      pubName={pub.name}
                      description={pub.challenge.description}
                      disabled={!isActive || playerTeamId !== pub.controlling_team_id}
                      onSuccess={() => {}}
                      playerTeamId={playerTeamId}
                    />
                  )}

                  {pub.is_locked && (
                    <div className="text-center px-3 py-2 text-xs text-muted-foreground bg-muted rounded-lg">
                      Locked
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
