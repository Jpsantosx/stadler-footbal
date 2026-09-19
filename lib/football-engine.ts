import catalog from "../data/football-catalog.json" with { type: "json" };
import { beginTitleCelebration, resolveShootout, type TitleCelebration, type Shootout } from "./football-presentation.ts";
import { createPitchWear, updatePitchWear, type PitchWear } from "./football-pitch.ts";
export type Side = "home" | "away";
export type Role = "GK" | "DF" | "MF" | "FW";
export type Screen = "menu" | "playing" | "celebrating" | "finished";
export type Quality = "performance" | "balanced" | "ultra";
export type Difficulty = "easy" | "normal" | "hard";
export type GameMode = "solo" | "local2p";
export type CompetitionMode = "friendly" | "league" | "cup" | "career";
export type CupScope = "continental" | "world";
export type TeamRegionFilter = "all" | "brazil" | "europe";
export type LeagueId =
  | "brasileirao"
  | "premier-league"
  | "la-liga"
  | "serie-a"
  | "bundesliga"
  | "ligue-1";
export type FormationId = "2-3-2" | "3-2-2" | "2-2-3";
export type TacticId = "balanced" | "attacking" | "defensive" | "counter";
export type KitPattern =
  | "solid"
  | "horizontal"
  | "vertical"
  | "sash"
  | "chest-band"
  | "white-sleeves"
  | "center-stripe";
export type PlayerArchetype =
  "keeper" | "stopper" | "engine" | "creator" | "sprinter" | "finisher";
export type SetPieceKind =
  "corner" | "freeKick" | "offside" | "penalty" | "throwIn" | "goalKick";

export type Team = {
  id: string;
  name: string;
  short: string;
  city: string;
  flag: string;
  leagueId: LeagueId;
  officialDomain: string;
  crestUrl?: string;
  sourceId?: string;
  kitPattern: KitPattern;
  kitAccent?: string;
  shorts: string;
  socks: string;
  primary: string;
  secondary: string;
  rating: number;
};

export type LeagueDefinition = {
  id: LeagueId;
  name: string;
  country: string;
  flag: string;
  accent: string;
};

export type SquadSeed = [
  name: string,
  number: number,
  overall: number,
  naturalRole?: Role,
  age?: number,
  potential?: number,
  mass?: number,
  playerId?: string,
];

export type FormationDefinition = {
  id: FormationId;
  label: string;
  description: string;
  slots: Array<[Role, number, number]>;
};

export type TacticDefinition = {
  id: TacticId;
  label: string;
  description: string;
  line: number;
  width: number;
  pressure: number;
  forwardRuns: number;
  tempo: number;
};

export type LeagueRow = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type CareerState = {
  clubId: string;
  season: number;
  budget: number;
  fans: number;
  squad: SquadSeed[];
  history: string[];
  transactions: string[];
  management?: CareerManagement;
};

export type PlayerContract = {
  age: number;
  potential: number;
  wage: number;
  years: number;
  morale: number;
  fatigue: number;
  development: number;
  appearances: number;
};
export type CareerManagement = {
  standings?: LeagueRow[];
  version: 2;
  week: number;
  points: number;
  confidence: number;
  targetPoints: number;
  youthTarget: number;
  promoted: number;
  status: "active" | "sacked";
  training: "balanced" | "fitness" | "development";
  contracts: Record<string, PlayerContract>;
  starters: string[];
  academy: SquadSeed[];
  worldSquads: Record<string, SquadSeed[]>;
  worldBudgets: Record<string, number>;
  news: string[];
  wageLimit: number;
  rng: number;
};

export type MarketEntry = {
  team: Team;
  seed: SquadSeed;
};

export type Player = {
  defensiveState: "shape" | "chase" | "cover" | "tackle" | "recover";
  tackleReadiness: number;
  keeperSave: "set" | "dive" | "tip" | "smother";
  keeperShotPending: boolean;
  possessionTime: number;
  squadId: string;
  mass: number;
  strength: number;
  endurance: number;
  actionTimer: number;
  action: "none" | "pass" | "shot" | "control";
  id: number;
  side: Side;
  role: Role;
  name: string;
  number: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  stamina: number;
  tackleCooldown: number;
  decisionCooldown: number;
  yellowCards: number;
  sentOff: boolean;
  controlShield: number;
  keeperDiveTimer: number;
  keeperDiveDirection: number;
  keeperReactionTimer: number;
  keeperCommitTimer: number;
  keeperTargetY: number;
  slideTimer: number;
  slideHit: boolean;
  stealTimer: number;
  stealHit: boolean;
  stumbleTimer: number;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  archetype: PlayerArchetype;
};

export type Ball = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  owner: number | null;
  lastTouch: Side;
  lastPlayerId: number | null;
  spin: number;
  looseTimer: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
};

export type TrailPoint = {
  x: number;
  y: number;
  z: number;
  life: number;
};

export type SetPiece = {
  kind: SetPieceKind;
  side: Side;
  spotX: number;
  spotY: number;
  takerId: number;
  timer: number;
  ready: boolean;
  readyTimer: number;
  aimY: number;
};

export type MatchStats = {
  homeShots: number;
  awayShots: number;
  homePasses: number;
  awayPasses: number;
  homePossession: number;
  awayPossession: number;
  homeFouls: number;
  awayFouls: number;
  homeCards: number;
  awayCards: number;
  homeOffsides: number;
  awayOffsides: number;
};

export type MatchState = {
  passIntent: { receiverId: number; x: number; y: number; expires: number } | null;
  cupRound: number | null;
  winner: Side | null;
  shootout: Shootout | null;
  celebration: TitleCelebration | null;
  pitchWear: PitchWear;
  pressure: { ownerId: number | null; held: number; window: number; path: number; anchorX: number; anchorY: number; lastX: number; lastY: number; stagnant: number; secondaryId: number | null };
  players: Player[];
  ball: Ball;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  remaining: number;
  half: 1 | 2;
  homeAttacksRight: boolean;
  homeFormation: FormationId;
  awayFormation: FormationId;
  homeTactic: TacticId;
  awayTactic: TacticId;
  selectedId: number;
  selectedAwayId: number;
  gameMode: GameMode;
  paused: boolean;
  finished: boolean;
  frozen: number;
  message: string;
  messageTimer: number;
  shotCharge: number;
  chargingShot: boolean;
  awayShotCharge: number;
  chargingAwayShot: boolean;
  particles: Particle[];
  trail: TrailPoint[];
  setPiece: SetPiece | null;
  stats: MatchStats;
  difficulty: Difficulty;
  rng: number;
  lastKickTime: number;
  lastShotStyle: string;
  elapsed: number;
  cameraShake: number;
  impactFlash: number;
  netPulse: number;
};

export type Hud = {
  homeScore: number;
  awayScore: number;
  remaining: number;
  half: 1 | 2;
  playerName: string;
  playerNumber: number;
  stamina: number;
  shotCharge: number;
  message: string;
  fps: number;
  setPieceKind: SetPieceKind | null;
  setPieceReady: boolean;
  setPieceSide: Side | null;
  homeCards: number;
  awayCards: number;
  awayPlayerName: string;
  awayPlayerNumber: number;
  awayStamina: number;
  awayShotCharge: number;
  playerOverall: number;
  awayPlayerOverall: number;
  gameMode: GameMode;
};

export type InputState = {
  controllers?: Partial<Record<Side, { x: number; y: number; sprint: boolean }>>;
  keys: Set<string>;
  touchX: number;
  touchY: number;
  touchSprint: boolean;
};

export type GameActions = {
  pass: (side?: Side, through?: boolean) => void;
  shootStart: (side?: Side) => void;
  shootRelease: (side?: Side) => void;
  steal: (side?: Side) => void;
  switchPlayer: (side?: Side) => void;
  slide: (side?: Side) => void;
  togglePause: () => void;
};

export const FIELD_W = 100;
export const FIELD_H = 64;
export const GOAL_TOP = 24;
export const GOAL_BOTTOM = 40;
export const HALF_SECONDS = 55;

export const TEAMS = catalog.teams as Team[];

export const LEAGUES: LeagueDefinition[] = [
  {
    id: "brasileirao",
    name: "Brasileirão Série A",
    country: "Brasil",
    flag: "🇧🇷",
    accent: "#2ed573",
  },
  {
    id: "premier-league",
    name: "Premier League",
    country: "Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    accent: "#b36bff",
  },
  {
    id: "la-liga",
    name: "LaLiga",
    country: "Espanha",
    flag: "🇪🇸",
    accent: "#ff5c5c",
  },
  {
    id: "serie-a",
    name: "Serie A Italiana",
    country: "Itália",
    flag: "🇮🇹",
    accent: "#4e8dff",
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    country: "Alemanha",
    flag: "🇩🇪",
    accent: "#f43b47",
  },
  {
    id: "ligue-1",
    name: "Ligue 1",
    country: "França",
    flag: "🇫🇷",
    accent: "#f5d742",
  },
];

// Elencos compactos para o formato 8×8. Os números e Over formam a base
// dos atributos usados pelo motor; o mercado da carreira reutiliza estes dados.
export const ROSTERS = catalog.rosters as unknown as Record<
  string,
  SquadSeed[]
>;

export const FORMATIONS: Record<FormationId, FormationDefinition> = {
  "2-3-2": {
    id: "2-3-2",
    label: "2-3-2",
    description: "Equilíbrio e amplitude",
    slots: [
      ["GK", 6, 32],
      ["DF", 22, 20],
      ["DF", 22, 44],
      ["MF", 34, 11],
      ["MF", 36, 32],
      ["MF", 34, 53],
      ["FW", 45, 24],
      ["FW", 45, 42],
    ],
  },
  "3-2-2": {
    id: "3-2-2",
    label: "3-2-2",
    description: "Bloco forte e seguro",
    slots: [
      ["GK", 6, 32],
      ["DF", 20, 12],
      ["DF", 23, 32],
      ["DF", 20, 52],
      ["MF", 35, 21],
      ["MF", 35, 43],
      ["FW", 45, 24],
      ["FW", 45, 42],
    ],
  },
  "2-2-3": {
    id: "2-2-3",
    label: "2-2-3",
    description: "Ataque com três opções",
    slots: [
      ["GK", 6, 32],
      ["DF", 21, 21],
      ["DF", 21, 43],
      ["MF", 34, 21],
      ["MF", 34, 43],
      ["FW", 44, 10],
      ["FW", 46, 32],
      ["FW", 44, 54],
    ],
  },
};

export const TACTICS: Record<TacticId, TacticDefinition> = {
  balanced: {
    id: "balanced",
    label: "Equilibrado",
    description: "Linhas compactas",
    line: 0,
    width: 1,
    pressure: 1,
    forwardRuns: 6,
    tempo: 1,
  },
  attacking: {
    id: "attacking",
    label: "Ofensivo",
    description: "Pressão e linha alta",
    line: 7,
    width: 1.12,
    pressure: 1.17,
    forwardRuns: 11,
    tempo: 1.08,
  },
  defensive: {
    id: "defensive",
    label: "Defensivo",
    description: "Bloco baixo e compacto",
    line: -7,
    width: 0.82,
    pressure: 0.88,
    forwardRuns: 3,
    tempo: 0.94,
  },
  counter: {
    id: "counter",
    label: "Contra-ataque",
    description: "Recupera e acelera",
    line: -3,
    width: 1.06,
    pressure: 0.96,
    forwardRuns: 13,
    tempo: 1.13,
  },
};
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const distance = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by);

export function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const segmentX = bx - ax;
  const segmentY = by - ay;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared < 0.001) return distance(px, py, ax, ay);
  const progress = clamp(
    ((px - ax) * segmentX + (py - ay) * segmentY) / lengthSquared,
    0,
    1,
  );
  return distance(px, py, ax + segmentX * progress, ay + segmentY * progress);
}

export function random(state: MatchState) {
  state.rng = (state.rng * 1664525 + 1013904223) >>> 0;
  return state.rng / 4294967296;
}

export function seedFromName(name: string) {
  return [...name].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
}

export function attributeProfile(seed: SquadSeed, role: Role) {
  const [name, , overall] = seed;
  const hash = seedFromName(name);
  const variation = (offset: number) => ((hash >>> offset) % 7) - 3;
  const roleBias = {
    GK: { pace: -12, shooting: -28, passing: -4, defending: 8 },
    DF: { pace: -1, shooting: -11, passing: -2, defending: 8 },
    MF: { pace: 1, shooting: 1, passing: 7, defending: 0 },
    FW: { pace: 6, shooting: 8, passing: 1, defending: -14 },
  }[role];
  return {
    pace: Math.round(clamp(overall + roleBias.pace + variation(2), 52, 96)),
    shooting: Math.round(
      clamp(overall + roleBias.shooting + variation(5), 40, 96),
    ),
    passing: Math.round(
      clamp(overall + roleBias.passing + variation(8), 48, 96),
    ),
    defending: Math.round(
      clamp(overall + roleBias.defending + variation(11), 38, 96),
    ),
  };
}

export function playerAttributeFactor(attribute: number) {
  return clamp(0.74 + (attribute - 55) * 0.0105, 0.74, 1.27);
}

export function playerArchetypeFor(
  role: Role,
  attributes: ReturnType<typeof attributeProfile>,
): PlayerArchetype {
  if (role === "GK") return "keeper";
  if (role === "DF" && attributes.defending >= attributes.passing) {
    return "stopper";
  }
  if (
    role === "MF" &&
    attributes.passing >= Math.max(attributes.pace, attributes.shooting)
  ) {
    return "creator";
  }
  if (attributes.pace >= attributes.shooting + 2) return "sprinter";
  if (role === "FW" || attributes.shooting >= attributes.passing) {
    return "finisher";
  }
  return "engine";
}

export function rosterFor(team: Team, override?: SquadSeed[]) {
  if (override?.length) return override;
  const database = ROSTERS[team.id];
  if (database) {
    const quotas: Record<Role, number> = { GK: 2, DF: 8, MF: 10, FW: 8 };
    return (["GK", "DF", "MF", "FW"] as Role[]).flatMap((role) =>
      database
        .filter((seed) => seed[3] === role)
        .sort((a, b) => b[2] - a[2])
        .slice(0, quotas[role]),
    );
  }
  return (
    ROSTERS[team.id] ??
    Array.from(
      { length: 8 },
      (_, index) =>
        [`${team.short} ${index + 1}`, index + 1, team.rating] as SquadSeed,
    )
  );
}

export function lineupFor(
  squad: SquadSeed[],
  formation: FormationDefinition,
  preserveOrder = false,
) {
  const candidates = squad.map((seed, index) => ({
    seed,
    role: seed[3] ?? FORMATIONS["2-3-2"].slots[index]?.[0] ?? "MF",
    used: false,
  }));
  return formation.slots.map(([role]) => {
    const exact = candidates
      .filter((candidate) => !candidate.used && candidate.role === role)
      .sort((a, b) => (preserveOrder ? 0 : b.seed[2] - a.seed[2]))[0];
    const fallback = candidates
      .filter((candidate) => !candidate.used)
      .sort((a, b) => (preserveOrder ? 0 : b.seed[2] - a.seed[2]))[0];
    const selected = exact ?? fallback;
    if (!selected) return ["Reserva", 0, 60, role] as SquadSeed;
    selected.used = true;
    const result = [...selected.seed] as SquadSeed;
    result[3] = selected.role;
    return result;
  });
}

export function lineupOverall(
  team: Team,
  formationId: FormationId = "2-3-2",
  squadOverride?: SquadSeed[],
) {
  const starters = lineupFor(
    rosterFor(team, squadOverride),
    FORMATIONS[formationId],
  );
  const average =
    starters.reduce((total, player) => total + player[2], 0) /
    Math.max(1, starters.length);
  return Math.round(average);
}

export function ballControlRating(player: Player) {
  return player.passing * 0.48 + player.overall * 0.34 + player.pace * 0.18;
}

export function controlShieldDuration(player: Player) {
  return clamp(0.27 + (ballControlRating(player) - 70) * 0.008, 0.27, 0.55);
}

export function duelModifier(activeAttribute: number, rivalAttribute: number) {
  return clamp((activeAttribute - rivalAttribute) * 0.009, -0.22, 0.22);
}

export function buildPlayers(
  homeTeam: Team,
  awayTeam: Team,
  homeFormation: FormationId,
  awayFormation: FormationId,
  homeSquad?: SquadSeed[],
  awaySquad?: SquadSeed[],
): Player[] {
  const players: Player[] = [];
  let id = 1;
  for (const side of ["home", "away"] as Side[]) {
    const team = side === "home" ? homeTeam : awayTeam;
    const formation =
      FORMATIONS[side === "home" ? homeFormation : awayFormation];
    const squad = lineupFor(
      rosterFor(team, side === "home" ? homeSquad : awaySquad),
      formation,
    );
    formation.slots.forEach(([role, x, y], index) => {
      const seed =
        squad[index] ??
        ([`${team.short} ${index + 1}`, index + 1, team.rating] as SquadSeed);
      const [name, number, overall] = seed;
      const naturalRole = seed[3] ?? role;
      const attributes = attributeProfile(seed, naturalRole);
      const px = side === "home" ? x : FIELD_W - x;
      players.push({
        possessionTime: 0,
        squadId: seed[7] ?? `${name}-${number}`,
        mass: seed[6] ?? 65 + (seedFromName(name) % 22),
        strength: clamp(overall + (role === "DF" ? 6 : -3), 45, 96),
        endurance: clamp(overall + (role === "MF" ? 5 : -2), 45, 96),
        actionTimer: 0,
        action: "none",
        id: id++,
        side,
        role,
        name,
        number,
        x: px,
        y,
        homeX: px,
        homeY: y,
        vx: 0,
        vy: 0,
        facingX: side === "home" ? 1 : -1,
        facingY: 0,
        stamina: 100,
        tackleCooldown: 0,
        decisionCooldown: 0.5 + index * 0.11,
        yellowCards: 0,
        sentOff: false,
        controlShield: 0,
        keeperDiveTimer: 0,
        keeperDiveDirection: 0,
        keeperReactionTimer: 0,
        keeperCommitTimer: 0,
        keeperTargetY: 32,
        keeperSave: "set",
        keeperShotPending: false,
        defensiveState: "shape",
        tackleReadiness: 0,
        slideTimer: 0,
        slideHit: false,
        stealTimer: 0,
        stealHit: false,
        stumbleTimer: 0,
        overall,
        pace: attributes.pace,
        shooting: attributes.shooting,
        passing: attributes.passing,
        defending: attributes.defending,
        archetype: playerArchetypeFor(naturalRole, attributes),
      });
    });
  }
  return players;
}

export function createMatch(
  homeTeam: Team,
  awayTeam: Team,
  difficulty: Difficulty,
  demo = false,
  gameMode: GameMode = "solo",
  homeFormation: FormationId = "2-3-2",
  awayFormation: FormationId = "2-3-2",
  homeTactic: TacticId = "balanced",
  awayTactic: TacticId = "balanced",
  homeSquad?: SquadSeed[],
  awaySquad?: SquadSeed[],
): MatchState {
  const state: MatchState = {
    cupRound: null, winner: null, shootout: null, celebration: null,
    pitchWear: createPitchWear(),
    pressure: { ownerId: null, held: 0, window: 0, path: 0, anchorX: 50, anchorY: 32, lastX: 50, lastY: 32, stagnant: 0, secondaryId: null },
    players: buildPlayers(
      homeTeam,
      awayTeam,
      homeFormation,
      awayFormation,
      homeSquad,
      awaySquad,
    ),
    passIntent: null,
    ball: {
      x: 50,
      y: 32,
      z: 0.12,
      vx: 0,
      vy: 0,
      vz: 0,
      owner: null,
      lastTouch: "home",
      lastPlayerId: null,
      spin: 0,
      looseTimer: 0,
    },
    homeTeam,
    awayTeam,
    homeScore: 0,
    awayScore: 0,
    remaining: HALF_SECONDS,
    half: 1,
    homeAttacksRight: true,
    homeFormation,
    awayFormation,
    homeTactic,
    awayTactic,
    selectedId: 7,
    selectedAwayId: 15,
    gameMode,
    paused: false,
    finished: false,
    frozen: demo ? 0 : 1.35,
    message: demo ? "" : "APITO INICIAL",
    messageTimer: demo ? 0 : 1.35,
    shotCharge: 0,
    chargingShot: false,
    awayShotCharge: 0,
    chargingAwayShot: false,
    particles: [],
    trail: [],
    setPiece: null,
    stats: {
      homeShots: 0,
      awayShots: 0,
      homePasses: 0,
      awayPasses: 0,
      homePossession: 0,
      awayPossession: 0,
      homeFouls: 0,
      awayFouls: 0,
      homeCards: 0,
      awayCards: 0,
      homeOffsides: 0,
      awayOffsides: 0,
    },
    difficulty,
    rng: 294031,
    lastKickTime: 0,
    lastShotStyle: "CHUTE",
    elapsed: 0,
    cameraShake: 0,
    impactFlash: 0,
    netPulse: 0,
  };
  resetPositions(state, "home");
  if (demo) {
    state.frozen = 0;
    state.message = "";
    state.messageTimer = 0;
  }
  return state;
}

export function getPlayer(state: MatchState, id: number | null) {
  if (id === null) return undefined;
  return state.players.find((player) => player.id === id);
}

export function setMessage(state: MatchState, message: string, duration = 1.1) {
  state.message = message;
  state.messageTimer = duration;
}

export function attacksRight(state: MatchState, side: Side) {
  return side === "home" ? state.homeAttacksRight : !state.homeAttacksRight;
}

export function attackDirectionFor(state: MatchState, side: Side) {
  return attacksRight(state, side) ? 1 : -1;
}

export function attackingGoalX(state: MatchState, side: Side, outside = 0) {
  return attacksRight(state, side) ? FIELD_W + outside : -outside;
}

export function defendingGoalX(state: MatchState, side: Side) {
  return attacksRight(state, side) ? 0 : FIELD_W;
}

export function formationXFor(state: MatchState, player: Player) {
  const firstHalfOrientation = player.side === "home";
  return attacksRight(state, player.side) === firstHalfOrientation
    ? player.homeX
    : FIELD_W - player.homeX;
}

export function attackingSideAtGoalLine(
  state: MatchState,
  rightGoal: boolean,
): Side {
  if (rightGoal) return state.homeAttacksRight ? "home" : "away";
  return state.homeAttacksRight ? "away" : "home";
}

export function matchTeamOverall(state: MatchState, side: Side) {
  const squad = state.players.filter((player) => player.side === side);
  return (
    squad.reduce((total, player) => total + player.overall, 0) /
    Math.max(1, squad.length)
  );
}

export function teamAbility(state: MatchState, side: Side) {
  const ownOverall = matchTeamOverall(state, side);
  const rivalOverall = matchTeamOverall(
    state,
    side === "home" ? "away" : "home",
  );
  return clamp(
    0.95 + (ownOverall - 80) * 0.007 + (ownOverall - rivalOverall) * 0.009,
    0.78,
    1.18,
  );
}

export function accuratePassTarget(
  state: MatchState,
  passer: Player,
  targetX: number,
  targetY: number,
) {
  const nearestPressure = Math.min(
    12,
    ...state.players
      .filter((player) => player.side !== passer.side && !player.sentOff)
      .map((player) => distance(passer.x, passer.y, player.x, player.y)),
  );
  const pressure = clamp((7 - nearestPressure) / 7, 0, 1);
  const composure = (passer.passing * 0.72 + passer.overall * 0.28) / 100;
  const archetypeBonus = passer.archetype === "creator" ? 0.78 : 1;
  const error = clamp(
    (1.02 - composure) * 11.5 * (1 + pressure * 1.05) * archetypeBonus,
    0.08,
    4.1,
  );
  return {
    x: targetX + (random(state) - 0.5) * error * 0.55,
    y: clamp(targetY + (random(state) - 0.5) * error, 2, FIELD_H - 2),
  };
}

export function finishingTargetY(
  state: MatchState,
  shooter: Player,
  desiredY: number,
  baseSpread: number,
) {
  const range = distance(
    shooter.x,
    shooter.y,
    attackingGoalX(state, shooter.side),
    32,
  );
  const nearest = Math.min(
    20,
    ...state.players
      .filter((p) => p.side !== shooter.side && !p.sentOff && p.role !== "GK")
      .map((p) => distance(shooter.x, shooter.y, p.x, p.y)),
  );
  const pressure = clamp((6 - nearest) / 6, 0, 1);
  const skill = shooter.shooting * 0.8 + shooter.overall * 0.2;
  const error = clamp(1.75 - (skill - 55) * 0.032, 0.32, 1.85);
  const balance =
    1 + Math.max(0, Math.hypot(shooter.vx, shooter.vy) - 10) * 0.055;
  const spread =
    baseSpread *
    error *
    balance *
    (1 + (100 - shooter.stamina) * 0.003) *
    (0.65 + range / 34) *
    (1 + pressure * 0.8) *
    (shooter.archetype === "finisher" ? 0.86 : 1);
  return clamp(desiredY + (random(state) - 0.5) * spread, 4, FIELD_H - 4);
}

export function bestKickoffPlayer(state: MatchState, side: Side) {
  return state.players
    .filter(
      (player) =>
        player.side === side && player.role !== "GK" && !player.sentOff,
    )
    .sort((a, b) => {
      const aPriority = (a.role === "FW" ? 16 : 0) + a.overall;
      const bPriority = (b.role === "FW" ? 16 : 0) + b.overall;
      return bPriority - aPriority;
    })[0];
}

export function resetPositions(state: MatchState, kickoffSide: Side) {
  state.passIntent = null;
  state.players.forEach((player) => {
    if (player.sentOff) return;
    player.x = formationXFor(state, player);
    player.y = player.homeY;
    player.vx = 0;
    player.vy = 0;
    player.facingX = attackDirectionFor(state, player.side);
    player.facingY = 0;
    player.slideTimer = 0;
    player.slideHit = false;
    player.stealTimer = 0;
    player.stealHit = false;
    player.stumbleTimer = 0;
    player.keeperDiveTimer = 0;
    player.keeperReactionTimer = 0;
    player.keeperCommitTimer = 0;
    player.keeperTargetY = 32;
    player.keeperSave = "set";
    player.keeperShotPending = false;
    player.defensiveState = "shape";
    player.tackleReadiness = 0;
    player.stamina = Math.min(100, player.stamina + 10);
  });
  state.pressure.ownerId = null;
  state.pressure.secondaryId = null;
  state.ball.x = 50;
  state.ball.y = 32;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.z = 0.12;
  state.ball.vz = 0;
  const kickoffPlayer = bestKickoffPlayer(state, kickoffSide);
  if (kickoffPlayer) {
    const kickoffDirection = attackDirectionFor(state, kickoffSide);
    kickoffPlayer.x = 50 - kickoffDirection * 1.34;
    kickoffPlayer.y = 32;
    kickoffPlayer.facingX = kickoffDirection;
    kickoffPlayer.facingY = 0;
  }
  state.ball.owner = kickoffPlayer?.id ?? null;
  state.ball.lastPlayerId = kickoffPlayer?.id ?? null;
  state.ball.looseTimer = 0;
  state.ball.lastTouch = kickoffSide;
  const nextSelected =
    (kickoffSide === "home" ? kickoffPlayer : undefined) ??
    bestKickoffPlayer(state, "home");
  state.selectedId =
    nextSelected?.id ??
    state.players.find((player) => player.side === "home" && !player.sentOff)
      ?.id ??
    1;
  const nextAwaySelected =
    (kickoffSide === "away" ? kickoffPlayer : undefined) ??
    bestKickoffPlayer(state, "away");
  state.selectedAwayId =
    nextAwaySelected?.id ??
    state.players.find((player) => player.side === "away" && !player.sentOff)
      ?.id ??
    9;
  state.frozen = 1.45;
  state.setPiece = null;
  state.trail = [];
  state.shotCharge = 0;
  state.chargingShot = false;
  state.awayShotCharge = 0;
  state.chargingAwayShot = false;
  state.cameraShake = 0;
  state.impactFlash = 0;
  state.netPulse = 0;
}

export function beginSecondHalf(state: MatchState) {
  state.half = 2;
  state.homeAttacksRight = false;
  state.remaining = HALF_SECONDS;
  resetPositions(state, "away");
  state.players.forEach((player) => {
    player.stamina = Math.min(100, player.stamina + 18);
  });
  state.frozen = 2.65;
  setMessage(state, "INTERVALO • TROCA DE LADO • 2º TEMPO", 2.65);
}

export function kickBall(
  state: MatchState,
  player: Player,
  tx: number,
  ty: number,
  power: number,
  kind: "pass" | "shot" | "clear",
  lift?: number,
) {
  const dx = tx - player.x;
  const dy = ty - player.y;
  const magnitude = Math.max(0.001, Math.hypot(dx, dy));
  state.passIntent = null;
  state.ball.owner = null;
  player.possessionTime = 0;
  state.ball.x = player.x + (dx / magnitude) * 1.7;
  state.ball.y = player.y + (dy / magnitude) * 1.7;
  state.ball.z = 0.18;
  state.ball.vx = (dx / magnitude) * power;
  state.ball.vy = (dy / magnitude) * power;
  state.ball.vz =
    lift ?? (kind === "clear" ? 8.2 : kind === "shot" ? 5.1 : 1.7);
  state.ball.spin = (random(state) - 0.5) * 8;
  state.ball.lastTouch = player.side;
  state.ball.lastPlayerId = player.id;
  state.ball.looseTimer = kind === "pass" ? 0.16 : 0.1;
  player.controlShield = 0;
  player.action = kind === "shot" ? "shot" : "pass";
  player.actionTimer = kind === "shot" ? 0.5 : 0.34;
  player.decisionCooldown = 0.55;
  state.lastKickTime = state.elapsed * 1000;
  if (kind === "shot") {
    state.cameraShake = Math.max(state.cameraShake, power > 58 ? 0.28 : 0.14);
    const opposingKeeper = state.players.find(
      (candidate) =>
        candidate.side !== player.side &&
        candidate.role === "GK" &&
        !candidate.sentOff,
    );
    if (opposingKeeper) {
      const keeperEdge = opposingKeeper.overall - player.shooting;
      opposingKeeper.keeperReactionTimer = clamp(
        0.245 -
          keeperEdge * 0.0022 -
          (teamAbility(state, opposingKeeper.side) - 1) * 0.16 +
          (random(state) - 0.5) * 0.045,
        0.105,
        0.26,
      );
      opposingKeeper.keeperCommitTimer = 0;
      opposingKeeper.keeperShotPending = true;
      opposingKeeper.keeperSave = "set";
    }
  }
  if (kind === "pass") {
    if (player.side === "home") state.stats.homePasses += 1;
    else state.stats.awayPasses += 1;
  }
  if (kind === "shot") {
    if (player.side === "home") state.stats.homeShots += 1;
    else state.stats.awayShots += 1;
  }
}

export function isOffsidePosition(
  state: MatchState,
  passer: Player,
  receiver: Player,
) {
  if (
    receiver.side !== passer.side ||
    receiver.id === passer.id ||
    receiver.role === "GK"
  ) {
    return false;
  }
  const direction = attackDirectionFor(state, passer.side);
  const ballX = state.ball.owner === passer.id ? passer.x : state.ball.x;
  const inOpponentHalf = direction > 0 ? receiver.x > 50 : receiver.x < 50;
  const aheadOfBall =
    direction > 0 ? receiver.x > ballX + 0.65 : receiver.x < ballX - 0.65;
  if (!inOpponentHalf || !aheadOfBall) return false;

  const defenders = state.players
    .filter((candidate) => candidate.side !== passer.side && !candidate.sentOff)
    .sort((a, b) => (direction > 0 ? b.x - a.x : a.x - b.x));
  const secondLastDefender = defenders[Math.min(1, defenders.length - 1)];
  if (!secondLastDefender) return false;
  return direction > 0
    ? receiver.x > secondLastDefender.x + 0.35
    : receiver.x < secondLastDefender.x - 0.35;
}

export function awardOffside(
  state: MatchState,
  attacker: Player,
  receiver: Player,
) {
  if (attacker.side === "home") state.stats.homeOffsides += 1;
  else state.stats.awayOffsides += 1;
  startSetPiece(
    state,
    "offside",
    oppositeSide(attacker.side),
    receiver.x,
    receiver.y,
  );
  setMessage(state, "IMPEDIMENTO • TIRO LIVRE INDIRETO", 1.35);
}

export function passLaneRisk(
  state: MatchState,
  passer: Player,
  receiver: Player,
) {
  const d = distance(passer.x, passer.y, receiver.x, receiver.y);
  return state.players.reduce((risk, defender) => {
    if (defender.side === passer.side || defender.sentOff) return risk;
    const dx = receiver.x - passer.x,
      dy = receiver.y - passer.y;
    const t = clamp(
      ((defender.x - passer.x) * dx + (defender.y - passer.y) * dy) /
        Math.max(1, d * d),
      0,
      1,
    );
    if (t < 0.08 || t > 0.95) return risk;
    const gap = pointToSegmentDistance(
      defender.x + defender.vx * t * 0.12,
      defender.y + defender.vy * t * 0.12,
      passer.x,
      passer.y,
      receiver.x,
      receiver.y,
    );
    return Math.max(risk, clamp((3.8 - gap) / 3.8, 0, 1));
  }, 0);
}
export function choosePassTarget(state: MatchState, player: Player) {
  const tactic =
    TACTICS[player.side === "home" ? state.homeTactic : state.awayTactic];
  let best: Player | undefined,
    bestScore = -Infinity;
  for (const candidate of state.players) {
    if (
      candidate.side !== player.side ||
      candidate.id === player.id ||
      candidate.sentOff ||
      isOffsidePosition(state, player, candidate)
    )
      continue;
    const dx = candidate.x - player.x,
      dy = candidate.y - player.y,
      dist = Math.hypot(dx, dy);
    if (dist < 4 || dist > 55) continue;
    const facing = (dx * player.facingX + dy * player.facingY) / dist;
    const space = Math.min(
      12,
      ...state.players
        .filter((p) => p.side !== player.side && !p.sentOff)
        .map((p) => distance(candidate.x, candidate.y, p.x, p.y)),
    );
    const score =
      dx *
        attackDirectionFor(state, player.side) *
        (tactic.id === "counter" ? 0.9 : 0.72) +
      facing * 9 +
      space * 1.1 -
      Math.abs(dist - 18) * 0.4 -
      passLaneRisk(state, player, candidate) * 32 -
      (candidate.role === "GK" ? 12 : 0);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

export function chooseDirectionalPassTarget(state: MatchState, player: Player, aim: { x: number; y: number }) {
  const length = Math.hypot(aim.x, aim.y);
  if (length < .12) return choosePassTarget(state, player);
  const nx = aim.x / length, ny = aim.y / length;
  let best: Player | undefined, score = -Infinity;
  for (const mate of state.players) {
    if (mate.id === player.id || mate.side !== player.side || mate.sentOff || isOffsidePosition(state, player, mate)) continue;
    const dx = mate.x - player.x, dy = mate.y - player.y, d = Math.hypot(dx, dy);
    if (d < 3 || d > 58) continue;
    const alignment = (dx * nx + dy * ny) / d;
    // A backwards input is a deliberate back pass, even when a striker is open.
    if (alignment < .3) continue;
    const candidate = alignment * 85 - Math.abs(d - 19) * .55 - passLaneRisk(state, player, mate) * 20;
    if (candidate > score) { score = candidate; best = mate; }
  }
  return best;
}
export function passToPlayer(
  state: MatchState,
  passer: Player,
  receiver: Player,
  through = false,
) {
  if (isOffsidePosition(state, passer, receiver)) return false;
  const d = distance(passer.x, passer.y, receiver.x, receiver.y),
    lead = through ? clamp(.5 + d / 95, .55, 1.1) : clamp(d / 65, 0.12, 0.48);
  const runSpeed = Math.hypot(receiver.vx, receiver.vy);
  const extraX = through && runSpeed < 4 ? attackDirectionFor(state, passer.side) * 6 : 0;
  const target = accuratePassTarget(
    state,
    passer,
    clamp(receiver.x + receiver.vx * lead + extraX, 2, 98),
    clamp(receiver.y + receiver.vy * lead, 2, 62),
  );
  kickBall(
    state,
    passer,
    target.x,
    target.y,
    clamp(12 + d * 1.05 + (through ? 6 : 0), 19, 62) *
      clamp(0.92 + (passer.passing - 65) * 0.004, 0.87, 1.09),
    "pass",
    d > 33 ? 3.1 : through ? .45 : 0.75,
  );
  state.passIntent = { receiverId: receiver.id, x: target.x, y: target.y, expires: state.elapsed + 2.5 };
  return true;
}

export function selectedIdForSide(state: MatchState, side: Side) {
  return side === "home" ? state.selectedId : state.selectedAwayId;
}

export function passBall(state: MatchState, side: Side = "home", aim?: { x: number; y: number }, through = false) {
  const owner = getPlayer(state, state.ball.owner);
  if (
    !owner ||
    owner.side !== side ||
    owner.id !== selectedIdForSide(state, side)
  )
    return false;
  const receiver = aim ? chooseDirectionalPassTarget(state, owner, aim) : choosePassTarget(state, owner);
  if (receiver) return passToPlayer(state, owner, receiver, through);
  if (aim && Math.hypot(aim.x, aim.y) > .12) {
    const length = Math.hypot(aim.x, aim.y);
    const target = accuratePassTarget(state, owner, owner.x + aim.x / length * 22, owner.y + aim.y / length * 22);
    kickBall(state, owner, target.x, target.y, through ? 38 : 29, "pass", .7);
    return true;
  }
  return false;
}

export function releaseShot(state: MatchState, side: Side = "home") {
  const owner = getPlayer(state, state.ball.owner);
  const charge = side === "home" ? state.shotCharge : state.awayShotCharge;
  if (
    !owner ||
    owner.side !== side ||
    owner.id !== selectedIdForSide(state, side)
  ) {
    if (side === "home") {
      state.chargingShot = false;
      state.shotCharge = 0;
    } else {
      state.chargingAwayShot = false;
      state.awayShotCharge = 0;
    }
    return;
  }
  const placed = charge < 0.42;
  const powerful = charge > 0.78;
  const desiredY = clamp(
    32 + owner.facingY * (placed ? 13 : 10),
    GOAL_TOP + 0.8,
    GOAL_BOTTOM - 0.8,
  );
  const aimY = finishingTargetY(
    state,
    owner,
    desiredY,
    placed ? 2.6 : powerful ? 5 : 3.7,
  );
  const power =
    (placed ? 45 : powerful ? 63 : 51 + charge * 8) *
    teamAbility(state, side) *
    playerAttributeFactor(owner.shooting);
  state.lastShotStyle = placed
    ? "CHUTE COLOCADO"
    : powerful
      ? "BOMBA"
      : "CHUTE CRUZADO";
  const lift = placed ? 3.5 : powerful ? 6.7 : 5.1;
  kickBall(
    state,
    owner,
    attackingGoalX(state, side, 3),
    aimY,
    power,
    "shot",
    lift,
  );
  state.ball.spin = placed ? owner.facingY * 9 + (random(state) - 0.5) * 3 : 0;
  if (side === "home") {
    state.chargingShot = false;
    state.shotCharge = 0;
  } else {
    state.chargingAwayShot = false;
    state.awayShotCharge = 0;
  }
}

export function oppositeSide(side: Side): Side {
  return side === "home" ? "away" : "home";
}

export function setPieceName(kind: SetPieceKind) {
  if (kind === "corner") return "ESCANTEIO";
  if (kind === "freeKick") return "FALTA";
  if (kind === "offside") return "IMPEDIMENTO";
  if (kind === "penalty") return "PÊNALTI";
  if (kind === "throwIn") return "LATERAL";
  return "TIRO DE META";
}

export function setPieceInstruction(hud: Hud) {
  if (!hud.setPieceKind || !hud.setPieceSide) return "";
  if (!hud.setPieceReady) {
    return hud.setPieceSide === "away" && hud.gameMode === "local2p"
      ? "JOGADOR 2 PREPARANDO"
      : hud.setPieceSide === "away"
        ? "ADVERSÁRIO NA BOLA"
        : "JOGADOR 1 PREPARANDO";
  }
  const passOnly =
    hud.setPieceKind === "throwIn" ||
    hud.setPieceKind === "goalKick" ||
    hud.setPieceKind === "offside";
  if (hud.setPieceSide === "away") {
    if (hud.gameMode !== "local2p") return "ADVERSÁRIO NA BOLA";
    return passOnly ? "APERTE K PARA COBRAR" : "↑/↓ MIRA • L CHUTE • K PASSE";
  }
  return passOnly
    ? "APERTE F PARA COBRAR"
    : "W/S MIRA • ESPAÇO CHUTE • F PASSE";
}

export function startSetPiece(
  state: MatchState,
  kind: SetPieceKind,
  side: Side,
  requestedX: number,
  requestedY: number,
) {
  const attackDirection = attackDirectionFor(state, side);
  const targetGoalX = attackingGoalX(state, side);
  const ownGoalX = defendingGoalX(state, side);
  let spotX = clamp(requestedX, 2, FIELD_W - 2);
  let spotY = clamp(requestedY, 1.5, FIELD_H - 1.5);

  if (kind === "penalty") {
    spotX = targetGoalX - attackDirection * 12;
    spotY = 32;
  } else if (kind === "goalKick") {
    spotX = ownGoalX + attackDirection * 8;
    spotY = 32;
  } else if (kind === "corner") {
    spotX = targetGoalX - attackDirection;
    spotY = requestedY < FIELD_H / 2 ? 1.5 : FIELD_H - 1.5;
  } else if (kind === "throwIn") {
    spotY = requestedY < FIELD_H / 2 ? 1.5 : FIELD_H - 1.5;
  }

  const candidates = state.players
    .filter(
      (player) =>
        player.side === side &&
        !player.sentOff &&
        (kind === "goalKick" ? player.role === "GK" : player.role !== "GK"),
    )
    .sort(
      (a, b) =>
        distance(a.x, a.y, spotX, spotY) - distance(b.x, b.y, spotX, spotY),
    );
  const taker =
    candidates[0] ??
    state.players.find((player) => player.side === side && !player.sentOff);
  if (!taker) return;

  state.ball.owner = null;
  state.ball.x = spotX;
  state.ball.y = spotY;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.z = 0.12;
  state.ball.vz = 0;
  state.ball.spin = 0;
  state.ball.lastTouch = side;
  state.ball.lastPlayerId = taker.id;
  state.trail = [];
  state.shotCharge = 0;
  state.chargingShot = false;
  state.awayShotCharge = 0;
  state.chargingAwayShot = false;
  state.frozen = 0;
  state.players.forEach((player) => {
    player.slideTimer = 0;
    player.slideHit = false;
    player.stealTimer = 0;
    player.stealHit = false;
    player.stumbleTimer = 0;
    player.keeperDiveTimer = 0;
    player.keeperCommitTimer = 0;
  });

  taker.x = clamp(spotX - attackDirection * 2.4, 2.5, FIELD_W - 2.5);
  taker.y = clamp(spotY, 3, FIELD_H - 3);
  taker.vx = 0;
  taker.vy = 0;
  taker.facingX = attackDirection;
  taker.facingY = 0;

  const activePlayers = state.players.filter(
    (player) => !player.sentOff && player.id !== taker.id,
  );
  if (kind === "penalty") {
    let teammateLane = 0;
    let defenderLane = 0;
    activePlayers.forEach((player) => {
      if (player.role === "GK") {
        if (player.side !== side) {
          player.x = targetGoalX - attackDirection * 4;
          player.y = 32;
        }
        return;
      }
      const isAttacking = player.side === side;
      const lane = isAttacking ? teammateLane++ : defenderLane++;
      player.x = isAttacking
        ? spotX - attackDirection * 10
        : spotX - attackDirection * 7;
      player.y = 18 + (lane % 5) * 7;
      player.vx = 0;
      player.vy = 0;
    });
  } else if (kind === "freeKick") {
    const wall = activePlayers
      .filter((player) => player.side !== side && player.role !== "GK")
      .sort(
        (a, b) =>
          distance(a.x, a.y, spotX, spotY) - distance(b.x, b.y, spotX, spotY),
      )
      .slice(0, 3);
    wall.forEach((player, index) => {
      player.x = clamp(spotX + attackDirection * 7.8, 4, FIELD_W - 4);
      player.y = clamp(spotY + (index - 1) * 2.1, 5, FIELD_H - 5);
      player.vx = 0;
      player.vy = 0;
    });
  } else if (kind === "corner") {
    const attackers = activePlayers.filter(
      (player) => player.side === side && player.role !== "GK",
    );
    const defenders = activePlayers.filter(
      (player) => player.side !== side && player.role !== "GK",
    );
    attackers.forEach((player, index) => {
      player.x = targetGoalX - attackDirection * (18 - (index % 2) * 5);
      player.y = 20 + (index % 5) * 6;
    });
    defenders.forEach((player, index) => {
      player.x = targetGoalX - attackDirection * (15 - (index % 2) * 4);
      player.y = 21 + (index % 5) * 5.8;
    });
  } else if (kind === "throwIn") {
    activePlayers
      .filter((player) => player.side !== side)
      .forEach((player) => {
        const dx = player.x - spotX;
        const dy = player.y - spotY;
        const currentDistance = Math.hypot(dx, dy);
        if (currentDistance >= 3.6) return;
        const nx =
          currentDistance > 0.01 ? dx / currentDistance : -attackDirection;
        const ny =
          currentDistance > 0.01
            ? dy / currentDistance
            : spotY < FIELD_H / 2
              ? 1
              : -1;
        player.x = clamp(spotX + nx * 3.6, 3, FIELD_W - 3);
        player.y = clamp(spotY + ny * 3.6, 3, FIELD_H - 3);
      });
  }

  if (side === "home") state.selectedId = taker.id;
  else if (state.gameMode === "local2p") state.selectedAwayId = taker.id;
  state.setPiece = {
    kind,
    side,
    spotX,
    spotY,
    takerId: taker.id,
    timer: 1.05,
    ready: false,
    readyTimer: 0,
    aimY: 32,
  };
  setMessage(state, setPieceName(kind), 1.05);
}

export function executeSetPiece(state: MatchState, action: "pass" | "shot") {
  const piece = state.setPiece;
  if (!piece || !piece.ready) return;
  const taker = getPlayer(state, piece.takerId);
  if (!taker || taker.sentOff) {
    state.setPiece = null;
    return;
  }

  const attackDirection = attackDirectionFor(state, piece.side);
  const goalX = attackingGoalX(state, piece.side, 3);
  let targetX = goalX;
  let targetY = piece.aimY;
  let power = 49;
  let lift: number | undefined;
  let kickKind: "pass" | "shot" | "clear" = action === "shot" ? "shot" : "pass";

  const setPieceCharge =
    piece.side === "home" ? state.shotCharge : state.awayShotCharge;
  if (piece.kind === "penalty") {
    power = 52 + setPieceCharge * 10;
    kickKind = "shot";
    state.lastShotStyle = "PÊNALTI";
    lift = 5.3;
  } else if (piece.kind === "freeKick" && action === "shot") {
    power = 48 + setPieceCharge * 13;
    state.lastShotStyle = "GOL DE FALTA";
    lift = 8.2;
  } else if (piece.kind === "corner") {
    if (action === "shot") {
      targetX = goalX;
      targetY = piece.spotY < 32 ? GOAL_TOP + 2.3 : GOAL_BOTTOM - 2.3;
      power = 43;
      kickKind = "shot";
      state.lastShotStyle = "GOL OLÍMPICO";
      lift = 8.8;
    } else {
      targetX = attackingGoalX(state, piece.side) - attackDirection * 13;
      targetY = clamp(27 + random(state) * 10, 25, 39);
      power = 32;
      kickKind = "pass";
      lift = 8.4;
    }
  } else if (piece.kind === "throwIn") {
    const target = choosePassTarget(state, taker);
    targetX = target?.x ?? piece.spotX + attackDirection * 10;
    targetY =
      target?.y ?? clamp(piece.spotY + (piece.spotY < 32 ? 8 : -8), 5, 59);
    power = 25;
    kickKind = "pass";
    lift = 6.5;
  } else if (piece.kind === "goalKick") {
    const target = choosePassTarget(state, taker);
    targetX = target?.x ?? piece.spotX + attackDirection * 32;
    targetY = target?.y ?? 32;
    power = 38;
    kickKind = "clear";
    lift = 9.2;
  } else if (piece.kind === "offside") {
    const target = choosePassTarget(state, taker);
    targetX = target?.x ?? piece.spotX + attackDirection * 14;
    targetY = target?.y ?? piece.spotY;
    power = 28;
    kickKind = "pass";
    lift = 1.2;
  } else if (action === "pass") {
    const target = choosePassTarget(state, taker);
    targetX = target?.x ?? piece.spotX + attackDirection * 18;
    targetY = target?.y ?? piece.spotY;
    power = 30;
    kickKind = "pass";
  }

  if (kickKind === "shot") {
    const spread =
      piece.kind === "penalty" ? 2.7 : piece.kind === "freeKick" ? 4.2 : 4.8;
    targetY = finishingTargetY(state, taker, targetY, spread);
    power *=
      teamAbility(state, taker.side) * playerAttributeFactor(taker.shooting);
  } else {
    const passTarget = accuratePassTarget(state, taker, targetX, targetY);
    targetX = passTarget.x;
    targetY = passTarget.y;
    power *=
      teamAbility(state, taker.side) * playerAttributeFactor(taker.passing);
  }

  state.setPiece = null;
  kickBall(state, taker, targetX, targetY, power, kickKind, lift);
  state.ball.x = piece.spotX;
  state.ball.y = piece.spotY;
  if (piece.kind === "freeKick" || piece.kind === "corner") {
    state.ball.spin = attackDirection * (piece.spotY < 32 ? 7 : -7);
  }
  state.shotCharge = 0;
  state.chargingShot = false;
  state.awayShotCharge = 0;
  state.chargingAwayShot = false;
  state.frozen = 0.12;
  setMessage(state, "BOLA EM JOGO", 0.45);
}

export function commitFoul(
  state: MatchState,
  offender: Player,
  victim: Player,
  demo: boolean,
) {
  if (state.setPiece) return;
  const awardedSide = victim.side;
  if (!demo) {
    if (offender.side === "home") state.stats.homeFouls += 1;
    else state.stats.awayFouls += 1;
  }

  let cardText = "";
  if (!demo) {
    const attackingGoal = attackingGoalX(state, victim.side);
    const victimGoalDistance = Math.abs(attackingGoal - victim.x);
    const coveringDefenders = state.players.filter(
      (candidate) =>
        candidate.side === offender.side &&
        candidate.id !== offender.id &&
        !candidate.sentOff &&
        Math.abs(attackingGoal - candidate.x) < victimGoalDistance + 1.5,
    ).length;
    const lastDefenderFoul =
      victimGoalDistance < 27 && coveringDefenders <= 1 && victim.role === "FW";
    const impactSpeed = Math.hypot(
      offender.vx - victim.vx,
      offender.vy - victim.vy,
    );
    const directRed =
      lastDefenderFoul ||
      (offender.slideTimer > 0 && impactSpeed > 22 && random(state) < 0.1);
    const cardRoll = random(state);
    const yellowChance = clamp(
      (offender.slideTimer > 0 ? 0.62 : 0.2) + impactSpeed * 0.008,
      0.2,
      0.84,
    );
    if (directRed) {
      offender.sentOff = true;
      if (offender.side === "home") state.stats.homeCards += 1;
      else state.stats.awayCards += 1;
      cardText = " • VERMELHO DIRETO";
    } else if (cardRoll < yellowChance) {
      offender.yellowCards += 1;
      if (offender.side === "home") state.stats.homeCards += 1;
      else state.stats.awayCards += 1;
      if (offender.yellowCards >= 2) {
        offender.sentOff = true;
        cardText = " • 2º AMARELO • VERMELHO";
      } else {
        cardText = " • CARTÃO AMARELO";
      }
    }
  }

  const insidePenaltyAreaWidth =
    victim.y >= GOAL_TOP - 10 && victim.y <= GOAL_BOTTOM + 10;
  const isPenalty =
    insidePenaltyAreaWidth &&
    (attackDirectionFor(state, awardedSide) > 0
      ? victim.x >= 82
      : victim.x <= 18);
  const kind: SetPieceKind = isPenalty ? "penalty" : "freeKick";
  startSetPiece(state, kind, awardedSide, victim.x, victim.y);
  setMessage(state, setPieceName(kind) + cardText, 1.25);

  if (offender.sentOff) {
    const replacement = nearestPlayer(state, offender.side);
    if (
      offender.side === "home" &&
      state.selectedId === offender.id &&
      replacement
    ) {
      state.selectedId = replacement.id;
    }
    if (
      offender.side === "away" &&
      state.selectedAwayId === offender.id &&
      replacement
    ) {
      state.selectedAwayId = replacement.id;
    }
  }
}

export function switchToClosestPlayer(state: MatchState, side: Side) {
  const currentId = selectedIdForSide(state, side);
  const ballOwner = getPlayer(state, state.ball.owner);
  if (
    ballOwner?.side === side &&
    ballOwner.role !== "GK" &&
    ballOwner.id !== currentId &&
    !ballOwner.sentOff
  ) {
    if (side === "home") state.selectedId = ballOwner.id;
    else state.selectedAwayId = ballOwner.id;
    setMessage(
      state,
      side === "home" ? "J1 • COM A BOLA" : "J2 • COM A BOLA",
      0.32,
    );
    return;
  }
  const opponentOwner = ballOwner && ballOwner.side !== side ? ballOwner : null;
  const targetX = opponentOwner?.x ?? state.ball.x;
  const targetY = opponentOwner?.y ?? state.ball.y;
  const ownGoalX = defendingGoalX(state, side);
  const outfield = state.players
    .filter(
      (player) =>
        player.side === side &&
        player.role !== "GK" &&
        !player.sentOff &&
        player.id !== currentId,
    )
    .sort((a, b) => {
      const score = (player: Player) => {
        const ballDistance = distance(player.x, player.y, targetX, targetY);
        const goalSide =
          distance(player.x, player.y, ownGoalX, 32) <
          distance(targetX, targetY, ownGoalX, 32);
        return ballDistance - (goalSide ? 0.65 : 0);
      };
      return score(a) - score(b);
    });
  const next = outfield[0];
  if (!next) return;
  if (side === "home") state.selectedId = next.id;
  else state.selectedAwayId = next.id;
  setMessage(
    state,
    (side === "home" ? "J1" : "J2") + " • " + next.name.toUpperCase(),
    0.32,
  );
}

export function beginTackle(state: MatchState, player: Player, sliding = false) {
  if (player.role === "GK" || player.sentOff || player.tackleCooldown > 0 ||
    player.slideTimer > 0 || player.stealTimer > 0 || player.stumbleTimer > 0 ||
    player.stamina < (sliding ? 7 : 3) || state.paused || state.finished || state.setPiece) return false;
  const owner = getPlayer(state, state.ball.owner);
  if (owner?.side === player.side) return false;
  const factor = playerAttributeFactor(player.defending);
  const lead = clamp((player.defending - 50) * 0.0014, 0.02, 0.07);
  const dx = state.ball.x + (owner?.vx ?? state.ball.vx) * lead - player.x;
  const dy = state.ball.y + (owner?.vy ?? state.ball.vy) * lead - player.y;
  const magnitude = Math.max(0.001, Math.hypot(dx, dy));
  player.facingX = dx / magnitude;
  player.facingY = dy / magnitude;
  player.vx = player.facingX * (sliding ? 25 : 18.5) * factor;
  player.vy = player.facingY * (sliding ? 25 : 18.5) * factor;
  player.defensiveState = "tackle";
  player.tackleReadiness = 0;
  player.tackleCooldown = clamp((sliding ? 1.55 : 0.86) / factor, sliding ? 1.15 : 0.58, sliding ? 1.9 : 1.1);
  player.stamina = Math.max(0, player.stamina - (sliding ? 8 : 3));
  if (sliding) { player.slideTimer = 0.5; player.slideHit = false; }
  else { player.stealTimer = clamp(0.27 / factor, 0.19, 0.34); player.stealHit = false; }
  return true;
}

export function stealBall(state: MatchState, side: Side = "home") {
  const player = getPlayer(state, selectedIdForSide(state, side));
  if (!player) return;
  if (distance(player.x, player.y, state.ball.x, state.ball.y) > 4.7 * playerAttributeFactor(player.defending)) {
    setMessage(state, "APROXIME PARA DAR O BOTE", 0.36);
    return;
  }
  beginTackle(state, player);
}

export function slideTackle(state: MatchState, side: Side = "home") {
  const player = getPlayer(state, selectedIdForSide(state, side));
  if (player && beginTackle(state, player, true)) {
    state.cameraShake = Math.max(state.cameraShake, 0.12);
    setMessage(state, "CARRINHO!", 0.34);
  }
}

export function applyMovementVelocity(player: Player, desiredX: number, desiredY: number, dt: number) {
  if (dt <= 0) return;
  const agility = playerAttributeFactor(player.pace * .6 + player.overall * .4);
  const massFactor = clamp(76 / player.mass, .78, 1.18);
  const fatigue = .78 + .22 * clamp(player.stamina / 45, 0, 1);
  const braking = desiredX * player.vx + desiredY * player.vy <= 0;
  const response = 1 - Math.exp(-(braking ? 12 : 8.4 * agility) * dt);
  const dx = (desiredX - player.vx) * response, dy = (desiredY - player.vy) * response;
  const demand = Math.hypot(dx, dy);
  const acceleration = 58 * Math.pow(agility, 1.5) * massFactor * fatigue * (braking ? 1.45 : 1);
  const scale = demand > 0 ? Math.min(1, acceleration * dt / demand) : 0;
  player.vx += dx * scale; player.vy += dy * scale;
}

export function faceDirection(player: Player, x: number, y: number, dt: number) {
  if (Math.hypot(x, y) < .05) return;
  const current = Math.atan2(player.facingY, player.facingX), target = Math.atan2(y, x);
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const turnRate = (5.5 + (player.overall - 60) * .12) * clamp(80 / player.mass, .85, 1.15);
  const angle = current + clamp(delta, -turnRate * dt, turnRate * dt);
  player.facingX = Math.cos(angle); player.facingY = Math.sin(angle);
}

export function movePlayer(
  player: Player,
  targetX: number,
  targetY: number,
  maxSpeed: number,
  dt: number,
) {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const magnitude = Math.hypot(dx, dy);
  const arrivalSpeed = Math.min(maxSpeed, magnitude * 4.5);
  const fatigue = 0.78 + 0.22 * clamp(player.stamina / 45, 0, 1);
  const desiredX =
    magnitude > 0.12 ? (dx / magnitude) * arrivalSpeed * fatigue : 0;
  const desiredY =
    magnitude > 0.12 ? (dy / magnitude) * arrivalSpeed * fatigue : 0;
  applyMovementVelocity(player, desiredX, desiredY, dt);
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  if (Math.hypot(player.vx, player.vy) > 0.2) {
    faceDirection(player, player.vx, player.vy, dt);
  }
}

export function updateSpecialMovement(player: Player, dt: number) {
  if (player.slideTimer > 0) {
    player.slideTimer = Math.max(0, player.slideTimer - dt);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    const drag = Math.pow(0.88, dt * 60);
    player.vx *= drag;
    player.vy *= drag;
    return true;
  }
  if (player.stealTimer > 0) {
    player.stealTimer = Math.max(0, player.stealTimer - dt);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    const drag = Math.pow(0.91, dt * 60);
    player.vx *= drag;
    player.vy *= drag;
    return true;
  }
  if (player.stumbleTimer > 0) {
    player.stumbleTimer = Math.max(0, player.stumbleTimer - dt);
    player.x += player.vx * dt * 0.45;
    player.y += player.vy * dt * 0.45;
    player.vx *= Math.pow(0.8, dt * 60);
    player.vy *= Math.pow(0.8, dt * 60);
    return true;
  }
  return false;
}

export function resolvePlayerCollisions(state: MatchState) {
  const active = state.players.filter((player) => !player.sentOff);
  for (let firstIndex = 0; firstIndex < active.length; firstIndex += 1) {
    const first = active[firstIndex];
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < active.length;
      secondIndex += 1
    ) {
      const second = active[secondIndex];
      let dx = second.x - first.x;
      let dy = second.y - first.y;
      let separation = Math.hypot(dx, dy);
      const minimum = first.role === "GK" || second.role === "GK" ? 1.55 : 1.42;
      if (separation >= minimum) continue;
      if (separation < 0.01) {
        dx = first.id % 2 === 0 ? 1 : -1;
        dy = second.id % 2 === 0 ? 0.5 : -0.5;
        separation = Math.hypot(dx, dy);
      }
      const overlap = minimum - separation;
      const totalMass = first.mass + second.mass;
      const firstShare = second.mass / totalMass;
      const secondShare = first.mass / totalMass;
      const nx = dx / separation;
      const ny = dy / separation;
      const firstLocked = first.slideTimer > 0 || first.keeperDiveTimer > 0;
      const secondLocked = second.slideTimer > 0 || second.keeperDiveTimer > 0;
      if (!firstLocked) {
        first.x -= nx * overlap * firstShare;
        first.y -= ny * overlap * firstShare;
      }
      if (!secondLocked) {
        second.x += nx * overlap * secondShare;
        second.y += ny * overlap * secondShare;
      }
      const relative =
        (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
      if (relative < 0) {
        const impulse = -(1.12 * relative) / (1 / first.mass + 1 / second.mass);
        first.vx -= (nx * impulse) / first.mass;
        first.vy -= (ny * impulse) / first.mass;
        second.vx += (nx * impulse) / second.mass;
        second.vy += (ny * impulse) / second.mass;
        if (first.side !== second.side && -relative > 14) {
          const weaker = first.strength < second.strength ? first : second;
          weaker.stumbleTimer = Math.max(weaker.stumbleTimer, 0.1);
        }
      }
    }
  }
}

export function awardTacklePossession(state: MatchState, player: Player, carrier?: Player) {
  Object.assign(state.ball, { owner: player.id, lastTouch: player.side, lastPlayerId: player.id,
    x: player.x + player.facingX, y: player.y + player.facingY, z: 0.12, vx: 0, vy: 0, vz: 0, spin: 0, looseTimer: 0 });
  player.possessionTime = 0;
  player.controlShield = controlShieldDuration(player);
  player.decisionCooldown = 0.28;
  player.stealTimer = 0;
  player.slideTimer = Math.min(player.slideTimer, 0.16);
  player.defensiveState = "recover";
  if (carrier) { carrier.controlShield = 0; carrier.possessionTime = 0; }
  state.pressure.ownerId = null;
  if (player.side === "home") state.selectedId = player.id;
  else if (state.gameMode === "local2p") state.selectedAwayId = player.id;
  state.cameraShake = Math.max(state.cameraShake, 0.18);
  setMessage(state, "DESARME LIMPO", 0.6);
}

export function tackleContact(state: MatchState, tackler: Player, sliding: boolean): "ball" | "foul" | "none" {
  const carrier = getPlayer(state, state.ball.owner);
  if (carrier?.side === tackler.side) return "none";
  if (carrier?.role === "GK" && insideKeeperArea(state, carrier)) {
    return distance(tackler.x, tackler.y, carrier.x, carrier.y) < 1.9 ? "foul" : "none";
  }
  const ballDistance = distance(tackler.x, tackler.y, state.ball.x, state.ball.y);
  const reach = (sliding ? 2.45 : 2.05) + (tackler.defending - 75) * 0.014;
  if (carrier) {
    const bodyDistance = distance(tackler.x, tackler.y, carrier.x, carrier.y);
    const rear = ((tackler.x - carrier.x) * carrier.facingX + (tackler.y - carrier.y) * carrier.facingY) / Math.max(0.001, bodyDistance) < -0.3;
    // A foot cannot reach the ball through the carrier's body.
    if (bodyDistance < (sliding ? 2.15 : 1.9) && rear && ballDistance > bodyDistance - 0.25) return "foul";
    if (sliding && bodyDistance < 1.65 && ballDistance > reach) return "foul";
  }
  const alignment = ((state.ball.x - tackler.x) * tackler.facingX + (state.ball.y - tackler.y) * tackler.facingY) / Math.max(0.01, ballDistance);
  return state.ball.z < (sliding ? 0.85 : 1.25) && ballDistance <= reach && alignment > -0.15 ? "ball" : "none";
}

export function resolveStealAttempts(state: MatchState, demo: boolean) {
  for (const player of state.players) {
    if (player.stealTimer <= 0 || player.stealHit || player.sentOff) continue;
    const contact = tackleContact(state, player, false);
    if (contact === "none") continue;
    player.stealHit = true;
    const carrier = getPlayer(state, state.ball.owner);
    if (contact === "foul" && carrier) {
      player.stealTimer = 0;
      carrier.stumbleTimer = 0.3;
      commitFoul(state, player, carrier, demo);
      if (state.setPiece) return;
    } else if (contact === "ball") {
      if (Math.hypot(state.ball.vx, state.ball.vy) < 32 || carrier) awardTacklePossession(state, player, carrier);
      else {
        Object.assign(state.ball, { vx: player.facingX * 15, vy: player.facingY * 15, vz: 1.5,
          lastTouch: player.side, lastPlayerId: player.id, looseTimer: 0.12 });
        setMessage(state, "INTERCEPTAÇÃO", 0.5);
      }
    }
  }
}

export function resolveKeeperSmothers(state: MatchState) {
  const carrier = getPlayer(state, state.ball.owner);
  if (!carrier || carrier.role === "GK") return;
  const keeper = state.players.find(
    (candidate) =>
      candidate.side !== carrier.side &&
      candidate.role === "GK" &&
      !candidate.sentOff,
  );
  if (
    !keeper ||
    keeper.tackleCooldown > 0 ||
    keeper.keeperReactionTimer > 0 ||
    !insideKeeperArea(state, keeper) ||
    carrier.y < 15 ||
    carrier.y > 49
  )
    return;
  const keeperDefendsLeft = defendingGoalX(state, keeper.side) === 0;
  const insideKeeperBox = keeperDefendsLeft
    ? carrier.x < 18.5
    : carrier.x > 81.5;
  const contactDistance = distance(keeper.x, keeper.y, carrier.x, carrier.y);
  if (!insideKeeperBox || contactDistance >= 2.45) return;

  keeper.tackleCooldown = 0.85;
  keeper.keeperSave = "smother";
  keeper.keeperDiveTimer = 0.5;
  const facingCarrier =
    keeper.facingX * (carrier.x - keeper.x) +
      keeper.facingY * (carrier.y - keeper.y) >
    0;
  const smotherChance = clamp(
    0.74 +
      (keeper.keeperDiveTimer > 0 ? 0.1 : 0) +
      (facingCarrier ? 0.04 : -0.05) -
      (carrier.controlShield > 0 ? 0.13 : 0) +
      (keeper.overall - carrier.overall) * 0.006,
    0.5,
    0.89,
  );

  if (random(state) < smotherChance) {
    state.ball.owner = keeper.id;
    state.ball.lastTouch = keeper.side;
    state.ball.lastPlayerId = keeper.id;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.ball.vz = 0;
    state.ball.z = 0.7;
    keeper.controlShield = 0.82;
    keeper.decisionCooldown = 0.78;
    carrier.controlShield = 0;
    carrier.stumbleTimer = 0.22;
    carrier.vx *= 0.28;
    carrier.vy *= 0.28;
    state.cameraShake = Math.max(state.cameraShake, 0.32);
    state.impactFlash = Math.max(state.impactFlash, 0.12);
    setMessage(state, "GOLEIRO ABAFA!", 0.76);
    return;
  }

  const awayFromGoal = attackDirectionFor(state, keeper.side);
  state.ball.owner = null;
  state.ball.x = keeper.x + awayFromGoal * 1.2;
  state.ball.y = keeper.y;
  state.ball.z = 0.2;
  state.ball.vx = awayFromGoal * 17 + carrier.vx * 0.25;
  state.ball.vy = Math.sign(carrier.y - 32 || 1) * 8;
  state.ball.vz = 1.7;
  state.ball.lastTouch = keeper.side;
  state.ball.lastPlayerId = keeper.id;
  state.ball.looseTimer = 0.16;
  carrier.stumbleTimer = 0.14;
  state.cameraShake = Math.max(state.cameraShake, 0.26);
  setMessage(state, "GOLEIRO SALVA COM O PÉ!", 0.72);
}

export function resolveSlideTackles(state: MatchState, demo: boolean) {
  for (const player of state.players) {
    if (player.slideTimer <= 0 || player.slideHit || player.sentOff) continue;
    const contact = tackleContact(state, player, true);
    const victim = getPlayer(state, state.ball.owner) ?? state.players.find(p =>
      p.side !== player.side && !p.sentOff && distance(p.x, p.y, player.x, player.y) < 1.65);
    if (contact === "none" && !victim) continue;
    if (contact === "none" && (state.ball.owner !== null || !victim)) continue;
    player.slideHit = true;
    if (contact === "ball") {
      awardTacklePossession(state, player, victim);
      setMessage(state, "CARRINHO NA BOLA", 0.6);
    } else if (victim) {
      victim.stumbleTimer = 0.5;
      commitFoul(state, player, victim, demo);
      if (state.setPiece) return;
    }
  }
}

export function movementIntent(input: InputState, side: Side, gameMode: GameMode) {
  const usesHomeKeys = gameMode === "solo" || side === "home";
  const usesAwayKeys = gameMode === "solo" || side === "away";
  let dx =
    (usesHomeKeys && input.keys.has("KeyD") ? 1 : 0) -
    (usesHomeKeys && input.keys.has("KeyA") ? 1 : 0) +
    (usesAwayKeys && input.keys.has("ArrowRight") ? 1 : 0) -
    (usesAwayKeys && input.keys.has("ArrowLeft") ? 1 : 0);
  let dy =
    (usesHomeKeys && input.keys.has("KeyS") ? 1 : 0) -
    (usesHomeKeys && input.keys.has("KeyW") ? 1 : 0) +
    (usesAwayKeys && input.keys.has("ArrowDown") ? 1 : 0) -
    (usesAwayKeys && input.keys.has("ArrowUp") ? 1 : 0);
  if (side === "home") {
    dx += input.touchX;
    dy += input.touchY;
  }
  const controller = input.controllers?.[side];
  if (controller && Math.hypot(controller.x, controller.y) > Math.hypot(dx, dy)) {
    dx = controller.x; dy = controller.y;
  }
  const magnitude = Math.hypot(dx, dy);
  if (magnitude > 1) {
    dx /= magnitude;
    dy /= magnitude;
  }
  return { x: dx, y: dy, magnitude };
}

export function updateHuman(
  player: Player,
  input: InputState,
  dt: number,
  gameMode: GameMode,
  ability: number,
) {
  const { x: dx, y: dy, magnitude } = movementIntent(input, player.side, gameMode);
  const sprint = input.controllers?.[player.side]?.sprint ||
    (player.side === "home" &&
      (input.keys.has("ShiftLeft") ||
        input.touchSprint ||
        Math.hypot(input.touchX, input.touchY) > 0.82)) ||
    (player.side === "away" &&
      (input.keys.has("ShiftRight") || input.keys.has("Enter"))) ||
    (gameMode === "solo" && input.keys.has("ShiftRight"));
  const canSprint = sprint && player.stamina > 3 && magnitude > 0.1;
  const fatigue = 0.78 + 0.22 * clamp(player.stamina / 45, 0, 1);
  const speed = (canSprint ? 19.5 : 13.6) * ability * fatigue;
  const desiredX = dx * speed;
  const desiredY = dy * speed;
  applyMovementVelocity(player, desiredX, desiredY, dt);
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  if (magnitude > 0.1) {
    faceDirection(player, dx, dy, dt);
  }
  if (canSprint)
    player.stamina = Math.max(
      0,
      player.stamina - dt * (13 - player.endurance * 0.065),
    );
  else player.stamina = Math.min(100, player.stamina + dt * 4.4);
}

export function nearestPlayer(
  state: MatchState,
  side: Side,
  includeKeeper = false,
) {
  return state.players
    .filter(
      (player) =>
        player.side === side &&
        !player.sentOff &&
        (includeKeeper || player.role !== "GK"),
    )
    .sort(
      (a, b) =>
        distance(a.x, a.y, state.ball.x, state.ball.y) -
        distance(b.x, b.y, state.ball.x, state.ball.y),
    )[0];
}

export function attackProgressAt(state: MatchState, side: Side, x: number) {
  return attacksRight(state, side) ? x : FIELD_W - x;
}

export function xFromAttackProgress(
  state: MatchState,
  side: Side,
  progress: number,
) {
  return attacksRight(state, side) ? progress : FIELD_W - progress;
}

export function roleProgressBounds(role: Role, tactic: TacticDefinition) {
  if (role === "DF") {
    return {
      min: 5,
      max: tactic.id === "attacking" ? 62 : tactic.id === "defensive" ? 48 : 56,
    };
  }
  if (role === "MF") {
    return {
      min: tactic.id === "defensive" ? 14 : 19,
      max: tactic.id === "attacking" ? 84 : 79,
    };
  }
  if (role === "FW") {
    return {
      min: tactic.id === "attacking" ? 51 : tactic.id === "defensive" ? 42 : 47,
      max: 97,
    };
  }
  return { min: 2, max: 18 };
}

export function pressingPlayer(state: MatchState, side: Side) {
  const owner = getPlayer(state, state.ball.owner);
  const targetX = owner?.x ?? state.ball.x;
  const targetY = owner?.y ?? state.ball.y;
  const ballProgress = attackProgressAt(state, side, targetX);
  const tactic = TACTICS[side === "home" ? state.homeTactic : state.awayTactic];
  return state.players
    .filter(
      (player) =>
        player.side === side && !player.sentOff && player.role !== "GK",
    )
    .sort((first, second) => {
      const score = (player: Player) => {
        const bounds = roleProgressBounds(player.role, tactic);
        const outsideRole =
          Math.max(0, bounds.min - ballProgress) +
          Math.max(0, ballProgress - bounds.max);
        const wrongLinePenalty =
          (ballProgress < 38 && player.role === "FW" ? 34 : 0) +
          (ballProgress > 66 && player.role === "DF" ? 24 : 0);
        const specialistBonus =
          player.archetype === "stopper"
            ? -2.4
            : player.archetype === "engine"
              ? -1.1
              : 0;
        return (
          distance(player.x, player.y, targetX, targetY) +
          outsideRole * 4.8 +
          wrongLinePenalty +
          specialistBonus
        );
      };
      return score(first) - score(second);
    })[0];
}

export function predictBallAtX(ball: Ball, targetX: number) {
  if (Math.abs(ball.vx) < 0.01) return null;
  const time = (targetX - ball.x) / ball.vx;
  if (time <= 0 || time > 3.2) return null;
  return {
    time,
    y: ball.y + ball.vy * time + ball.spin * time * time * 0.08,
    z: Math.max(0, ball.z + ball.vz * time - 9.25 * time * time),
  };
}

export function predictBallLanding(ball: Ball) {
  if (ball.z <= 0.08 && ball.vz <= 0) {
    return { x: ball.x, y: ball.y, time: 0 };
  }
  const gravity = 18.5;
  const time = clamp(
    (ball.vz +
      Math.sqrt(ball.vz * ball.vz + 2 * gravity * Math.max(0, ball.z))) /
      gravity,
    0,
    2.6,
  );
  const travelScale = 0.91 + Math.min(0.07, time * 0.025);
  return {
    x: ball.x + ball.vx * time * travelScale,
    y: ball.y + ball.vy * time * travelScale + ball.spin * time * time * 0.065,
    time,
  };
}

export function chooseKeeperDistributionTarget(
  state: MatchState,
  keeper: Player,
) {
  const teammates = state.players.filter(
    (candidate) =>
      candidate.side === keeper.side &&
      candidate.role !== "GK" &&
      !candidate.sentOff,
  );
  const opponents = state.players.filter(
    (candidate) => candidate.side !== keeper.side && !candidate.sentOff,
  );
  let best: Player | undefined;
  let bestScore = -Infinity;
  teammates.forEach((candidate) => {
    const passDistance = distance(keeper.x, keeper.y, candidate.x, candidate.y);
    const forward =
      (candidate.x - keeper.x) * attackDirectionFor(state, keeper.side);
    const space = Math.min(
      14,
      ...opponents.map((opponent) =>
        distance(candidate.x, candidate.y, opponent.x, opponent.y),
      ),
    );
    const blockedLane = opponents.some(
      (opponent) =>
        pointToSegmentDistance(
          opponent.x,
          opponent.y,
          keeper.x,
          keeper.y,
          candidate.x,
          candidate.y,
        ) < 2.6 &&
        distance(keeper.x, keeper.y, opponent.x, opponent.y) < passDistance,
    );
    const widthBonus = Math.abs(candidate.y - 32) * 0.14;
    const score =
      forward * 0.38 +
      space * 2.1 +
      widthBonus -
      Math.abs(passDistance - 28) * 0.42 -
      (blockedLane ? 19 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return best;
}

export function keeperAngleTarget(state: MatchState, player: Player) {
  const owner = getPlayer(state, state.ball.owner);
  const goal = defendingGoalX(state, player.side), direction = goal === 0 ? 1 : -1;
  const lead = owner && owner.side !== player.side ? clamp(0.12 + (player.overall - 60) * 0.004, 0.12, 0.28) : 0;
  const x = (owner?.x ?? state.ball.x) + (owner?.vx ?? 0) * lead;
  const y = clamp((owner?.y ?? state.ball.y) + (owner?.vy ?? 0) * lead, 0, 64);
  const depth = Math.max(0.1, Math.abs(x - goal));
  const targetX = goal + direction * clamp(2.6 + (30 - depth) * 0.15, 2.6, 6);
  const top = Math.hypot(goal - x, GOAL_TOP - y), bottom = Math.hypot(goal - x, GOAL_BOTTOM - y);
  const bisectorX = (goal - x) / Math.max(0.1, top) + (goal - x) / Math.max(0.1, bottom);
  const bisectorY = (GOAL_TOP - y) / Math.max(0.1, top) + (GOAL_BOTTOM - y) / Math.max(0.1, bottom);
  return { x: targetX, y: clamp(Math.abs(bisectorX) > 0.01 ? y + (targetX - x) * bisectorY / bisectorX : 32, 24.6, 39.4) };
}

export function updateKeeper(state: MatchState, player: Player, dt: number) {
  const ownLeft = defendingGoalX(state, player.side) === 0;
  const keeperAbility =
    teamAbility(state, player.side) *
    playerAttributeFactor(player.overall) *
    0.94;
  const owner = getPlayer(state, state.ball.owner);
  const goalX = ownLeft ? 0 : FIELD_W;
  const baseX = ownLeft ? 4.8 : 95.2;
  const keeperLineX = clamp(player.x, ownLeft ? 2.2 : 93.5, ownLeft ? 6.5 : 97.8);
  const opponentOwner = owner && owner.side !== player.side ? owner : null;
  const threatY = opponentOwner?.y ?? state.ball.y;
  const angle = keeperAngleTarget(state, player);
  let targetX = angle.x;
  let targetY = angle.y;
  let keeperSpeed = 14.8;

  player.keeperCommitTimer = Math.max(0, player.keeperCommitTimer - dt);
  if (player.keeperDiveTimer <= 0 && !player.keeperShotPending) player.keeperSave = "set";
  player.keeperReactionTimer = Math.max(0, player.keeperReactionTimer - dt);

  if (state.ball.owner === player.id) {
    movePlayer(
      player,
      baseX,
      clamp(player.y, 27, 37),
      10.8 * keeperAbility,
      dt,
    );
    player.decisionCooldown -= dt;
    if (player.decisionCooldown <= 0) {
      const target = chooseKeeperDistributionTarget(state, player);
      if (target) {
        const targetDistance = distance(player.x, player.y, target.x, target.y);
        const closePressure = state.players.some(
          (opponent) =>
            opponent.side !== player.side &&
            !opponent.sentOff &&
            distance(player.x, player.y, opponent.x, opponent.y) < 7,
        );
        kickBall(
          state,
          player,
          target.x + target.vx * 0.34,
          target.y + target.vy * 0.34,
          (closePressure ? 38 : clamp(29 + targetDistance * 0.19, 31, 37)) *
            keeperAbility,
          closePressure ? "clear" : "pass",
          closePressure ? 7.4 : 2.8,
        );
      } else {
        kickBall(
          state,
          player,
          ownLeft ? 48 : 52,
          32,
          39 * keeperAbility,
          "clear",
          8,
        );
      }
      player.decisionCooldown = 1.15;
    }
    return;
  }

  const ballInBox = ownLeft ? state.ball.x < 18.5 : state.ball.x > 81.5;
  const ballMovingTowardGoal =
    state.ball.owner === null &&
    (ownLeft ? state.ball.vx < -4 : state.ball.vx > 4);
  const goalPrediction = ballMovingTowardGoal
    ? predictBallAtX(state.ball, goalX)
    : null;
  const shotThreat =
    goalPrediction !== null &&
    goalPrediction.y > GOAL_TOP - 3.2 &&
    goalPrediction.y < GOAL_BOTTOM + 3.2 &&
    goalPrediction.z < 7.4;

  if (shotThreat && goalPrediction) {
    targetX = keeperLineX;
    if (player.keeperReactionTimer <= 0) {
      const interception = predictBallAtX(state.ball, keeperLineX) ?? goalPrediction;
      const predictedTargetY = clamp(
        interception.y,
        GOAL_TOP + 0.35,
        GOAL_BOTTOM - 0.35,
      );
      if (
        player.keeperCommitTimer <= 0 ||
        (goalPrediction.time > 0.52 &&
          Math.abs(predictedTargetY - player.keeperTargetY) > 1.4)
      ) {
        player.keeperTargetY = predictedTargetY;
        player.keeperCommitTimer = 0.16;
      }
      targetY = player.keeperTargetY;
      keeperSpeed =
        goalPrediction.time < 0.46
          ? 17.5
          : goalPrediction.time < 0.82
            ? 15.5
            : 13.5;
      const reachY = Math.abs(targetY - player.y);
      const highBall = interception.z > 2.4;
      if (interception.time < 0.7 && player.keeperCommitTimer <= 0.16 && player.keeperShotPending) {
        player.keeperSave = highBall && reachY < 3 ? "tip" : "dive";
        player.keeperDiveTimer = 0.56;
        player.keeperDiveDirection = Math.sign(targetY - player.y) || 1;
        player.keeperShotPending = false;
        player.keeperCommitTimer = 0.56;
      }
    } else {
      // Before recognition the keeper stays set; no trajectory tracking through the reaction delay.
      targetX = player.x; targetY = player.y; keeperSpeed = 0;
    }
  } else if (state.ball.owner === null && state.ball.z > 0.3) {
    const landing = predictBallLanding(state.ball);
    const landingInBox = ownLeft ? landing.x < 18.5 : landing.x > 81.5;
    const keeperDistance = distance(player.x, player.y, landing.x, landing.y);
    const nearestOpponentDistance = Math.min(
      40,
      ...state.players
        .filter(
          (candidate) => candidate.side !== player.side && !candidate.sentOff,
        )
        .map((candidate) =>
          distance(candidate.x, candidate.y, landing.x, landing.y),
        ),
    );
    const canClaimCross =
      landingInBox &&
      landing.y > 9 &&
      landing.y < 55 &&
      landing.time > 0.08 &&
      keeperDistance / 21 < landing.time + 0.16 &&
      keeperDistance < nearestOpponentDistance + 2.4;
    if (canClaimCross) {
      targetX = clamp(landing.x, ownLeft ? 3 : 83, ownLeft ? 17 : 97);
      targetY = clamp(landing.y, 8, 56);
      keeperSpeed = 21;
      if (keeperDistance < 4.2) {
        player.keeperSave = "tip";
        player.keeperDiveTimer = Math.max(player.keeperDiveTimer, 0.24);
        player.keeperDiveDirection = Math.sign(targetY - player.y) || 1;
      }
    }
  }

  if (!shotThreat && owner && owner.side !== player.side) {
    const defenderDistance = Math.min(
      30,
      ...state.players
        .filter(
          (candidate) =>
            candidate.side === player.side &&
            candidate.role !== "GK" &&
            !candidate.sentOff,
        )
        .map((candidate) =>
          distance(candidate.x, candidate.y, owner.x, owner.y),
        ),
    );
    const ownerGoalDistance = Math.abs(owner.x - goalX);
    const centralThreat = Math.abs(owner.y - 32) < 16;
    const shouldRush =
      ballInBox &&
      ownerGoalDistance < 15.5 &&
      defenderDistance > 4.1 &&
      centralThreat;
    if (shouldRush) {
      const rushFactor = clamp((17 - ownerGoalDistance) / 13, 0.24, 0.72);
      targetX = clamp(
        goalX + (owner.x - goalX) * rushFactor,
        ownLeft ? 3.4 : 84,
        ownLeft ? 16 : 96.6,
      );
      targetY = clamp(32 + (owner.y - 32) * 0.68, 18, 46);
      keeperSpeed = 19.2;
      if (distance(player.x, player.y, owner.x, owner.y) < 5.4) {
        player.keeperSave = "smother";
        player.keeperDiveTimer = Math.max(player.keeperDiveTimer, 0.42);
        player.keeperDiveDirection = Math.sign(owner.y - player.y) || 1;
      }
    }
  }

  if (
    !shotThreat &&
    state.ball.owner === null &&
    ballInBox &&
    state.ball.z < 1.8
  ) {
    const keeperDistance = distance(
      player.x,
      player.y,
      state.ball.x,
      state.ball.y,
    );
    const opponentDistance = Math.min(
      40,
      ...state.players
        .filter(
          (candidate) => candidate.side !== player.side && !candidate.sentOff,
        )
        .map((candidate) =>
          distance(candidate.x, candidate.y, state.ball.x, state.ball.y),
        ),
    );
    const keeperArrival = keeperDistance / 20;
    const opponentArrival = opponentDistance / 14.2;
    if (keeperDistance < 13 && keeperArrival + 0.12 < opponentArrival) {
      targetX = clamp(state.ball.x, ownLeft ? 3 : 83, ownLeft ? 17 : 97);
      targetY = clamp(state.ball.y, 8, 56);
      keeperSpeed = 20;
    }
  }

  movePlayer(player, targetX, targetY, keeperSpeed * keeperAbility, dt);
  if (Math.hypot(player.vx, player.vy) < 0.35) {
    player.facingX = ownLeft ? 1 : -1;
    player.facingY = clamp((threatY - player.y) * 0.08, -0.7, 0.7);
  }
}

export function findMarkTarget(state: MatchState, marker: Player) {
  const chaser = pressingPlayer(state, marker.side);
  const available = state.players.filter(
    (p) =>
      p.side === marker.side &&
      !p.sentOff &&
      (p.role === "DF" || p.role === "MF") &&
      p.id !== chaser?.id,
  );
  const threats = state.players
    .filter(
      (p) =>
        p.side !== marker.side &&
        !p.sentOff &&
        p.role !== "GK" &&
        p.id !== state.ball.owner,
    )
    .sort(
      (a, b) =>
        attackProgressAt(state, marker.side, a.x) -
          attackProgressAt(state, marker.side, b.x) || a.id - b.id,
    );
  for (const threat of threats) {
    let best = -1,
      cost = Infinity;
    available.forEach((p, i) => {
      const c =
        distance(p.x, p.y, threat.x, threat.y) +
        Math.abs(p.homeY - threat.y) * 0.35 +
        (p.role === "DF" ? -3 : 0);
      if (c < cost) {
        cost = c;
        best = i;
      }
    });
    if (best < 0) break;
    if (available.splice(best, 1)[0].id === marker.id) return threat;
  }
  return undefined;
}

export function aiTarget(
  state: MatchState,
  player: Player,
  chaser: Player | undefined,
  dt: number,
) {
  const owner = getPlayer(state, state.ball.owner);
  const teamHasBall = owner?.side === player.side;
  const attackDirection = attackDirectionFor(state, player.side);
  const tactic =
    TACTICS[player.side === "home" ? state.homeTactic : state.awayTactic];
  const difficultyBoost =
    player.side === "away"
      ? state.difficulty === "easy"
        ? 0.9
        : state.difficulty === "hard"
          ? 1.13
          : 1
      : 1;
  const abilityBoost =
    teamAbility(state, player.side) * playerAttributeFactor(player.pace);
  const bounds = roleProgressBounds(player.role, tactic);
  const baseProgress = attackProgressAt(
    state,
    player.side,
    formationXFor(state, player),
  );
  const ballProgress = attackProgressAt(
    state,
    player.side,
    owner?.x ?? state.ball.x,
  );
  const compressionByRole =
    player.role === "DF" ? 0.1 : player.role === "MF" ? 0.16 : 0.12;
  const possessionRun = teamHasBall
    ? tactic.forwardRuns *
      (player.role === "FW" ? 0.72 : player.role === "MF" ? 0.38 : 0.12)
    : tactic.id === "defensive"
      ? -2.4
      : 0;
  const anchorProgress = clamp(
    baseProgress +
      tactic.line +
      clamp(ballProgress - 50, -32, 32) * compressionByRole +
      possessionRun,
    bounds.min,
    bounds.max,
  );
  const anchorY = clamp(
    32 + (player.homeY - 32) * tactic.width,
    4,
    FIELD_H - 4,
  );

  player.stamina = clamp(
    player.stamina +
      (Math.hypot(player.vx, player.vy) > 13.5
        ? -(10 - player.endurance * 0.055)
        : 3.2) *
        dt,
    0,
    100,
  );
  if (state.ball.owner === player.id) {
    const goalX = attackingGoalX(state, player.side, 1);
    const opponents = state.players.filter(
      (p) => p.side !== player.side && !p.sentOff,
    );
    const closest = opponents.reduce<Player | undefined>(
      (best, p) =>
        !best ||
        distance(player.x, player.y, p.x, p.y) <
          distance(player.x, player.y, best.x, best.y)
          ? p
          : best,
      undefined,
    );
    const pressure = closest
      ? distance(player.x, player.y, closest.x, closest.y)
      : 20;
    const progress = attackProgressAt(state, player.side, player.x);
    const width =
      player.archetype === "sprinter" && progress < 76
        ? Math.sign(player.homeY - 32 || 1) * 15
        : 0;
    const avoid =
      closest && pressure < 8
        ? Math.sign(player.y - closest.y || player.homeY - 32 || 1) *
          (8 - pressure)
        : 0;
    movePlayer(
      player,
      goalX,
      clamp(32 + width + avoid, 7, 57),
      11.7 * difficultyBoost * abilityBoost * tactic.tempo,
      dt,
    );
    player.decisionCooldown -= dt;
    if (player.decisionCooldown > 0) return;
    player.decisionCooldown = clamp(
      0.85 - (player.overall - 60) * 0.013,
      0.32,
      0.9,
    );
    const keeper = opponents.find((p) => p.role === "GK");
    const corner = (keeper?.y ?? 32) < 32 ? GOAL_BOTTOM - 1.8 : GOAL_TOP + 1.8;
    const shotDistance = distance(player.x, player.y, goalX, 32);
    const blocked = opponents.some(
      (p) =>
        p.role !== "GK" &&
        (p.x - player.x) * attackDirection > 0 &&
        pointToSegmentDistance(p.x, p.y, player.x, player.y, goalX, corner) < 2,
    );
    if (
      progress > 70 - (player.shooting - 78) * 0.13 &&
      Math.abs(player.y - 32) < 17 &&
      shotDistance < 34 &&
      (!blocked || shotDistance < 19 || pressure < 3)
    ) {
      state.lastShotStyle =
        shotDistance < 18 ? "CHUTE COLOCADO" : "FINALIZAÇÃO";
      kickBall(
        state,
        player,
        goalX,
        finishingTargetY(state, player, corner, 5.2),
        (shotDistance < 18 ? 40 : 49) *
          teamAbility(state, player.side) *
          playerAttributeFactor(player.shooting),
        "shot",
        shotDistance < 18 ? 3.2 : 5.1,
      );
      player.decisionCooldown = 0.8;
      return;
    }
    const receiver = choosePassTarget(state, player);
    if (receiver) {
      const forward = (receiver.x - player.x) * attackDirection;
      const space = Math.min(
        15,
        ...opponents.map((p) => distance(receiver.x, receiver.y, p.x, p.y)),
      );
      const shouldPass =
        (pressure < 3.6 && player.possessionTime > 0.28) ||
        (player.possessionTime > 1.1 && forward > 7 && space > 3) ||
        (player.archetype === "creator" &&
          player.possessionTime > 1.6 &&
          forward > 2 &&
          space > 5) ||
        (player.possessionTime > 0.6 &&
          Math.abs(player.y - 32) > 16 &&
          progress > 72 &&
          Math.abs(receiver.y - 32) < 13);
      if (passLaneRisk(state, player, receiver) < 0.62 && shouldPass)
        passToPlayer(state, player, receiver);
    }
    return;
  }

  const intent = state.passIntent;
  if (intent && intent.receiverId === player.id && intent.expires > state.elapsed &&
      state.ball.owner === null && state.ball.lastTouch === player.side) {
    const landing = predictBallLanding(state.ball);
    const lead = clamp(distance(player.x, player.y, state.ball.x, state.ball.y) / 45, .08, .45);
    const requestedX = state.ball.z > 1.4 ? landing.x : state.ball.x + state.ball.vx * lead;
    const requestedY = state.ball.z > 1.4 ? landing.y : state.ball.y + state.ball.vy * lead;
    movePlayer(player, xFromAttackProgress(state, player.side,
      clamp(attackProgressAt(state, player.side, requestedX), bounds.min, bounds.max)),
      clamp(requestedY, 2, 62), 15.2 * abilityBoost * difficultyBoost, dt);
    return;
  }

  player.defensiveState = "shape";
  const secondPress = player.id === state.pressure.secondaryId && owner && !teamHasBall;
  if (secondPress) {
    player.defensiveState = "cover";
    const flank = Math.sign(owner.y - (chaser?.y ?? 32)) || (player.id % 2 ? 1 : -1);
    const progress = clamp(attackProgressAt(state, player.side, owner.x - attackDirection * 1.1), bounds.min, bounds.max);
    movePlayer(player, xFromAttackProgress(state, player.side, progress), clamp(owner.y + flank * 1.8, 3, 61),
      15.2 * difficultyBoost * abilityBoost * tactic.pressure, dt);
    return;
  }
  if (player.id === chaser?.id && (!teamHasBall || !owner)) {
    player.defensiveState = "chase";
    const lead = owner
      ? 0.22
      : clamp(
          distance(player.x, player.y, state.ball.x, state.ball.y) / 45,
          0.1,
          0.45,
        );
    const requestedX = owner
      ? owner.x + owner.vx * lead - attackDirection * 1.4
      : state.ball.x + state.ball.vx * lead;
    const targetY = clamp(
      owner ? owner.y + owner.vy * lead : state.ball.y + state.ball.vy * lead,
      3,
      61,
    );
    const requestedProgress = attackProgressAt(state, player.side, requestedX);
    const targetProgress = clamp(requestedProgress, bounds.min, bounds.max);
    const targetX = xFromAttackProgress(state, player.side, targetProgress);
    movePlayer(
      player,
      targetX,
      targetY,
      13.8 *
        difficultyBoost *
        abilityBoost *
        tactic.pressure *
        (player.archetype === "stopper" ? 1.05 : 1),
      dt,
    );
    return;
  }

  if (!teamHasBall && owner && (player.role === "DF" || player.role === "MF")) {
    const mark = findMarkTarget(state, player);
    if (mark) {
      const markProgress = attackProgressAt(
        state,
        player.side,
        mark.x - attackDirection * 3.1,
      );
      const disciplinedProgress = clamp(
        markProgress,
        Math.max(bounds.min, anchorProgress - 12),
        Math.min(bounds.max, anchorProgress + 12),
      );
      movePlayer(
        player,
        xFromAttackProgress(state, player.side, disciplinedProgress),
        clamp(mark.y, anchorY - 10, anchorY + 10),
        11.5 *
          difficultyBoost *
          abilityBoost *
          tactic.pressure *
          (player.archetype === "stopper" ? 1.05 : 1),
        dt,
      );
      return;
    }
  }

  const progressShift = clamp(ballProgress - anchorProgress, -16, 16) * 0.22;
  let targetProgress = clamp(
    anchorProgress + progressShift,
    bounds.min,
    bounds.max,
  );
  let targetY = anchorY;

  if (teamHasBall && owner) {
    const roleRun =
      player.role === "FW" ? 1 : player.role === "MF" ? 0.62 : 0.2;
    targetProgress = clamp(
      targetProgress + tactic.forwardRuns * roleRun,
      bounds.min,
      bounds.max,
    );
    targetY +=
      distance(player.x, player.y, owner.x, owner.y) < 11
        ? Math.sign(anchorY - owner.y || 1) * 6
        : clamp((owner.y - anchorY) * 0.12, -3, 3);
    if (player.role === "MF" && player.archetype === "creator")
      targetProgress = clamp(ballProgress - 7, bounds.min, bounds.max);
    if (
      player.role === "MF" &&
      Math.abs(owner.homeY - player.homeY) < 12 &&
      ballProgress > 50 &&
      tactic.id === "attacking"
    ) {
      targetProgress = clamp(ballProgress + 12, bounds.min, bounds.max);
      targetY = clamp(owner.y + Math.sign(player.homeY - 32 || 1) * 10, 5, 59);
    }
    const lines = state.players
      .filter((p) => p.side !== player.side && !p.sentOff)
      .map((p) => attackProgressAt(state, player.side, p.x))
      .sort((a, b) => b - a);
    targetProgress = Math.min(
      targetProgress,
      Math.max(bounds.min, Math.max(50, ballProgress, lines[1] ?? 98) - 1.6),
    );
    if (player.archetype === "sprinter") {
      targetY += Math.sign(player.homeY - 32 || 1) * 3.2;
    } else if (player.archetype === "creator") {
      targetY += (32 - targetY) * 0.2;
    }
  }
  movePlayer(
    player,
    xFromAttackProgress(state, player.side, targetProgress),
    clamp(targetY, 4, FIELD_H - 4),
    10.3 * difficultyBoost * abilityBoost * tactic.tempo,
    dt,
  );
}

export function registerGoal(
  state: MatchState,
  scoringSide: Side,
  demo: boolean,
) {
  if (scoringSide === "home") state.homeScore += 1;
  else state.awayScore += 1;
  const scoringTeam = scoringSide === "home" ? state.homeTeam : state.awayTeam;
  const scorer = getPlayer(state, state.ball.lastPlayerId);
  const ownGoal = state.ball.lastTouch !== scoringSide;
  const goalLabel = ownGoal
    ? "GOL CONTRA"
    : (scorer?.name.toUpperCase() ?? scoringTeam.short) +
      " • " +
      state.lastShotStyle;
  setMessage(state, demo ? "GOL" : "GOOOOL • " + goalLabel, 1.8);
  const goalX =
    attackingGoalX(state, scoringSide) - attackDirectionFor(state, scoringSide);
  const colors = [
    scoringTeam.primary,
    scoringTeam.secondary,
    "#ffffff",
    "#ffd60a",
  ];
  const spectacular =
    state.lastShotStyle === "BOMBA" ||
    state.lastShotStyle === "GOL DE FALTA" ||
    state.lastShotStyle === "GOL OLÍMPICO";
  const amount = demo ? 20 : spectacular ? 92 : 68;
  for (let index = 0; index < amount; index += 1) {
    state.particles.push({
      x: goalX,
      y: 32,
      vx: (random(state) - 0.5) * 30,
      vy: (random(state) - 0.5) * 30,
      life: 0.8 + random(state) * 0.9,
      size: 1.5 + random(state) * 2.5,
      color: colors[index % colors.length],
    });
  }
  resetPositions(state, scoringSide === "home" ? "away" : "home");
  state.cameraShake = demo ? 0.35 : spectacular ? 1.15 : 0.88;
  state.impactFlash = demo ? 0.2 : 0.7;
  state.netPulse = 1;
}

export function dribbleTouchDistance(player: Player, elapsed: number) {
  const speed = Math.hypot(player.vx, player.vy),
    skill = ballControlRating(player);
  return (
    0.95 +
    Math.abs(Math.sin(elapsed * (8 + speed * 0.25) + player.id)) *
      (0.25 + speed * 0.045) +
    Math.max(0, speed - 12) * (0.038 + (100 - skill) * 0.0017)
  );
}
export function insideKeeperArea(state: MatchState, player: Player) {
  return (
    attackProgressAt(state, player.side, player.x) < 18 &&
    player.y >= 15 &&
    player.y <= 49
  );
}
export function updateBall(state: MatchState, dt: number, demo: boolean) {
  state.ball.looseTimer = Math.max(0, state.ball.looseTimer - dt);
  const owner = getPlayer(state, state.ball.owner);
  if (owner) {
    owner.possessionTime += dt;
    const movement = Math.hypot(owner.vx, owner.vy),
      skill = ballControlRating(owner);
    const touch = dribbleTouchDistance(owner, state.elapsed);
    const follow = 1 - Math.exp(-(12 + skill * 0.13) * dt);
    state.ball.x += (owner.x + owner.facingX * touch - state.ball.x) * follow;
    state.ball.y += (owner.y + owner.facingY * touch - state.ball.y) * follow;
    state.ball.z =
      owner.role === "GK"
        ? 0.7
        : 0.1 +
          Math.abs(Math.sin(state.elapsed * 13 + owner.id)) *
            Math.min(0.18, movement * 0.008);
    state.ball.vx = owner.vx;
    state.ball.vy = owner.vy;
    state.ball.vz = 0;
    state.ball.lastTouch = owner.side;
    state.ball.lastPlayerId = owner.id;
    if (owner.side === "home") state.stats.homePossession += dt;
    else state.stats.awayPossession += dt;
  } else {
    const previousX = state.ball.x;
    const previousY = state.ball.y;
    const previousZ = state.ball.z;
    const ballSpeedBeforeFriction = Math.hypot(state.ball.vx, state.ball.vy);
    if (ballSpeedBeforeFriction > 0.1 && Math.abs(state.ball.spin) > 0.05) {
      const curveStrength = state.ball.z > 0.2 ? 0.25 : 0.1;
      const perpendicularX = -state.ball.vy / ballSpeedBeforeFriction;
      const perpendicularY = state.ball.vx / ballSpeedBeforeFriction;
      state.ball.vx += perpendicularX * state.ball.spin * curveStrength * dt;
      state.ball.vy += perpendicularY * state.ball.spin * curveStrength * dt;
    }
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;
    state.ball.z += state.ball.vz * dt;
    state.ball.vz -= 18.5 * dt;

    if (state.ball.z <= 0) {
      state.ball.z = 0;
      if (previousZ > 0.02 && Math.abs(state.ball.vz) > 2.4) {
        state.ball.vz = -state.ball.vz * 0.38;
        state.ball.vx *= 0.94;
        state.ball.vy *= 0.94;
        state.ball.spin *= 0.8;
      } else {
        state.ball.vz = 0;
      }
    }

    if (ballSpeedBeforeFriction > 31) {
      state.trail.push({
        x: previousX,
        y: previousY,
        z: previousZ,
        life: clamp((ballSpeedBeforeFriction - 25) / 38, 0.2, 0.75),
      });
      if (state.trail.length > 18) state.trail.shift();
    }
    const friction = Math.pow(state.ball.z > 0.08 ? 0.996 : 0.981, dt * 60);
    state.ball.vx *= friction;
    state.ball.vy *= friction;
    state.ball.spin *= Math.pow(state.ball.z > 0.08 ? 0.992 : 0.955, dt * 60);

    const crossedRightGoalLine = previousX < FIELD_W && state.ball.x >= FIELD_W;
    const crossedLeftGoalLine = previousX > 0 && state.ball.x <= 0;
    if (crossedRightGoalLine || crossedLeftGoalLine) {
      const crossingLineX = crossedRightGoalLine ? FIELD_W : 0;
      const crossingProgress =
        state.ball.x === previousX
          ? 1
          : clamp(
              (crossingLineX - previousX) / (state.ball.x - previousX),
              0,
              1,
            );
      const crossingY =
        previousY + (state.ball.y - previousY) * crossingProgress;
      const crossingZ =
        previousZ + (state.ball.z - previousZ) * crossingProgress;
      const insidePosts = crossingY >= GOAL_TOP && crossingY <= GOAL_BOTTOM;
      const hitPost =
        insidePosts &&
        (Math.abs(crossingY - GOAL_TOP) < 0.72 ||
          Math.abs(crossingY - GOAL_BOTTOM) < 0.72) &&
        crossingZ < 5.8;
      const hitCrossbar = insidePosts && Math.abs(crossingZ - 5.15) < 0.62;

      if (hitPost || hitCrossbar) {
        state.ball.x = crossedRightGoalLine ? FIELD_W - 0.5 : 0.5;
        state.ball.y = clamp(crossingY, 0.4, FIELD_H - 0.4);
        state.ball.vx *= -0.68;
        state.ball.vy +=
          Math.sign(32 - crossingY || 1) * (4.5 + random(state) * 3);
        if (hitCrossbar) state.ball.vz = -Math.abs(state.ball.vz) * 0.48;
        state.ball.spin *= -0.55;
        state.cameraShake = Math.max(state.cameraShake, 0.7);
        state.impactFlash = Math.max(state.impactFlash, 0.42);
        setMessage(state, hitCrossbar ? "NO TRAVESSÃO!" : "NA TRAVE!", 0.9);
        for (let index = 0; index < 14; index += 1) {
          state.particles.push({
            x: state.ball.x,
            y: state.ball.y,
            vx: (random(state) - 0.5) * 9,
            vy: (random(state) - 0.5) * 9,
            life: 0.25 + random(state) * 0.35,
            size: 1 + random(state) * 1.5,
            color: "#ffffff",
          });
        }
        return;
      }

      if (insidePosts && crossingZ < 5.15) {
        registerGoal(
          state,
          attackingSideAtGoalLine(state, crossedRightGoalLine),
          demo,
        );
        return;
      }

      const attackingSide = attackingSideAtGoalLine(
        state,
        crossedRightGoalLine,
      );
      const defendingSide = oppositeSide(attackingSide);
      const isCorner = state.ball.lastTouch === defendingSide;
      startSetPiece(
        state,
        isCorner ? "corner" : "goalKick",
        isCorner ? attackingSide : defendingSide,
        crossedRightGoalLine ? 99 : 1,
        crossingY,
      );
      return;
    }

    const crossedTopTouchline = previousY > 0 && state.ball.y <= 0;
    const crossedBottomTouchline =
      previousY < FIELD_H && state.ball.y >= FIELD_H;
    if (crossedTopTouchline || crossedBottomTouchline) {
      startSetPiece(
        state,
        "throwIn",
        oppositeSide(state.ball.lastTouch),
        clamp(state.ball.x, 5, FIELD_W - 5),
        crossedTopTouchline ? 1.5 : FIELD_H - 1.5,
      );
      return;
    }

    let pickup: Player | undefined;
    let pickupDistance = Infinity;
    let blocker: Player | undefined;
    let blockerDistance = Infinity;
    const ballSpeed = Math.hypot(state.ball.vx, state.ball.vy);

    state.players.forEach((player) => {
      if (player.sentOff || player.slideTimer > 0 || player.stumbleTimer > 0)
        return;
      if (state.ball.looseTimer > 0 && player.id === state.ball.lastPlayerId) {
        return;
      }
      const d = pointToSegmentDistance(
        player.x,
        player.y,
        previousX,
        previousY,
        state.ball.x,
        state.ball.y,
      );
      const sameTeamPass = player.side === state.ball.lastTouch;
      const handling = player.role === "GK" && insideKeeperArea(state, player);
      if (handling && player.keeperReactionTimer > 0) return;
      const radius = handling
        ? 1.65 + (player.keeperDiveTimer > 0 ? 0.85 : 0)
        : 1.35 + (ballControlRating(player) - 60) * 0.013;
      const relative = Math.hypot(
        state.ball.vx - player.vx,
        state.ball.vy - player.vy,
      );
      const speed =
        (handling ? 68 : sameTeamPass ? 36 : 26) *
        playerAttributeFactor(handling ? player.overall : player.passing);
      const height = handling ? (player.keeperDiveTimer > 0 ? 4.9 : 3.7) : 1.5;
      if (
        d < radius &&
        relative < speed &&
        state.ball.z < height &&
        d < pickupDistance
      ) {
        pickup = player;
        pickupDistance = d;
      } else if (
        state.ball.z < (handling ? 4.5 : 2.1) &&
        relative >= speed &&
        d < (handling ? 2 : 1.2) &&
        d < blockerDistance
      ) {
        blocker = player;
        blockerDistance = d;
      }
    });
    if (!pickup && blocker) {
      let normalX = state.ball.x - blocker.x;
      let normalY = state.ball.y - blocker.y;
      let normalMagnitude = Math.hypot(normalX, normalY);
      if (normalMagnitude < 0.05) {
        normalX = -state.ball.vx;
        normalY = -state.ball.vy;
        normalMagnitude = Math.max(0.001, Math.hypot(normalX, normalY));
      }
      normalX /= normalMagnitude;
      normalY /= normalMagnitude;
      const impact = state.ball.vx * normalX + state.ball.vy * normalY;
      const reflectedX = state.ball.vx - 2 * impact * normalX;
      const reflectedY = state.ball.vy - 2 * impact * normalY;
      state.ball.vx = reflectedX * 0.52 + blocker.vx * 0.34;
      state.ball.vy = reflectedY * 0.52 + blocker.vy * 0.34;
      state.ball.vz = Math.max(
        1.2,
        Math.abs(state.ball.vz) * 0.28 + random(state) * 1.7,
      );
      state.ball.z = Math.max(0.16, state.ball.z);
      state.ball.spin = (random(state) - 0.5) * 7;
      state.ball.lastTouch = blocker.side;
      state.ball.lastPlayerId = blocker.id;
      state.ball.looseTimer = 0.1;
      blocker.stumbleTimer = ballSpeed > 48 ? 0.12 : 0.05;
      state.cameraShake = Math.max(
        state.cameraShake,
        ballSpeed > 40 ? 0.38 : 0.2,
      );
      state.impactFlash = Math.max(state.impactFlash, 0.12);
      if (ballSpeed > 33) setMessage(state, "BLOQUEIO!", 0.5);
      return;
    }
    if (pickup) {
      const handling = pickup.role === "GK" && insideKeeperArea(state, pickup);
      const incoming = Math.hypot(
          state.ball.vx - pickup.vx,
          state.ball.vy - pickup.vy,
        ),
        skill = ballControlRating(pickup);
      const heavyTouch = clamp(
        (incoming - 18) * 0.015 * (1.7 - skill / 70),
        0,
        0.4,
      );
      if (!handling && incoming > 18 && random(state) < heavyTouch) {
        const speed = Math.max(0.01, ballSpeed),
          cushion = clamp((100 - skill) * 0.14, 2, 8);
        state.ball.x = pickup.x + (state.ball.vx / speed) * 1.8;
        state.ball.y = pickup.y + (state.ball.vy / speed) * 1.8;
        state.ball.vx = (state.ball.vx / speed) * cushion + pickup.vx * 0.45;
        state.ball.vy = (state.ball.vy / speed) * cushion + pickup.vy * 0.45;
        state.ball.vz = 0.6;
        state.ball.z = 0.15;
        state.ball.lastTouch = pickup.side;
        state.ball.lastPlayerId = pickup.id;
        state.ball.looseTimer = 0.18;
        return;
      }
      pickup.action = "control";
      pickup.possessionTime = 0;
      pickup.actionTimer = 0.3;
      const catchChance =
        pickup.role === "GK"
          ? clamp(
              0.82 +
                (pickup.overall - 82) * 0.006 -
                Math.max(0, ballSpeed - 28) * 0.014 -
                Math.max(0, state.ball.z - 2.3) * 0.075 -
                (pickup.keeperDiveTimer > 0 ? 0.07 : 0),
              0.2,
              0.85,
            )
          : 0;
      if (handling && ballSpeed > 31 && random(state) > catchChance) {
        const wideDirection = state.ball.y < 32 ? -1 : 1;
        state.ball.owner = null;
        state.ball.lastTouch = pickup.side;
        state.ball.lastPlayerId = pickup.id;
        const tipping = pickup.keeperSave === "tip";
        state.ball.vx = attackDirectionFor(state, pickup.side) * (tipping ? -6 : 24);
        state.ball.vy = wideDirection * (tipping ? 5 : 26 + random(state) * 9);
        state.ball.z = Math.max(0.7, state.ball.z * 0.65);
        state.ball.vz = pickup.keeperSave === "tip" ? 10.8 : 3.8;
        state.ball.spin = (random(state) - 0.5) * 5;
        state.ball.looseTimer = 0.08;
        pickup.keeperDiveTimer = 0.38;
        pickup.keeperDiveDirection =
          Math.sign(state.ball.vy) || pickup.keeperDiveDirection || 1;
        setMessage(state, pickup.keeperSave === "tip" ? "POR CIMA DO TRAVESSÃO!" : "ESPALMA O GOLEIRO!", 0.8);
        return;
      }
      state.ball.owner = pickup.id;
      state.ball.lastTouch = pickup.side;
      state.ball.lastPlayerId = pickup.id;
      state.ball.vx = 0;
      state.ball.vy = 0;
      state.ball.z = pickup.role === "GK" ? 0.7 : 0.12;
      state.ball.vz = 0;
      pickup.controlShield =
        pickup.role === "GK" ? 0.7 : controlShieldDuration(pickup);
      pickup.decisionCooldown =
        pickup.role === "GK"
          ? 0.72
          : clamp(0.5 - (pickup.overall - 60) * 0.008, 0.18, 0.55);
      if (pickup.side === "home" && pickup.role !== "GK") {
        state.selectedId = pickup.id;
      } else if (
        pickup.side === "away" &&
        pickup.role !== "GK" &&
        state.gameMode === "local2p"
      ) {
        state.selectedAwayId = pickup.id;
      }
      if (pickup.role === "GK" && ballSpeed > 28) {
        setMessage(state, "DEFESAÇA!", 0.8);
      }
    }
  }
}

export function updateSteals(state: MatchState, dt: number, demo: boolean) {
  const owner = getPlayer(state, state.ball.owner);
  if (state.setPiece || state.frozen > 0) return;
  for (const player of state.players) {
    const human = !demo && ((player.side === "home" && player.id === state.selectedId) ||
      (state.gameMode === "local2p" && player.side === "away" && player.id === state.selectedAwayId));
    if (human || player.role === "GK" || player.sentOff || owner?.side === player.side) { player.tackleReadiness = 0; continue; }
    if (player.tackleCooldown > 0 || player.stumbleTimer > 0) {
      if (player.stealTimer <= 0 && player.slideTimer <= 0) player.defensiveState = "recover";
      continue;
    }
    const ballDistance = distance(player.x, player.y, state.ball.x, state.ball.y);
    if (ballDistance > 4.1 || state.ball.z > 1.3) { player.tackleReadiness = 0; continue; }
    player.defensiveState = "chase";
    player.tackleReadiness += dt;
    const reaction = clamp(0.2 - (player.defending - 60) * 0.004, 0.065, 0.24) *
      (state.difficulty === "easy" ? 1.35 : state.difficulty === "hard" ? 0.8 : 1);
    if (player.tackleReadiness < reaction) continue;
    const behind = owner && ((player.x - owner.x) * owner.facingX + (player.y - owner.y) * owner.facingY) < -0.8;
    const urgent = owner && attackProgressAt(state, player.side, owner.x) < 30;
    const sliding = !behind && !!urgent && ballDistance > 2.9 && player.defending >= 68 && Math.hypot(owner.vx, owner.vy) > 9;
    beginTackle(state, player, sliding);
  }
}

export function updateDefensivePressure(state: MatchState, dt: number, demo: boolean) {
  const owner = getPlayer(state, state.ball.owner), t = state.pressure;
  const human = owner && !demo && (owner.id === state.selectedId ||
    (state.gameMode === "local2p" && owner.id === state.selectedAwayId));
  if (!owner || !human || owner.role === "GK" || t.ownerId !== owner.id) {
    Object.assign(t, { ownerId: owner?.id ?? null, held: 0, window: 0, path: 0, stagnant: 0, secondaryId: null,
      anchorX: owner?.x ?? 50, anchorY: owner?.y ?? 32, lastX: owner?.x ?? 50, lastY: owner?.y ?? 32 });
    return;
  }
  t.held += dt; t.window += dt;
  t.path += distance(owner.x, owner.y, t.lastX, t.lastY);
  t.lastX = owner.x; t.lastY = owner.y;
  if (t.window >= 1.2) {
    const net = distance(owner.x, owner.y, t.anchorX, t.anchorY);
    const circling = t.path > 4 && net / t.path < 0.48;
    t.stagnant = net < 2.5 || circling ? t.stagnant + t.window : Math.max(0, t.stagnant - t.window * 2);
    t.window = 0; t.path = 0; t.anchorX = owner.x; t.anchorY = owner.y;
  }
  t.secondaryId = null;
  if (t.stagnant < 1.15 && t.held < 5) return;
  const side: Side = owner.side === "home" ? "away" : "home", primary = pressingPlayer(state, side);
  const tactic = TACTICS[side === "home" ? state.homeTactic : state.awayTactic];
  const progress = attackProgressAt(state, side, owner.x);
  const support = state.players.filter(p => p.side === side && p.role !== "GK" && !p.sentOff && p.id !== primary?.id &&
    !(side === "home" && p.id === state.selectedId) && !(side === "away" && state.gameMode === "local2p" && p.id === state.selectedAwayId) &&
    progress >= roleProgressBounds(p.role, tactic).min - 4 && progress <= roleProgressBounds(p.role, tactic).max + 4)
    .sort((a,b) => distance(a.x,a.y,owner.x,owner.y) - distance(b.x,b.y,owner.x,owner.y))[0];
  t.secondaryId = support?.id ?? null;
}

export function finishMatch(state: MatchState) {
  if (state.finished) return;
  state.finished = true; state.paused = true; state.remaining = 0;
  state.winner = state.homeScore > state.awayScore ? "home" : state.awayScore > state.homeScore ? "away" : null;
  if (state.cupRound !== null && !state.winner) {
    state.shootout = resolveShootout(state, () => random(state));
    state.winner = state.shootout.home > state.shootout.away ? "home" : "away";
  }
  setMessage(state, "FIM DE JOGO", 99);
  beginTitleCelebration(state);
}

export function updateParticles(state: MatchState, dt: number) {
  state.particles.forEach((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.96, dt * 60);
    particle.vy += 8 * dt;
    particle.life -= dt;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);
  state.trail.forEach((point) => {
    point.life -= dt * 1.65;
  });
  state.trail = state.trail.filter((point) => point.life > 0);
}

export function updateSetPiece(
  state: MatchState,
  input: InputState,
  dt: number,
  demo: boolean,
) {
  const piece = state.setPiece;
  if (!piece) return;
  if (piece.timer > 0) {
    piece.timer -= dt;
    if (piece.timer > 0) return;
  }

  if (!piece.ready) {
    piece.ready = true;
    piece.readyTimer = 0;
    const humanSetPiece =
      !demo && (piece.side === "home" || state.gameMode === "local2p");
    if (humanSetPiece) {
      const passKey = piece.side === "home" ? "F" : "K";
      const shotKey = piece.side === "home" ? "ESPAÇO" : "L";
      const instruction =
        piece.kind === "throwIn" ||
        piece.kind === "goalKick" ||
        piece.kind === "offside"
          ? passKey + " PARA COBRAR"
          : shotKey + " CHUTE • " + passKey + " PASSE";
      setMessage(state, setPieceName(piece.kind) + " • " + instruction, 99);
      return;
    }
  }

  const humanSetPiece =
    !demo && (piece.side === "home" || state.gameMode === "local2p");
  if (humanSetPiece) {
    piece.readyTimer += dt;
    const aimDirection = movementIntent(input, piece.side, state.gameMode).y;
    piece.aimY = clamp(
      piece.aimY + aimDirection * dt * 10.5,
      GOAL_TOP + 1,
      GOAL_BOTTOM - 1,
    );
    if (piece.side === "home" && state.chargingShot) {
      state.shotCharge = clamp(state.shotCharge + dt * 0.82, 0, 1);
    } else if (piece.side === "away" && state.chargingAwayShot) {
      state.awayShotCharge = clamp(state.awayShotCharge + dt * 0.82, 0, 1);
    }
    if (piece.readyTimer > 6) {
      executeSetPiece(
        state,
        piece.kind === "throwIn" ||
          piece.kind === "goalKick" ||
          piece.kind === "offside"
          ? "pass"
          : "shot",
      );
    }
    return;
  }

  piece.readyTimer += dt;
  if (piece.readyTimer > 0.55) {
    executeSetPiece(
      state,
      piece.kind === "corner" ||
        piece.kind === "throwIn" ||
        piece.kind === "goalKick" ||
        piece.kind === "offside"
        ? "pass"
        : "shot",
    );
  }
}

export function updateMatch(
  state: MatchState,
  input: InputState,
  dt: number,
  demo: boolean,
) {
  if (state.paused || state.finished) return;
  state.elapsed += dt;
  state.cameraShake = Math.max(0, state.cameraShake - dt * 2.8);
  state.impactFlash = Math.max(0, state.impactFlash - dt * 2.5);
  state.netPulse = Math.max(0, state.netPulse - dt * 1.45);
  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) state.message = "";
  }
  state.players.forEach((player) => {
    player.actionTimer = Math.max(0, player.actionTimer - dt);
    player.tackleCooldown = Math.max(0, player.tackleCooldown - dt);
    player.controlShield = Math.max(0, player.controlShield - dt);
    player.keeperDiveTimer = Math.max(0, player.keeperDiveTimer - dt);
  });
  updateParticles(state, dt);

  if (state.frozen > 0) {
    state.frozen -= dt;
    return;
  }

  if (!demo) {
    state.remaining = Math.max(0, state.remaining - dt);
    if (state.remaining <= 0) {
      if (state.half === 1) {
        beginSecondHalf(state);
      } else {
        finishMatch(state);
      }
      return;
    }
  }

  if (state.setPiece) {
    updateSetPiece(state, input, dt, demo);
    return;
  }

  if (state.chargingShot) {
    state.shotCharge = clamp(state.shotCharge + dt * 0.86, 0, 1);
  }
  if (state.chargingAwayShot) {
    state.awayShotCharge = clamp(state.awayShotCharge + dt * 0.86, 0, 1);
  }

  updateDefensivePressure(state, dt, demo);
  const homeChaser = pressingPlayer(state, "home");
  const awayChaser = pressingPlayer(state, "away");
  state.players.forEach((player) => {
    if (player.sentOff) return;
    if (updateSpecialMovement(player, dt)) {
      player.x = clamp(player.x, 2.5, FIELD_W - 2.5);
      player.y = clamp(player.y, 3.5, FIELD_H - 3.5);
      return;
    }
    if (player.role === "GK") {
      updateKeeper(state, player, dt);
      return;
    }
    const humanControlled =
      !demo &&
      ((player.side === "home" && player.id === state.selectedId) ||
        (state.gameMode === "local2p" &&
          player.side === "away" &&
          player.id === state.selectedAwayId));
    if (humanControlled) {
      updateHuman(
        player,
        input,
        dt,
        state.gameMode,
        teamAbility(state, player.side) * playerAttributeFactor(player.pace),
      );
    } else
      aiTarget(
        state,
        player,
        player.side === "home" ? homeChaser : awayChaser,
        dt,
      );
    player.x = clamp(player.x, 2.5, FIELD_W - 2.5);
    player.y = clamp(player.y, 3.5, FIELD_H - 3.5);
  });

  resolvePlayerCollisions(state);
  resolveKeeperSmothers(state);
  resolveStealAttempts(state, demo);
  if (state.setPiece) return;
  resolveSlideTackles(state, demo);
  if (state.setPiece) return;
  updateBall(state, dt, demo);
  updateSteals(state, dt, demo);
  updatePitchWear(state.pitchWear, state.players, dt);

  state.players.forEach((player) => {
    if (player.sentOff) return;
    player.x = clamp(player.x, 2.5, FIELD_W - 2.5);
    player.y = clamp(player.y, 3.5, FIELD_H - 3.5);
  });
}

export type View = { width: number; height: number; dpr: number };
