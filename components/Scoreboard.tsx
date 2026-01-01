"use client";

import { calculateScores } from "@/lib/game/scoreboard";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function Scoreboard({
  teams,
  pubs,
  bonusPoints,
}: {
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teams: any[];
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pubs: any[];
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bonusPoints: any[];
}) {
  const scores = calculateScores({ teams, pubs, bonusPoints });
  const maxScore = scores.length > 0 ? Math.max(...scores.map((s) => s.score), 1) : 1;
  
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [playersByTeam, setPlayersByTeam] = useState<Record<string, any[]>>({});
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadPlayers() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("players")
        .select("id, nickname, team_id")
        .order("nickname");
      
      if (data) {
        const grouped = data.reduce((acc, player) => {
          if (!acc[player.team_id]) {
            acc[player.team_id] = [];
          }
          acc[player.team_id].push(player);
          return acc;
        }, {} as Record<string, typeof data>);
        setPlayersByTeam(grouped);
      }
    }

    loadPlayers();
  }, []);

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

  return (
    <div className="space-y-4">
      {scores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No scores yet</p>
          <p className="text-sm text-muted-foreground">
            Start capturing pubs to see scores!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map((team, i) => {
            const rankIcon = getRankIcon(i);
            const scorePercentage = maxScore > 0 ? (team.score / maxScore) * 100 : 0;
            const isTopThree = i < 3;

            return (
              <div
                key={team.id}
                className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                  isTopThree ? "shadow-lg" : "shadow-sm"
                }`}
                style={{
                  borderColor: team.color,
                  backgroundColor: team.color + "15",
                }}
              >
                {/* Progress bar background */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{ backgroundColor: team.color }}
                />
                
                {/* Progress bar fill */}
                <div
                  className="absolute bottom-0 left-0 h-1 transition-all duration-500"
                  style={{
                    width: `${scorePercentage}%`,
                    backgroundColor: team.color,
                  }}
                />

                <div className="relative p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {rankIcon && (
                        <span className="text-2xl flex-shrink-0">{rankIcon}</span>
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
                        className="text-3xl font-bold"
                        style={{ color: team.color }}
                      >
                        {team.score}
                      </div>
                      <span className="text-xs text-muted-foreground">points</span>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <Badge
                      variant="outline"
                      className="gap-1.5 text-xs"
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
                        className="gap-1.5 text-xs"
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
                      <span className="text-xs text-muted-foreground">
                        No captures yet
                      </span>
                    )}
                  </div>

                  {/* Players list */}
                  {playersByTeam[team.id] && playersByTeam[team.id].length > 0 && (
                    <div className="border-t pt-3 mt-3" style={{ borderColor: team.color + "30" }}>
                      <button
                        onClick={() => toggleTeam(team.id)}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <span className="text-sm font-medium text-muted-foreground">
                          👥 {playersByTeam[team.id].length}{" "}
                          {playersByTeam[team.id].length === 1 ? "player" : "players"}
                        </span>
                        <span className="text-muted-foreground">
                          {expandedTeams.has(team.id) ? "▲" : "▼"}
                        </span>
                      </button>
                      
                      {expandedTeams.has(team.id) && (
                        <div className="mt-2 space-y-1.5">
                          {playersByTeam[team.id].map((player) => (
                            <div
                              key={player.id}
                              className="flex items-center gap-2 text-sm py-1 px-2 rounded"
                              style={{ backgroundColor: team.color + "10" }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                              <span className="text-foreground">{player.nickname}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
