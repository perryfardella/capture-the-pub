"use client";

import { calculateScores } from "@/lib/game/scoreboard";

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

  return (
    <div className="space-y-2">
      <h2 className="font-bold">Scoreboard</h2>

      {scores.map((team, i) => (
        <div
          key={team.id}
          className="flex justify-between items-center p-2 rounded"
          style={{ backgroundColor: team.color + "22" }}
        >
          <span>
            {i + 1}. {team.name}
          </span>
          <span className="font-bold">{team.score}</span>
        </div>
      ))}
    </div>
  );
}
