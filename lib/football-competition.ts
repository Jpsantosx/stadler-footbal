import { ensureManagement } from "./football-career.ts";
import {
  type CareerState,
  type CompetitionMode,
  type CupScope,
  FORMATIONS,
  LEAGUES,
  type LeagueId,
  type LeagueRow,
  type MarketEntry,
  type SquadSeed,
  TEAMS,
  type Team,
  clamp,
  lineupOverall,
  rosterFor,
  seedFromName,
} from "./football-engine.ts";
export function leagueFor(leagueId: LeagueId) {
  return LEAGUES.find((league) => league.id === leagueId) ?? LEAGUES[0];
}

export function leagueNameFor(leagueId: LeagueId) {
  return leagueFor(leagueId).name;
}

export function cupNameFor(team: Team, scope: CupScope) {
  if (scope === "world") return "Mundial de Clubes";
  return team.leagueId === "brasileirao" ? "Libertadores" : "Champions League";
}

export function leagueTeamsFor(leagueId: LeagueId) {
  return TEAMS.filter((team) => team.leagueId === leagueId).sort(
    (first, second) =>
      lineupOverall(second) - lineupOverall(first) ||
      first.name.localeCompare(second.name, "pt-BR"),
  );
}

export function competitionPoolFor(
  homeTeam: Team,
  mode: CompetitionMode,
  scope: CupScope,
  selectedLeagueId: LeagueId = homeTeam.leagueId,
) {
  if (mode === "friendly") return TEAMS;
  if (mode === "league" || mode === "career") {
    return leagueTeamsFor(selectedLeagueId);
  }
  if (scope === "world") return TEAMS;
  return TEAMS.filter((team) =>
    homeTeam.leagueId === "brasileirao"
      ? team.leagueId === "brasileirao"
      : team.leagueId !== "brasileirao",
  );
}

export function createLeagueRows(leagueId: LeagueId): LeagueRow[] {
  return leagueTeamsFor(leagueId).map((candidate) => ({
    teamId: candidate.id,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
}

export function applyFixture(
  rows: LeagueRow[],
  homeId: string,
  awayId: string,
  homeGoals: number,
  awayGoals: number,
) {
  const next = rows.map((row) => ({ ...row }));
  const ensureRow = (teamId: string) => {
    let row = next.find((candidate) => candidate.teamId === teamId);
    if (!row) {
      row = {
        teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      };
      next.push(row);
    }
    return row;
  };
  const home = ensureRow(homeId);
  const away = ensureRow(awayId);
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;
  if (homeGoals > awayGoals) {
    home.wins += 1;
    away.losses += 1;
    home.points += 3;
  } else if (awayGoals > homeGoals) {
    away.wins += 1;
    home.losses += 1;
    away.points += 3;
  } else {
    home.draws += 1;
    away.draws += 1;
    home.points += 1;
    away.points += 1;
  }
  return next;
}

export function createLeagueSchedule(ids: string[]) {
  const rotation = [...ids].sort();
  if (rotation.length % 2) rotation.push("__bye__");
  const first: Array<Array<{ homeId: string; awayId: string }>> = [];
  for (let round = 0; round < rotation.length - 1; round++) {
    const fixtures = [];
    for (let i = 0; i < rotation.length / 2; i++) {
      const a = rotation[i],
        b = rotation[rotation.length - 1 - i];
      if (a !== "__bye__" && b !== "__bye__")
        fixtures.push(
          round % 2 ? { homeId: b, awayId: a } : { homeId: a, awayId: b },
        );
    }
    first.push(fixtures);
    rotation.splice(1, 0, rotation.pop()!);
  }
  return [
    ...first,
    ...first.map((round) =>
      round.map((f) => ({ homeId: f.awayId, awayId: f.homeId })),
    ),
  ];
}
export function nextLeagueFixture(rows: LeagueRow[], clubId: string) {
  const round = rows.find((r) => r.teamId === clubId)?.played ?? 0;
  return createLeagueSchedule(rows.map((r) => r.teamId))[round]?.find(
    (f) => f.homeId === clubId || f.awayId === clubId,
  );
}

export function simulateLeagueRound(
  rows: LeagueRow[],
  homeId: string,
  awayId: string,
  homeGoals: number,
  awayGoals: number,
) {
  if (
    !rows.some((row) => row.teamId === homeId) ||
    !rows.some((row) => row.teamId === awayId)
  ) {
    return rows;
  }
  const fixture = nextLeagueFixture(rows, homeId);
  if (!fixture || ![fixture.homeId, fixture.awayId].includes(awayId))
    return rows;
  let next = applyFixture(rows, homeId, awayId, homeGoals, awayGoals);
  const roundIndex = rows.find((r) => r.teamId === homeId)?.played ?? 0;
  const others = createLeagueSchedule(rows.map((r) => r.teamId))[
    roundIndex
  ].filter((f) => f.homeId !== homeId && f.awayId !== homeId);
  const simulatedGoals = (
    team: Team | undefined,
    rival: Team | undefined,
    salt: number,
  ) => {
    if (!team || !rival) return 0;
    const qualityEdge = (lineupOverall(team) - lineupOverall(rival)) * 0.12;
    const roll = (seedFromName(`${team.id}-${rival.id}-${salt}`) % 1000) / 999;
    return Math.round(clamp(0.35 + roll * 2.35 + qualityEdge, 0, 5));
  };
  for (const [index, fixture] of others.entries()) {
    const first = TEAMS.find((t) => t.id === fixture.homeId),
      second = TEAMS.find((t) => t.id === fixture.awayId);
    next = applyFixture(
      next,
      fixture.homeId,
      fixture.awayId,
      simulatedGoals(first, second, roundIndex + index + 1),
      simulatedGoals(second, first, roundIndex * 2 + index + 1),
    );
  }
  return next;
}

export function sortedLeagueRows(rows: LeagueRow[]) {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
}

export function createCareer(team: Team): CareerState {
  return ensureManagement({
    clubId: team.id,
    season: 1,
    budget: Math.round(55 + Math.max(0, lineupOverall(team) - 78) * 10.5),
    fans: 250_000,
    squad: rosterFor(team).map((seed) => [...seed] as SquadSeed),
    history: [],
    transactions: [],
  });
}

export function marketPrice(overall: number) {
  return Math.max(8, Math.round((overall - 65) ** 2 / 6));
}

export function squadPlayerKey(seed: SquadSeed) {
  return `${seed[0].trim().toLocaleLowerCase("pt-BR")}-${seed[1]}`;
}

export function completePurchase(current: CareerState, entry: MarketEntry) {
  const price = marketPrice(entry.seed[2]);
  if (
    current.budget < price ||
    current.squad.some(
      (player) => squadPlayerKey(player) === squadPlayerKey(entry.seed),
    )
  ) {
    return current;
  }
  const signedPlayer: SquadSeed = [
    entry.seed[0],
    entry.seed[1],
    entry.seed[2],
    entry.seed[3] ?? "MF",
  ];
  return {
    ...current,
    budget: current.budget - price,
    squad: [...current.squad, signedPlayer],
    transactions: [
      `Comprou ${entry.seed[0]} (${entry.seed[2]} OVR) por €${price} mi`,
      ...(current.transactions ?? []),
    ].slice(0, 8),
  };
}

export function completeSale(current: CareerState, player: SquadSeed) {
  if (current.squad.length <= 8) return current;
  const playerKey = squadPlayerKey(player);
  const saleIndex = current.squad.findIndex(
    (candidate) => squadPlayerKey(candidate) === playerKey,
  );
  if (saleIndex < 0) return current;
  const value = Math.max(4, Math.round(marketPrice(player[2]) * 0.58));
  return {
    ...current,
    budget: current.budget + value,
    squad: current.squad.filter((_, index) => index !== saleIndex),
    transactions: [
      `Vendeu ${player[0]} (${player[2]} OVR) por €${value} mi`,
      ...(current.transactions ?? []),
    ].slice(0, 8),
  };
}

export function transferMarketFor(
  team: Team,
  squad: SquadSeed[],
): MarketEntry[] {
  const signedPlayers = new Set(squad.map(squadPlayerKey));
  return TEAMS.filter((candidate) => candidate.id !== team.id)
    .flatMap((candidate) =>
      rosterFor(candidate).map((seed, index) => ({
        team: candidate,
        seed: [
          seed[0],
          seed[1],
          seed[2],
          FORMATIONS["2-3-2"].slots[index]?.[0] ?? "MF",
        ] as SquadSeed,
      })),
    )
    .filter((entry) => !signedPlayers.has(squadPlayerKey(entry.seed)))
    .sort((a, b) => b.seed[2] - a.seed[2])
    .slice(0, 10);
}
