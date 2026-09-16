import {
  clamp,
  FORMATIONS,
  lineupFor,
  rosterFor,
  seedFromName,
  TEAMS,
  type CareerManagement,
  type CareerState,
  type FormationId,
  type MatchState,
  type PlayerContract,
  type SquadSeed,
  type Team,
} from "./football-engine.ts";

export const playerKey = (seed: SquadSeed) =>
  seed[7] ?? `${seed[0]}-${seed[1]}`;
export const weeklyWage = (overall: number) =>
  Math.round(Math.max(3, 6 * Math.exp((overall - 68) * 0.14))); // € thousands / week
export const transferValue = (seed: SquadSeed, week = 0) => {
  const age = seed[4] ?? 25;
  const ageFactor =
    age < 23 ? 1.2 : age > 30 ? Math.max(0.4, 1 - (age - 30) * 0.12) : 1;
  const potentialFactor =
    1 + Math.max(0, (seed[5] ?? seed[2]) - seed[2]) * 0.025;
  const marketCycle =
    1 + Math.sin((week + (seedFromName(playerKey(seed)) % 17)) / 5) * 0.06;
  return Math.max(
    1,
    Math.round(
      2.2 *
        Math.exp((seed[2] - 70) * 0.19) *
        ageFactor *
        potentialFactor *
        marketCycle,
    ),
  );
};

function contractFor(seed: SquadSeed): PlayerContract {
  return {
    age: seed[4] ?? 24,
    potential: seed[5] ?? Math.min(94, seed[2] + 3),
    wage: weeklyWage(seed[2]),
    years: 2 + (seedFromName(playerKey(seed)) % 3),
    morale: 72,
    fatigue: 0,
    development: 0,
    appearances: 0,
  };
}

export function developYouth(
  clubId: string,
  season: number,
  count = 3,
): SquadSeed[] {
  const first = [
    "Lucas",
    "Gabriel",
    "Rafael",
    "Mateus",
    "André",
    "Daniel",
    "Felipe",
    "Caio",
    "João",
    "Pedro",
    "Miguel",
    "Vitor",
  ];
  const last = [
    "Duarte",
    "Ramos",
    "Costa",
    "Alves",
    "Lima",
    "Silva",
    "Rocha",
    "Mendes",
    "Santos",
    "Pereira",
    "Moura",
    "Barros",
  ];
  return Array.from({ length: count }, (_, i) => {
    const hash = seedFromName(`${clubId}-${season}-${i}`),
      overall = 54 + (hash % 15);
    return [
      first[hash % first.length] + " " + last[(hash >>> 5) % last.length],
      70 + i,
      overall,
      (["GK", "DF", "MF", "FW"] as const)[(hash >>> 9) % 4],
      16 + (hash % 3),
      Math.min(94, overall + 12 + ((hash >>> 13) % 10)),
      60 + ((hash >>> 15) % 15),
      `youth-${clubId}-${season}-${i}`,
    ] as SquadSeed;
  });
}

export function ensureManagement(
  career: CareerState,
): CareerState & { management: CareerManagement } {
  if (
    career.management?.version === 2 &&
    career.management.contracts &&
    career.management.worldSquads &&
    Array.isArray(career.management.starters) &&
    Array.isArray(career.management.academy) &&
    Array.isArray(career.management.news) &&
    Number.isFinite(career.management.wageLimit)
  )
    return career as CareerState & { management: CareerManagement };
  const club = TEAMS.find((t) => t.id === career.clubId) ?? TEAMS[0];
  const contracts = Object.fromEntries(
    career.squad.map((seed) => [playerKey(seed), contractFor(seed)]),
  );
  const count = TEAMS.filter((t) => t.leagueId === club.leagueId).length;
  const management: CareerManagement = {
    version: 2,
    week: 0,
    points: 0,
    confidence: 72,
    targetPoints: Math.round(
      (count - 1) *
        2 *
        (club.rating >= 83 ? 1.8 : club.rating >= 77 ? 1.35 : 1),
    ),
    youthTarget: 2,
    promoted: 0,
    status: "active",
    training: "balanced",
    contracts,
    starters: lineupFor(career.squad, FORMATIONS["2-3-2"]).map(playerKey),
    academy: developYouth(club.id, career.season),
    worldSquads: Object.fromEntries(
      TEAMS.filter((t) => t.id !== club.id).map((t) => [
        t.id,
        rosterFor(t).map((p) => [...p] as SquadSeed),
      ]),
    ),
    worldBudgets: Object.fromEntries(
      TEAMS.map((t) => [t.id, Math.round(35 + (t.rating - 65) * 4)]),
    ),
    news: [
      "Bem-vindo ao clube. A diretoria acompanha resultados, finanças e a formação de jovens.",
    ],
    wageLimit: Math.max(
      400,
      Math.round(
        Object.values(contracts).reduce((sum, c) => sum + c.wage, 0) * 1.35,
      ),
    ),
    rng: seedFromName(club.id),
  };
  return { ...career, management };
}

export function wageBill(career: CareerState) {
  return Object.values(ensureManagement(career).management.contracts).reduce(
    (sum, c) => sum + c.wage,
    0,
  );
}

export function careerMatchSquad(
  career: CareerState,
  formation: FormationId,
): SquadSeed[] {
  const { management: m } = ensureManagement(career);
  const selected = career.squad.filter((seed) =>
    m.starters.includes(playerKey(seed)),
  );
  // Keep selected starters first, while filling each formation slot with its
  // natural role. Changing formation must not turn an attacker into a defender.
  const preferred = lineupFor(
    [
      ...selected,
      ...career.squad.filter((seed) => !m.starters.includes(playerKey(seed))),
    ],
    FORMATIONS[formation],
    true,
  );
  return preferred.map((seed) => {
    const c = m.contracts[playerKey(seed)] ?? contractFor(seed);
    const effective = clamp(
      seed[2] - c.fatigue * 0.09 + (c.morale - 70) * 0.035,
      45,
      97,
    );
    const adjusted = [...seed] as SquadSeed;
    adjusted[2] = Math.round(effective);
    return adjusted;
  });
}

export function selectCareerStarter(career: CareerState, key: string) {
  const current = ensureManagement(career),
    m = current.management;
  const player = current.squad.find((p) => playerKey(p) === key);
  if (!player || m.starters.includes(key)) return current;
  const candidates = current.squad
    .filter((p) => m.starters.includes(playerKey(p)) && p[3] === player[3])
    .sort((a, b) => a[2] - b[2]);
  if (!candidates.length) return current;
  return {
    ...current,
    management: {
      ...m,
      starters: m.starters.map((id) =>
        id === playerKey(candidates[0]) ? key : id,
      ),
    },
  };
}

export type TransferOffer = {
  sellerId: string;
  playerId: string;
  fee: number;
  wage: number;
  years: number;
};
export function negotiateTransfer(
  career: CareerState,
  offer: TransferOffer,
): { career: CareerState; message: string; accepted: boolean } {
  const current = ensureManagement(career),
    m = current.management;
  const seed = m.worldSquads[offer.sellerId]?.find(
    (p) => playerKey(p) === offer.playerId,
  );
  const fail = (message: string) => ({
    career: current,
    message,
    accepted: false,
  });
  if (m.status !== "active")
    return fail("Você precisa assumir um clube para negociar.");
  if (!seed || current.squad.some((p) => playerKey(p) === offer.playerId))
    return fail("Este jogador não está mais disponível.");
  if (
    ![offer.fee, offer.wage, offer.years].every(Number.isFinite) ||
    offer.fee < 0 ||
    offer.wage < 0 ||
    !Number.isInteger(offer.years) ||
    offer.years < 1 ||
    offer.years > 5
  )
    return fail("Revise os valores e escolha um contrato de 1 a 5 anos.");
  const value = transferValue(seed, m.week),
    minimum = Math.round(value * (offer.years >= 3 ? 0.94 : 1));
  const wage = weeklyWage(seed[2]);
  if (offer.fee < minimum)
    return fail(`Contraproposta do clube: €${minimum} mi pelo passe.`);
  if (offer.wage < wage)
    return fail(`${seed[0]} pede pelo menos €${wage} mil por semana.`);
  const signingBonus = (offer.wage * 4) / 1000,
    total = offer.fee + signingBonus;
  if (current.budget < total)
    return fail(
      `Saldo insuficiente: passe e luvas somam €${total.toFixed(2)} mi.`,
    );
  if (wageBill(current) + offer.wage > m.wageLimit)
    return fail(
      "A folha ultrapassa o limite salarial aprovado pela diretoria.",
    );
  const squad = [...current.squad, [...seed] as SquadSeed];
  const next: CareerState = {
    ...current,
    budget: Number((current.budget - total).toFixed(3)),
    squad,
    transactions: [
      `Comprou ${seed[0]} por €${offer.fee} mi · ${offer.years} anos · €${offer.wage} mil/sem`,
      ...current.transactions,
    ].slice(0, 20),
    management: {
      ...m,
      contracts: {
        ...m.contracts,
        [playerKey(seed)]: {
          ...contractFor(seed),
          wage: offer.wage,
          years: offer.years,
          morale: 82,
        },
      },
      worldSquads: {
        ...m.worldSquads,
        [offer.sellerId]: m.worldSquads[offer.sellerId].filter(
          (p) => playerKey(p) !== offer.playerId,
        ),
      },
      worldBudgets: {
        ...m.worldBudgets,
        [offer.sellerId]: (m.worldBudgets[offer.sellerId] ?? 0) + offer.fee,
      },
    },
  };
  return {
    career: next,
    message: `${seed[0]} contratado. Use “Escalar” na aba Elenco.`,
    accepted: true,
  };
}

export function sellCareerPlayer(
  career: CareerState,
  key: string,
): { career: CareerState; message: string } {
  const current = ensureManagement(career),
    m = current.management,
    seed = current.squad.find((p) => playerKey(p) === key);
  const fail = (message: string) => ({ career: current, message });
  if (!seed) return fail("Jogador não encontrado.");
  if (current.squad.length <= 8)
    return fail("O clube precisa manter pelo menos oito jogadores.");
  const role = seed[3] ?? "MF",
    minimum = role === "GK" ? 1 : 2;
  if (current.squad.filter((p) => p[3] === role).length <= minimum)
    return fail("Não é possível vender: faltaria cobertura nesta posição.");
  const fee = Math.round(transferValue(seed, m.week) * 0.88);
  const buyer = TEAMS.find(
    (t) =>
      t.id !== current.clubId &&
      (m.worldBudgets[t.id] ?? 0) >= fee &&
      (m.worldSquads[t.id]?.length ?? 0) < 45,
  );
  if (!buyer)
    return fail("Nenhum clube tem orçamento para esta proposta nesta rodada.");
  const contracts = { ...m.contracts };
  delete contracts[key];
  const squad = current.squad.filter((p) => playerKey(p) !== key);
  return {
    career: {
      ...current,
      budget: current.budget + fee,
      squad,
      transactions: [
        `Vendeu ${seed[0]} ao ${buyer.name} por €${fee} mi`,
        ...current.transactions,
      ].slice(0, 20),
      management: {
        ...m,
        contracts,
        starters: lineupFor(squad, FORMATIONS["2-3-2"]).map(playerKey),
        worldSquads: {
          ...m.worldSquads,
          [buyer.id]: [...m.worldSquads[buyer.id], seed],
        },
        worldBudgets: {
          ...m.worldBudgets,
          [buyer.id]: m.worldBudgets[buyer.id] - fee,
        },
      },
    },
    message: `${seed[0]} vendido ao ${buyer.name} por €${fee} mi.`,
  };
}

export function promoteYouth(career: CareerState, key: string) {
  const current = ensureManagement(career),
    m = current.management,
    seed = m.academy.find((p) => playerKey(p) === key);
  if (!seed || current.squad.length >= 45) return current;
  const wage = weeklyWage(seed[2]);
  if (wageBill(current) + wage > m.wageLimit) return current;
  return {
    ...current,
    squad: [...current.squad, seed],
    management: {
      ...m,
      promoted: m.promoted + 1,
      confidence: Math.min(100, m.confidence + 3),
      academy: m.academy.filter((p) => playerKey(p) !== key),
      contracts: { ...m.contracts, [key]: { ...contractFor(seed), years: 3 } },
      news: [`${seed[0]} promovido da base.`, ...m.news].slice(0, 20),
    },
  };
}

export function renewContract(career: CareerState, key: string) {
  const current = ensureManagement(career),
    m = current.management,
    c = m.contracts[key];
  if (!c) return current;
  const wage = Math.round(c.wage * 1.1),
    bonus = (wage * 4) / 1000;
  if (current.budget < bonus || wageBill(current) - c.wage + wage > m.wageLimit)
    return current;
  return {
    ...current,
    budget: current.budget - bonus,
    management: {
      ...m,
      contracts: {
        ...m.contracts,
        [key]: { ...c, wage, years: 3, morale: Math.min(100, c.morale + 8) },
      },
    },
  };
}

export function advanceCareerRound(
  career: CareerState,
  match: MatchState,
): CareerState {
  const current = ensureManagement(career),
    m = current.management;
  if (m.status !== "active") return current;
  const win = match.homeScore > match.awayScore,
    draw = match.homeScore === match.awayScore;
  const used = new Map(
    match.players.filter((p) => p.side === "home").map((p) => [p.squadId, p]),
  );
  const contracts = { ...m.contracts };
  const squad = current.squad.map((seed) => {
    const id = playerKey(seed),
      c = { ...(contracts[id] ?? contractFor(seed)) },
      played = used.get(id);
    c.morale = clamp(
      c.morale + (played ? 2.2 : -1.6) + (win ? 1.5 : draw ? 0 : -1.5),
      20,
      100,
    );
    c.fatigue = clamp(
      c.fatigue * 0.55 +
        (played ? (100 - played.stamina) * 0.5 + 10 : -20) -
        (m.training === "fitness" ? 15 : 0),
      0,
      100,
    );
    c.appearances += played ? 1 : 0;
    c.development +=
      (c.age < 25 ? 0.06 : 0.015) *
      (played ? 1 : 0.35) *
      (win ? 1.2 : 1) *
      (m.training === "development" ? 1.6 : 1);
    const next = [...seed] as SquadSeed;
    if (c.development >= 1 && next[2] < c.potential) {
      next[2] += 1;
      c.development -= 1;
    }
    if (c.age > 32 && (m.week + 1) % 20 === 0)
      next[2] = Math.max(45, next[2] - 1);
    contracts[id] = c;
    return next;
  });
  let rng = m.rng;
  const roll = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const world = { ...m.worldSquads },
    budgets = { ...m.worldBudgets },
    news = [...m.news];
  const clubs = TEAMS.filter((t) => t.id !== current.clubId);
  // Actual ownership and budgets change; the next opponent fields the resulting squad.
  for (let i = 0; i < 3; i++) {
    const seller = clubs[Math.floor(roll() * clubs.length)],
      buyer = clubs[Math.floor(roll() * clubs.length)];
    if (
      seller.id === buyer.id ||
      !world[seller.id]?.length ||
      world[buyer.id].length >= 45
    )
      continue;
    const available = world[seller.id].filter(
      (p) =>
        p[3] !== "GK" &&
        world[seller.id].filter((q) => q[3] === p[3]).length > 3,
    );
    const seed = available[Math.floor(roll() * available.length)];
    if (!seed) continue;
    const fee = transferValue(seed, m.week);
    if (budgets[buyer.id] < fee) continue;
    world[seller.id] = world[seller.id].filter(
      (p) => playerKey(p) !== playerKey(seed),
    );
    world[buyer.id] = [...world[buyer.id], seed];
    budgets[buyer.id] -= fee;
    budgets[seller.id] += fee;
    news.unshift(
      `${buyer.name} contratou ${seed[0]} do ${seller.name} por €${fee} mi.`,
    );
  }
  const income = win ? 2.2 : draw ? 1.45 : 1.1,
    payroll = Object.values(contracts).reduce((s, c) => s + c.wage, 0) / 1000;
  const budget = Number((current.budget + income - payroll).toFixed(3));
  const confidence = clamp(
    m.confidence + (win ? 3 : draw ? 0 : -3) + (budget < 0 ? -8 : 0),
    0,
    100,
  );
  return {
    ...current,
    budget,
    squad,
    fans: Math.max(10000, current.fans + (win ? 7500 : draw ? 1800 : -2200)),
    history: [
      `${match.homeTeam.short} ${match.homeScore} × ${match.awayScore} ${match.awayTeam.short}`,
      ...current.history,
    ].slice(0, 20),
    management: {
      ...m,
      week: m.week + 1,
      points: m.points + (win ? 3 : draw ? 1 : 0),
      confidence,
      contracts,
      worldSquads: world,
      worldBudgets: budgets,
      rng,
      news: [
        `Rodada ${m.week + 1}: receitas €${income.toFixed(2)} mi · salários €${payroll.toFixed(2)} mi.`,
        ...news,
      ].slice(0, 24),
      status: confidence <= 12 && m.week >= 7 ? "sacked" : "active",
    },
  };
}

export function nextCareerSeason(career: CareerState): CareerState {
  const current = ensureManagement(career),
    m = current.management;
  const club = TEAMS.find((t) => t.id === current.clubId)!;
  const rounds =
    (TEAMS.filter((t) => t.leagueId === club.leagueId).length - 1) * 2;
  if (m.week < rounds || m.status !== "active") return current;
  const met = m.points >= m.targetPoints,
    base = m.promoted >= m.youthTarget;
  const confidence = clamp(
    m.confidence + (met ? 12 : -18) + (base ? 6 : -8),
    0,
    100,
  );
  const contracts = { ...m.contracts };
  const departures: string[] = [];
  const squad = current.squad.filter((seed) => {
    const c = { ...contracts[playerKey(seed)] };
    c.years -= 1;
    c.age += 1;
    c.fatigue = 0;
    c.appearances = 0;
    contracts[playerKey(seed)] = c;
    if (c.years <= 0) {
      departures.push(seed[0]);
      delete contracts[playerKey(seed)];
      return false;
    }
    return true;
  });
  // Keep a playable academy group after expiring contracts, without inventing senior signings.
  const academy = [
    ...m.academy,
    ...developYouth(current.clubId, current.season + 1, 6),
  ];
  while (squad.length < 8 && academy.length) {
    const seed = academy.shift()!;
    squad.push(seed);
    contracts[playerKey(seed)] = contractFor(seed);
  }
  return {
    ...current,
    season: current.season + 1,
    budget: current.budget + (met ? 12 : 4),
    squad,
    management: {
      ...m,
      standings: undefined,
      week: 0,
      points: 0,
      promoted: 0,
      confidence,
      status: confidence < 25 ? "sacked" : "active",
      contracts,
      starters: lineupFor(squad, FORMATIONS["2-3-2"]).map(playerKey),
      academy,
      news: [
        met
          ? "Objetivo esportivo cumprido."
          : "A diretoria cobra melhores resultados.",
        ...(departures.length
          ? [`Contratos encerrados: ${departures.join(", ")}.`]
          : []),
        ...m.news,
      ].slice(0, 24),
    },
  };
}

export function careerOpponentSquad(career: CareerState, team: Team) {
  return (
    ensureManagement(career).management.worldSquads[team.id] ?? rosterFor(team)
  );
}
