import { ChallengeDialog } from "./ChallengeDialog";
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
    <div className="space-y-2">
      <h2 className="font-bold">Pubs</h2>
      {pubs.map((pub) => (
        <div
          key={pub.id}
          className="flex justify-between items-center p-2 rounded border"
          style={{
            borderColor: pub.controlling_team_id
              ? teams.find((t) => t.id === pub.controlling_team_id)?.color
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
      ))}
    </div>
  );
}
