"use client";

import { CaptureDialog } from "@/components/CaptureDialog";
import { useGameState } from "@/lib/hooks/useGameState";

export function PubList({
  pubs,
  teams,
}: {
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pubs: any[];
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teams: any[];
}) {
  function teamColor(teamId?: string) {
    return teams.find((t) => t.id === teamId)?.color;
  }

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
              ? teamColor(pub.controlling_team_id)
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
              disabled={pub.is_locked || !isActive}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
