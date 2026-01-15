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

export function calculateScores({
  teams,
  pubs,
  bonusPoints,
}: {
  teams: Team[];
  pubs: Pub[];
  bonusPoints: BonusPoint[];
}) {
  return teams
    .map((team) => {
      const controlled = pubs.filter(
        (p) => p.controlling_team_id === team.id
      ).length;

      const bonus = bonusPoints.filter((b) => b.team_id === team.id).length;

      return {
        ...team,
        score: controlled + bonus,
        controlled,
        bonus,
      };
    })
    .sort((a, b) => b.score - a.score);
}
