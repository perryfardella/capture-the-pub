"use client";

import { calculateScores } from "@/lib/game/scoreboard";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";

interface TeamScore {
  id: string;
  name: string;
  color: string;
  score: number;
  controlled: number;
  bonus: number;
}

interface PrevTeamState {
  score: number;
  rank: number;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Pub {
  id: string;
  controlling_team_id?: string | null;
}

interface BonusPoint {
  id: string;
  team_id: string;
}

interface Player {
  id: string;
  nickname: string;
  team_id: string;
}

export function Scoreboard({
  teams,
  pubs,
  bonusPoints,
  playersByTeam,
}: {
  teams: Team[];
  pubs: Pub[];
  bonusPoints: BonusPoint[];
  playersByTeam: Record<string, Player[]>;
}) {
  const scores = calculateScores({ teams, pubs, bonusPoints }) as TeamScore[];
  const maxScore =
    scores.length > 0 ? Math.max(...scores.map((s) => s.score), 1) : 1;

  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [animatingScores, setAnimatingScores] = useState<Set<string>>(
    new Set()
  );
  const [animatingRanks, setAnimatingRanks] = useState<Set<string>>(new Set());
  const prevScoresRef = useRef<Map<string, PrevTeamState>>(new Map());

  // Detect score and rank changes
  useEffect(() => {
    const prevScores = prevScoresRef.current;
    const newAnimatingScores = new Set<string>();
    const newAnimatingRanks = new Set<string>();

    scores.forEach((team, rank) => {
      const prev = prevScores.get(team.id);
      if (prev) {
        // Check if score changed
        if (prev.score !== team.score) {
          newAnimatingScores.add(team.id);
        }
        // Check if rank changed
        if (prev.rank !== rank) {
          newAnimatingRanks.add(team.id);
        }
      }
    });

    if (newAnimatingScores.size > 0) {
      queueMicrotask(() => {
        setAnimatingScores(newAnimatingScores);
        setTimeout(() => setAnimatingScores(new Set()), 500);
      });
    }

    if (newAnimatingRanks.size > 0) {
      queueMicrotask(() => {
        setAnimatingRanks(newAnimatingRanks);
        setTimeout(() => setAnimatingRanks(new Set()), 800);
      });
    }

    // Update previous state
    const newPrevScores = new Map<string, PrevTeamState>();
    scores.forEach((team, rank) => {
      newPrevScores.set(team.id, { score: team.score, rank });
    });
    prevScoresRef.current = newPrevScores;
  }, [scores]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return null;
  };

  if (scores.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-muted-foreground mb-2">No scores yet</p>
        <p className="text-sm text-muted-foreground">
          Start capturing pubs to see scores!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scores.map((team, i) => {
        const rankIcon = getRankIcon(i);
        const scorePercentage =
          maxScore > 0 ? (team.score / maxScore) * 100 : 0;
        const isTopThree = i < 3;
        const isScoreAnimating = animatingScores.has(team.id);
        const isRankAnimating = animatingRanks.has(team.id);

        return (
          <div
            key={team.id}
            className={`relative rounded-xl border-2 overflow-hidden transition-all duration-300 ${
              isTopThree ? "shadow-lg" : "shadow-sm"
            } ${isRankAnimating ? "animate-realtime-pulse" : ""}`}
            style={{
              borderColor: team.color,
              backgroundColor: team.color + "15",
              ["--flash-color" as string]: team.color + "40",
            }}
          >
            {/* Progress bar background */}
            <div
              className="absolute inset-0 opacity-10"
              style={{ backgroundColor: team.color }}
            />

            {/* Progress bar fill */}
            <div
              className="absolute bottom-0 left-0 h-1.5 transition-all duration-700 ease-out"
              style={{
                width: `${scorePercentage}%`,
                backgroundColor: team.color,
              }}
            />

            <div className="relative p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {rankIcon && (
                    <span
                      className={`text-3xl flex-shrink-0 ${
                        isRankAnimating ? "animate-bounce" : ""
                      }`}
                    >
                      {rankIcon}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg truncate">
                        {team.name}
                      </span>
                      {!rankIcon && (
                        <span className="text-muted-foreground text-sm font-medium">
                          #{i + 1}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end flex-shrink-0">
                  <div
                    className={`text-4xl font-black tabular-nums ${
                      isScoreAnimating ? "animate-number-pop" : ""
                    }`}
                    style={{ color: team.color }}
                  >
                    {team.score}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {team.score === 1 ? "point" : "points"}
                  </span>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge
                  variant="outline"
                  className={`gap-1.5 text-xs transition-all ${
                    isScoreAnimating ? "scale-105" : ""
                  }`}
                  style={{ borderColor: team.color + "40" }}
                >
                  <span>📍</span>
                  <span className="font-semibold">{team.controlled}</span>
                  <span className="text-muted-foreground">
                    {team.controlled === 1 ? "pub" : "pubs"}
                  </span>
                </Badge>

                {team.bonus > 0 && (
                  <Badge
                    variant="outline"
                    className={`gap-1.5 text-xs transition-all ${
                      isScoreAnimating ? "scale-105" : ""
                    }`}
                    style={{ borderColor: team.color + "40" }}
                  >
                    <span>⭐</span>
                    <span className="font-semibold">{team.bonus}</span>
                    <span className="text-muted-foreground">
                      {team.bonus === 1 ? "bonus" : "bonuses"}
                    </span>
                  </Badge>
                )}

                {team.bonus === 0 && team.controlled === 0 && (
                  <span className="text-xs text-muted-foreground italic">
                    No captures yet
                  </span>
                )}
              </div>

              {/* Players list */}
              {(() => {
                const teamId = String(team.id);
                const teamPlayers = playersByTeam[teamId];
                const playerCount = teamPlayers?.length ?? 0;
                const hasPlayers = playerCount > 0;

                return hasPlayers ? (
                  <div
                    className="border-t pt-3 mt-3"
                    style={{ borderColor: team.color + "30" }}
                  >
                    <button
                      onClick={() => toggleTeam(team.id)}
                      className="flex items-center justify-between w-full text-left group"
                    >
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        👥 {playerCount}{" "}
                        {playerCount === 1 ? "player" : "players"}
                      </span>
                      <span className="text-muted-foreground group-hover:text-foreground transition-all">
                        {expandedTeams.has(team.id) ? "▲" : "▼"}
                      </span>
                    </button>

                    {expandedTeams.has(team.id) && (
                      <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                        {teamPlayers.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-2 text-sm py-1.5 px-2.5 rounded-lg"
                            style={{ backgroundColor: team.color + "10" }}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: team.color }}
                            />
                            <span className="text-foreground">
                              {player.nickname}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
