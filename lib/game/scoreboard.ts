export function calculateScores({
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
