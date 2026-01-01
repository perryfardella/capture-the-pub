import { ChallengeDialog } from "./ChallengeDialog";
import { CaptureDialog } from "./CaptureDialog";
import { useGameState } from "@/lib/hooks/useGameState";

interface Team {
  id: string;
  color: string;
}

interface Challenge {
  id: string;
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
      <h2 className="text-lg font-bold">Pubs</h2>
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
          <div>
            <p className="font-medium">{pub.name}</p>
            <p className="text-xs text-muted-foreground">
              Drinks: {pub.drink_count}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pub.is_locked && <span>🔒</span>}

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
                disabled={pub.is_locked || !isActive}
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
