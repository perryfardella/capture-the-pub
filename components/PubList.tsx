"use client";

import { ChallengeDialog } from "./ChallengeDialog";
import { CaptureDialog } from "./CaptureDialog";
import { useGameState } from "@/lib/hooks/useGameState";

interface Team {
  id: string;
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
  challenge?: Challenge;
}

interface PubListProps {
  pubs: Pub[];
  teams: Team[];
}

export function PubList({ pubs, teams }: PubListProps) {
  const { isActive } = useGameState();

  return (
    <div className="space-y-3">
      {pubs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pubs available</p>
      ) : (
        <div className="space-y-2">
          {pubs.map((pub) => {
            const controllingTeam = pub.controlling_team_id
              ? teams.find((t) => t.id === pub.controlling_team_id)
              : undefined;

            return (
              <div
                key={pub.id}
                className="flex justify-between items-center p-3 rounded border"
                style={{
                  borderColor: controllingTeam?.color,
                  backgroundColor: controllingTeam?.color
                    ? controllingTeam.color + "22"
                    : undefined,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {pub.is_locked && <span>🔒</span>}
                    <p className="font-medium">{pub.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Drinks: <strong>{pub.drink_count}</strong>
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <CaptureDialog
                    pubId={pub.id}
                    pubName={pub.name}
                    currentDrinkCount={pub.drink_count}
                    disabled={pub.is_locked || !isActive}
                  />

                  {pub.challenge && (
                    <ChallengeDialog
                      challengeId={pub.challenge.id}
                      challengeType="pub"
                      pubId={pub.id}
                      pubName={pub.name}
                      description={pub.challenge.description}
                      disabled={pub.is_locked || !isActive}
                      onSuccess={() => {}}
                    />
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
