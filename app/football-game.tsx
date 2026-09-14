"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gauge,
  Landmark,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  ShoppingCart,
  Shield,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  WalletCards,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Side = "home" | "away";
type Role = "GK" | "DF" | "MF" | "FW";
type Screen = "menu" | "playing" | "finished";
type Quality = "performance" | "balanced" | "ultra";
type Difficulty = "easy" | "normal" | "hard";
type GameMode = "solo" | "local2p";
type CompetitionMode = "friendly" | "league" | "cup" | "career";
type CupScope = "continental" | "world";
type TeamRegionFilter = "all" | "brazil" | "europe";
type LeagueId =
  | "brasileirao"
  | "premier-league"
  | "la-liga"
  | "serie-a"
  | "bundesliga"
  | "ligue-1";
type FormationId = "2-3-2" | "3-2-2" | "2-2-3";
type TacticId = "balanced" | "attacking" | "defensive" | "counter";
type KitPattern =
  | "solid"
  | "horizontal"
  | "vertical"
  | "sash"
  | "chest-band"
  | "white-sleeves"
  | "center-stripe";
type PlayerArchetype =
  | "keeper"
  | "stopper"
  | "engine"
  | "creator"
  | "sprinter"
  | "finisher";
type SetPieceKind =
  "corner" | "freeKick" | "offside" | "penalty" | "throwIn" | "goalKick";

type Team = {
  id: string;
  name: string;
  short: string;
  city: string;
  flag: string;
  leagueId: LeagueId;
  officialDomain: string;
  kitPattern: KitPattern;
  kitAccent?: string;
  shorts: string;
  socks: string;
  primary: string;
  secondary: string;
  rating: number;
};

type LeagueDefinition = {
  id: LeagueId;
  name: string;
  country: string;
  flag: string;
  accent: string;
};

type SquadSeed = [
  name: string,
  number: number,
  overall: number,
  naturalRole?: Role,
];

type FormationDefinition = {
  id: FormationId;
  label: string;
  description: string;
  slots: Array<[Role, number, number]>;
};

type TacticDefinition = {
  id: TacticId;
  label: string;
  description: string;
  line: number;
  width: number;
  pressure: number;
  forwardRuns: number;
  tempo: number;
};

type LeagueRow = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

type CareerState = {
  clubId: string;
  season: number;
  budget: number;
  fans: number;
  squad: SquadSeed[];
  history: string[];
  transactions: string[];
};

type MarketEntry = {
  team: Team;
  seed: SquadSeed;
};

type Player = {
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

type Ball = {
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

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
};

type TrailPoint = {
  x: number;
  y: number;
  z: number;
  life: number;
};

type SetPiece = {
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

type MatchStats = {
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

type MatchState = {
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

type Hud = {
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

type InputState = {
  keys: Set<string>;
  touchX: number;
  touchY: number;
  touchSprint: boolean;
};

type GameActions = {
  pass: (side?: Side) => void;
  shootStart: (side?: Side) => void;
  shootRelease: (side?: Side) => void;
  steal: (side?: Side) => void;
  switchPlayer: (side?: Side) => void;
  slide: (side?: Side) => void;
  togglePause: () => void;
};

const FIELD_W = 100;
const FIELD_H = 64;
const GOAL_TOP = 24;
const GOAL_BOTTOM = 40;
const HALF_SECONDS = 55;

const TEAMS: Team[] = [
  {
    id: "flamengo",
    name: "Flamengo",
    short: "FLA",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "flamengo.com.br",
    kitPattern: "horizontal",
    shorts: "#101010",
    socks: "#e32636",
    primary: "#e32636",
    secondary: "#101010",
    rating: 89,
  },
  {
    id: "real-madrid",
    name: "Real Madrid",
    short: "RMA",
    city: "Europa • Espanha",
    flag: "🇪🇸",
    leagueId: "la-liga",
    officialDomain: "realmadrid.com",
    kitPattern: "solid",
    kitAccent: "#e6a6bd",
    shorts: "#f4f2f8",
    socks: "#f4f2f8",
    primary: "#f4f2f8",
    secondary: "#17483d",
    rating: 91,
  },
  {
    id: "palmeiras",
    name: "Palmeiras",
    short: "PAL",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "palmeiras.com.br",
    kitPattern: "solid",
    shorts: "#f4f5ef",
    socks: "#08783e",
    primary: "#08783e",
    secondary: "#f4f5ef",
    rating: 88,
  },
  {
    id: "barcelona",
    name: "Barcelona",
    short: "BAR",
    city: "Europa • Espanha",
    flag: "🇪🇸",
    leagueId: "la-liga",
    officialDomain: "fcbarcelona.com",
    kitPattern: "vertical",
    shorts: "#132a68",
    socks: "#1e4591",
    primary: "#1e4591",
    secondary: "#a50044",
    rating: 90,
  },
  {
    id: "corinthians",
    name: "Corinthians",
    short: "COR",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "corinthians.com.br",
    kitPattern: "solid",
    shorts: "#161616",
    socks: "#f2f2f2",
    primary: "#f2f2f2",
    secondary: "#161616",
    rating: 86,
  },
  {
    id: "manchester-city",
    name: "Manchester City",
    short: "MCI",
    city: "Europa • Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    leagueId: "premier-league",
    officialDomain: "mancity.com",
    kitPattern: "solid",
    shorts: "#f4f7fb",
    socks: "#72b9e6",
    primary: "#72b9e6",
    secondary: "#17345c",
    rating: 90,
  },
  {
    id: "sao-paulo",
    name: "São Paulo",
    short: "SAO",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "saopaulofc.net",
    kitPattern: "chest-band",
    kitAccent: "#171717",
    shorts: "#f4f4f4",
    socks: "#f4f4f4",
    primary: "#f4f4f4",
    secondary: "#d51f2b",
    rating: 86,
  },
  {
    id: "liverpool",
    name: "Liverpool",
    short: "LIV",
    city: "Europa • Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    leagueId: "premier-league",
    officialDomain: "liverpoolfc.com",
    kitPattern: "solid",
    shorts: "#c8102e",
    socks: "#c8102e",
    primary: "#c8102e",
    secondary: "#f0c75e",
    rating: 89,
  },
  {
    id: "santos",
    name: "Santos",
    short: "SAN",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "santosfc.com.br",
    kitPattern: "solid",
    shorts: "#f5f5f5",
    socks: "#f5f5f5",
    primary: "#f5f5f5",
    secondary: "#151515",
    rating: 84,
  },
  {
    id: "arsenal",
    name: "Arsenal",
    short: "ARS",
    city: "Europa • Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    leagueId: "premier-league",
    officialDomain: "arsenal.com",
    kitPattern: "white-sleeves",
    shorts: "#f7f7f2",
    socks: "#db1831",
    primary: "#db1831",
    secondary: "#f7f7f2",
    rating: 89,
  },
  {
    id: "botafogo",
    name: "Botafogo",
    short: "BOT",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "botafogo.com.br",
    kitPattern: "vertical",
    shorts: "#121212",
    socks: "#eeeeee",
    primary: "#121212",
    secondary: "#eeeeee",
    rating: 87,
  },
  {
    id: "bayern",
    name: "Bayern de Munique",
    short: "BAY",
    city: "Europa • Alemanha",
    flag: "🇩🇪",
    leagueId: "bundesliga",
    officialDomain: "fcbayern.com",
    kitPattern: "solid",
    shorts: "#dc143c",
    socks: "#dc143c",
    primary: "#dc143c",
    secondary: "#16366d",
    rating: 90,
  },
  {
    id: "fluminense",
    name: "Fluminense",
    short: "FLU",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "fluminense.com.br",
    kitPattern: "vertical",
    kitAccent: "#f1eee7",
    shorts: "#f1eee7",
    socks: "#f1eee7",
    primary: "#7d1738",
    secondary: "#0d6848",
    rating: 85,
  },
  {
    id: "psg",
    name: "Paris Saint-Germain",
    short: "PSG",
    city: "Europa • França",
    flag: "🇫🇷",
    leagueId: "ligue-1",
    officialDomain: "psg.fr",
    kitPattern: "center-stripe",
    kitAccent: "#f5f5f5",
    shorts: "#184a9f",
    socks: "#184a9f",
    primary: "#184a9f",
    secondary: "#d51f36",
    rating: 88,
  },
  {
    id: "vasco",
    name: "Vasco da Gama",
    short: "VAS",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "vasco.com.br",
    kitPattern: "sash",
    shorts: "#171717",
    socks: "#171717",
    primary: "#171717",
    secondary: "#eeeeee",
    rating: 84,
  },
  {
    id: "inter-milan",
    name: "Inter de Milão",
    short: "INT",
    city: "Europa • Itália",
    flag: "🇮🇹",
    leagueId: "serie-a",
    officialDomain: "inter.it",
    kitPattern: "vertical",
    shorts: "#101010",
    socks: "#101010",
    primary: "#1855a5",
    secondary: "#101010",
    rating: 88,
  },
  {
    id: "gremio",
    name: "Grêmio",
    short: "GRE",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "gremio.net",
    kitPattern: "vertical",
    kitAccent: "#f2f5f6",
    shorts: "#141a20",
    socks: "#f2f5f6",
    primary: "#3b9bd8",
    secondary: "#141a20",
    rating: 85,
  },
  {
    id: "milan",
    name: "AC Milan",
    short: "ACM",
    city: "Europa • Itália",
    flag: "🇮🇹",
    leagueId: "serie-a",
    officialDomain: "acmilan.com",
    kitPattern: "vertical",
    shorts: "#f4f4f4",
    socks: "#f4f4f4",
    primary: "#c0142b",
    secondary: "#111111",
    rating: 86,
  },
  {
    id: "internacional",
    name: "Internacional",
    short: "SCI",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "internacional.com.br",
    kitPattern: "solid",
    shorts: "#f3f3f3",
    socks: "#f3f3f3",
    primary: "#d71920",
    secondary: "#f3f3f3",
    rating: 85,
  },
  {
    id: "juventus",
    name: "Juventus",
    short: "JUV",
    city: "Europa • Itália",
    flag: "🇮🇹",
    leagueId: "serie-a",
    officialDomain: "juventus.com",
    kitPattern: "vertical",
    shorts: "#111111",
    socks: "#f1f1f1",
    primary: "#f1f1f1",
    secondary: "#111111",
    rating: 86,
  },
  {
    id: "atletico-mg",
    name: "Atlético Mineiro",
    short: "CAM",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "atletico.com.br",
    kitPattern: "vertical",
    shorts: "#171717",
    socks: "#f1f1f1",
    primary: "#171717",
    secondary: "#f1f1f1",
    rating: 87,
  },
  {
    id: "chelsea",
    name: "Chelsea",
    short: "CHE",
    city: "Europa • Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    leagueId: "premier-league",
    officialDomain: "chelseafc.com",
    kitPattern: "solid",
    shorts: "#034694",
    socks: "#f2f4f8",
    primary: "#034694",
    secondary: "#f2f4f8",
    rating: 87,
  },
  {
    id: "cruzeiro",
    name: "Cruzeiro",
    short: "CRU",
    city: "Brasileirão",
    flag: "🇧🇷",
    leagueId: "brasileirao",
    officialDomain: "cruzeiro.com.br",
    kitPattern: "solid",
    shorts: "#f1f1f1",
    socks: "#2245a4",
    primary: "#2245a4",
    secondary: "#f1f1f1",
    rating: 85,
  },
  {
    id: "atletico-madrid",
    name: "Atlético de Madrid",
    short: "ATM",
    city: "Europa • Espanha",
    flag: "🇪🇸",
    leagueId: "la-liga",
    officialDomain: "atleticodemadrid.com",
    kitPattern: "vertical",
    shorts: "#17345f",
    socks: "#d71932",
    primary: "#d71932",
    secondary: "#17345f",
    rating: 88,
  },
];

const LEAGUES: LeagueDefinition[] = [
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
const ROSTERS: Record<string, SquadSeed[]> = {
  flamengo: [
    ["Rossi", 1, 84],
    ["Léo Ortiz", 3, 84],
    ["Alex Sandro", 26, 82],
    ["Jorginho", 21, 84],
    ["Arrascaeta", 10, 86],
    ["Saúl", 8, 82],
    ["Pedro", 9, 84],
    ["Bruno Henrique", 27, 81],
  ],
  "real-madrid": [
    ["Courtois", 1, 90],
    ["Éder Militão", 3, 84],
    ["Rüdiger", 22, 83],
    ["Valverde", 8, 87],
    ["Bellingham", 5, 90],
    ["Arda Güler", 15, 83],
    ["Vini Jr.", 7, 89],
    ["Mbappé", 10, 91],
  ],
  palmeiras: [
    ["Weverton", 21, 82],
    ["Gustavo Gómez", 15, 83],
    ["Piquerez", 22, 80],
    ["Aníbal Moreno", 5, 80],
    ["Raphael Veiga", 23, 82],
    ["Andreas Pereira", 8, 82],
    ["Felipe Anderson", 7, 80],
    ["Vitor Roque", 9, 82],
  ],
  barcelona: [
    ["Joan García", 13, 86],
    ["Pau Cubarsí", 5, 86],
    ["Jules Koundé", 23, 85],
    ["Frenkie de Jong", 21, 86],
    ["Pedri", 8, 90],
    ["Dani Olmo", 20, 84],
    ["Raphinha", 11, 88],
    ["Lamine Yamal", 10, 90],
  ],
  corinthians: [
    ["Hugo Souza", 1, 79],
    ["André Ramalho", 5, 78],
    ["Matheuzinho", 2, 77],
    ["Raniele", 14, 77],
    ["Breno Bidon", 27, 78],
    ["Rodrigo Garro", 8, 81],
    ["Memphis", 10, 82],
    ["Yuri Alberto", 9, 80],
  ],
  "manchester-city": [
    ["Donnarumma", 25, 89],
    ["Rúben Dias", 3, 88],
    ["Gvardiol", 24, 86],
    ["Rodri", 16, 90],
    ["Reijnders", 4, 86],
    ["Bernardo Silva", 20, 84],
    ["Jérémy Doku", 11, 84],
    ["Haaland", 9, 91],
  ],
  "sao-paulo": [
    ["Rafael", 23, 79],
    ["Arboleda", 5, 78],
    ["Alan Franco", 28, 77],
    ["Marcos Antônio", 20, 79],
    ["Alisson", 25, 77],
    ["Lucas Moura", 7, 81],
    ["Luciano", 10, 79],
    ["Calleri", 9, 79],
  ],
  liverpool: [
    ["Alisson", 1, 89],
    ["Van Dijk", 4, 89],
    ["Konaté", 5, 84],
    ["Mac Allister", 10, 86],
    ["Szoboszlai", 8, 85],
    ["Florian Wirtz", 7, 88],
    ["Mohamed Salah", 11, 90],
    ["Alexander Isak", 9, 88],
  ],
  santos: [
    ["Gabriel Brazão", 77, 77],
    ["Mayke", 2, 78],
    ["Zé Ivaldo", 26, 76],
    ["João Schmidt", 5, 76],
    ["Rollheiser", 32, 77],
    ["Neymar", 10, 84],
    ["Guilherme", 11, 77],
    ["Tiquinho", 9, 78],
  ],
  arsenal: [
    ["David Raya", 22, 88],
    ["Gabriel", 6, 89],
    ["William Saliba", 2, 88],
    ["Declan Rice", 41, 88],
    ["Ødegaard", 8, 86],
    ["Eberechi Eze", 10, 84],
    ["Bukayo Saka", 7, 87],
    ["Viktor Gyökeres", 14, 86],
  ],
  botafogo: [
    ["Neto", 12, 79],
    ["Barboza", 20, 79],
    ["Alex Telles", 13, 79],
    ["Marlon Freitas", 17, 79],
    ["Danilo", 35, 82],
    ["Álvaro Montoro", 8, 78],
    ["Savarino", 10, 80],
    ["Arthur Cabral", 9, 79],
  ],
  bayern: [
    ["Neuer", 1, 84],
    ["Upamecano", 2, 84],
    ["Jonathan Tah", 4, 86],
    ["Kimmich", 6, 88],
    ["Musiala", 10, 89],
    ["Michael Olise", 17, 88],
    ["Luis Díaz", 14, 86],
    ["Harry Kane", 9, 90],
  ],
  fluminense: [
    ["Fábio", 1, 78],
    ["Thiago Silva", 3, 83],
    ["Renê", 6, 76],
    ["Martinelli", 8, 78],
    ["Hércules", 35, 78],
    ["Ganso", 10, 80],
    ["Canobbio", 17, 78],
    ["Germán Cano", 14, 80],
  ],
  psg: [
    ["Safonov", 39, 83],
    ["Willian Pacho", 51, 89],
    ["Marquinhos", 5, 87],
    ["João Neves", 87, 88],
    ["Vitinha", 17, 90],
    ["Kvaratskhelia", 7, 89],
    ["Dembélé", 10, 90],
    ["Barcola", 29, 85],
  ],
  vasco: [
    ["Léo Jardim", 1, 79],
    ["Carlos Cuesta", 13, 79],
    ["Lucas Piton", 6, 78],
    ["Hugo Moura", 25, 76],
    ["Coutinho", 10, 80],
    ["Nuno Moreira", 17, 77],
    ["Rayan", 77, 80],
    ["Vegetti", 99, 80],
  ],
  "inter-milan": [
    ["Sommer", 1, 86],
    ["Bastoni", 95, 88],
    ["Akanji", 25, 86],
    ["Barella", 23, 87],
    ["Çalhanoğlu", 20, 86],
    ["Mkhitaryan", 22, 82],
    ["Lautaro", 10, 89],
    ["Marcus Thuram", 9, 86],
  ],
  gremio: [
    ["Tiago Volpi", 1, 76],
    ["Kannemann", 4, 77],
    ["Marlon", 23, 77],
    ["Dodi", 17, 75],
    ["Edenilson", 15, 76],
    ["Cristaldo", 10, 78],
    ["Alysson", 47, 75],
    ["Braithwaite", 22, 79],
  ],
  milan: [
    ["Maignan", 16, 87],
    ["Tomori", 23, 82],
    ["Pavlović", 31, 80],
    ["Modrić", 14, 86],
    ["Samuele Ricci", 4, 80],
    ["Pulisic", 11, 85],
    ["Rafael Leão", 10, 86],
    ["Santiago Giménez", 7, 82],
  ],
  internacional: [
    ["Rochet", 1, 78],
    ["Vitão", 4, 79],
    ["Bernabei", 26, 78],
    ["Thiago Maia", 29, 77],
    ["Bruno Henrique", 8, 76],
    ["Alan Patrick", 10, 81],
    ["Carbonero", 7, 78],
    ["Borré", 19, 80],
  ],
  juventus: [
    ["Di Gregorio", 29, 84],
    ["Bremer", 3, 86],
    ["Federico Gatti", 4, 80],
    ["Locatelli", 5, 83],
    ["Khéphren Thuram", 19, 82],
    ["Koopmeiners", 8, 83],
    ["Kenan Yıldız", 10, 86],
    ["Jonathan David", 30, 84],
  ],
  "atletico-mg": [
    ["Everson", 22, 80],
    ["Lyanco", 4, 79],
    ["Guilherme Arana", 13, 81],
    ["Alan Franco", 23, 77],
    ["Gustavo Scarpa", 10, 80],
    ["Bernard", 20, 77],
    ["Hulk", 7, 83],
    ["Rony", 33, 79],
  ],
  chelsea: [
    ["Robert Sánchez", 1, 82],
    ["Reece James", 24, 84],
    ["Levi Colwill", 6, 82],
    ["Moisés Caicedo", 25, 87],
    ["Enzo Fernández", 8, 85],
    ["Cole Palmer", 10, 88],
    ["Pedro Neto", 7, 84],
    ["João Pedro", 20, 84],
  ],
  cruzeiro: [
    ["Cássio", 1, 79],
    ["Fabrício Bruno", 15, 80],
    ["Kaiki", 6, 77],
    ["Lucas Romero", 29, 78],
    ["Lucas Silva", 16, 77],
    ["Matheus Pereira", 10, 82],
    ["Kaio Jorge", 19, 82],
    ["Gabigol", 9, 81],
  ],
  "atletico-madrid": [
    ["Oblak", 13, 89],
    ["José Giménez", 2, 84],
    ["Dávid Hancko", 17, 84],
    ["Marcos Llorente", 14, 84],
    ["Pablo Barrios", 8, 83],
    ["Thiago Almada", 11, 84],
    ["Julián Álvarez", 19, 89],
    ["Sørloth", 9, 84],
  ],
};

const FORMATIONS: Record<FormationId, FormationDefinition> = {
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

const TACTICS: Record<TacticId, TacticDefinition> = {
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
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const distance = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by);

function pointToSegmentDistance(
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

function random(state: MatchState) {
  state.rng = (state.rng * 1664525 + 1013904223) >>> 0;
  return state.rng / 4294967296;
}

function seedFromName(name: string) {
  return [...name].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
}

function attributeProfile(seed: SquadSeed, role: Role) {
  const [name, , overall] = seed;
  const hash = seedFromName(name);
  const variation = (offset: number) => ((hash >> offset) % 7) - 3;
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

function playerAttributeFactor(attribute: number) {
  return clamp(0.74 + (attribute - 55) * 0.0105, 0.74, 1.27);
}

function playerArchetypeFor(
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

function rosterFor(team: Team, override?: SquadSeed[]) {
  if (override?.length) return override;
  return (
    ROSTERS[team.id] ??
    Array.from(
      { length: 8 },
      (_, index) =>
        [`${team.short} ${index + 1}`, index + 1, team.rating] as SquadSeed,
    )
  );
}

function lineupFor(squad: SquadSeed[], formation: FormationDefinition) {
  const candidates = squad.map((seed, index) => ({
    seed,
    role: seed[3] ?? FORMATIONS["2-3-2"].slots[index]?.[0] ?? "MF",
    used: false,
  }));
  return formation.slots.map(([role]) => {
    const exact = candidates
      .filter((candidate) => !candidate.used && candidate.role === role)
      .sort((a, b) => b.seed[2] - a.seed[2])[0];
    const fallback = candidates
      .filter((candidate) => !candidate.used)
      .sort((a, b) => b.seed[2] - a.seed[2])[0];
    const selected = exact ?? fallback;
    if (!selected) return ["Reserva", 0, 60, role] as SquadSeed;
    selected.used = true;
    return [
      selected.seed[0],
      selected.seed[1],
      selected.seed[2],
      selected.role,
    ] as SquadSeed;
  });
}

function lineupOverall(
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

function ballControlRating(player: Player) {
  return player.passing * 0.48 + player.overall * 0.34 + player.pace * 0.18;
}

function controlShieldDuration(player: Player) {
  return clamp(
    0.27 + (ballControlRating(player) - 70) * 0.008,
    0.27,
    0.55,
  );
}

function duelModifier(activeAttribute: number, rivalAttribute: number) {
  return clamp((activeAttribute - rivalAttribute) * 0.009, -0.22, 0.22);
}

function buildPlayers(
  homeTeam: Team,
  awayTeam: Team,
  homeFormation: FormationId,
  awayFormation: FormationId,
  homeSquad?: SquadSeed[],
): Player[] {
  const players: Player[] = [];
  let id = 1;
  for (const side of ["home", "away"] as Side[]) {
    const team = side === "home" ? homeTeam : awayTeam;
    const formation =
      FORMATIONS[side === "home" ? homeFormation : awayFormation];
    const squad = lineupFor(
      rosterFor(team, side === "home" ? homeSquad : undefined),
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

function createMatch(
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
): MatchState {
  const state: MatchState = {
    players: buildPlayers(
      homeTeam,
      awayTeam,
      homeFormation,
      awayFormation,
      homeSquad,
    ),
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

function getPlayer(state: MatchState, id: number | null) {
  if (id === null) return undefined;
  return state.players.find((player) => player.id === id);
}

function setMessage(state: MatchState, message: string, duration = 1.1) {
  state.message = message;
  state.messageTimer = duration;
}

function attacksRight(state: MatchState, side: Side) {
  return side === "home" ? state.homeAttacksRight : !state.homeAttacksRight;
}

function attackDirectionFor(state: MatchState, side: Side) {
  return attacksRight(state, side) ? 1 : -1;
}

function attackingGoalX(state: MatchState, side: Side, outside = 0) {
  return attacksRight(state, side) ? FIELD_W + outside : -outside;
}

function defendingGoalX(state: MatchState, side: Side) {
  return attacksRight(state, side) ? 0 : FIELD_W;
}

function formationXFor(state: MatchState, player: Player) {
  const firstHalfOrientation = player.side === "home";
  return attacksRight(state, player.side) === firstHalfOrientation
    ? player.homeX
    : FIELD_W - player.homeX;
}

function attackingSideAtGoalLine(state: MatchState, rightGoal: boolean): Side {
  if (rightGoal) return state.homeAttacksRight ? "home" : "away";
  return state.homeAttacksRight ? "away" : "home";
}

function matchTeamOverall(state: MatchState, side: Side) {
  const squad = state.players.filter((player) => player.side === side);
  return (
    squad.reduce((total, player) => total + player.overall, 0) /
    Math.max(1, squad.length)
  );
}

function teamAbility(state: MatchState, side: Side) {
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

function accuratePassTarget(
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

function finishingTargetY(
  state: MatchState,
  shooter: Player,
  desiredY: number,
  baseSpread: number,
) {
  const keeper = state.players.find(
    (player) =>
      player.side !== shooter.side && player.role === "GK" && !player.sentOff,
  );
  const keeperOverall = keeper?.overall ?? 78;
  const finishingBlend = shooter.shooting * 0.78 + shooter.overall * 0.22;
  const specialistBonus = shooter.archetype === "finisher" ? 0.82 : 1;
  const duelScale = clamp(
    (1.1 - (finishingBlend - 72) * 0.023 +
      (keeperOverall - finishingBlend) * 0.016) *
      specialistBonus,
    0.34,
    2.15,
  );
  return clamp(
    desiredY + (random(state) - 0.5) * baseSpread * duelScale,
    GOAL_TOP + 0.7,
    GOAL_BOTTOM - 0.7,
  );
}

function bestKickoffPlayer(state: MatchState, side: Side) {
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

function resetPositions(state: MatchState, kickoffSide: Side) {
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
    player.stamina = Math.min(100, player.stamina + 10);
  });
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

function beginSecondHalf(state: MatchState) {
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

function kickBall(
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
  state.ball.owner = null;
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
  player.decisionCooldown = 0.55;
  state.lastKickTime = performance.now();
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
        0.205 -
          keeperEdge * 0.0022 -
          (teamAbility(state, opposingKeeper.side) - 1) * 0.16 +
          (random(state) - 0.5) * 0.045,
        0.105,
        0.26,
      );
      opposingKeeper.keeperCommitTimer = 0;
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

function isOffsidePosition(
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

function awardOffside(state: MatchState, attacker: Player, receiver: Player) {
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

function choosePassTarget(state: MatchState, player: Player) {
  const tactic =
    TACTICS[player.side === "home" ? state.homeTactic : state.awayTactic];
  const teammates = state.players.filter(
    (candidate) =>
      candidate.side === player.side &&
      candidate.id !== player.id &&
      candidate.role !== "GK" &&
      !candidate.sentOff,
  );
  let best: Player | undefined;
  let bestScore = -Infinity;
  teammates.forEach((candidate) => {
    const dx = candidate.x - player.x;
    const dy = candidate.y - player.y;
    const dist = Math.hypot(dx, dy);
    const forward = dx * attackDirectionFor(state, player.side);
    const facing =
      (dx * player.facingX + dy * player.facingY) / Math.max(1, dist);
    const opponents = state.players.filter(
      (opponent) => opponent.side !== player.side && !opponent.sentOff,
    );
    const receivingSpace = Math.min(
      12,
      ...opponents.map((opponent) =>
        distance(candidate.x, candidate.y, opponent.x, opponent.y),
      ),
    );
    const blockedLane = opponents.some(
      (opponent) =>
        pointToSegmentDistance(
          opponent.x,
          opponent.y,
          player.x,
          player.y,
          candidate.x,
          candidate.y,
        ) < 2.2 && distance(player.x, player.y, opponent.x, opponent.y) < dist,
    );
    const forwardWeight =
      tactic.id === "counter" ? 0.92 : tactic.id === "attacking" ? 0.78 : 0.65;
    const score =
      forward * forwardWeight +
      facing * 14 -
      Math.abs(dist - 20) * 0.45 +
      receivingSpace * 1.1 -
      (blockedLane ? 17 : 0) -
      (isOffsidePosition(state, player, candidate) ? 10 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return best;
}

function selectedIdForSide(state: MatchState, side: Side) {
  return side === "home" ? state.selectedId : state.selectedAwayId;
}

function passBall(state: MatchState, side: Side = "home") {
  const owner = getPlayer(state, state.ball.owner);
  if (
    !owner ||
    owner.side !== side ||
    owner.id !== selectedIdForSide(state, side)
  ) {
    return;
  }
  const target = choosePassTarget(state, owner);
  if (!target) return;
  if (isOffsidePosition(state, owner, target)) {
    awardOffside(state, owner, target);
    return;
  }
  const lead = 0.28;
  const passTarget = accuratePassTarget(
    state,
    owner,
    target.x + target.vx * lead,
    target.y + target.vy * lead,
  );
  kickBall(
    state,
    owner,
    passTarget.x,
    passTarget.y,
    31 * teamAbility(state, side) * playerAttributeFactor(owner.passing),
    "pass",
  );
}

function releaseShot(state: MatchState, side: Side = "home") {
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

function oppositeSide(side: Side): Side {
  return side === "home" ? "away" : "home";
}

function setPieceName(kind: SetPieceKind) {
  if (kind === "corner") return "ESCANTEIO";
  if (kind === "freeKick") return "FALTA";
  if (kind === "offside") return "IMPEDIMENTO";
  if (kind === "penalty") return "PÊNALTI";
  if (kind === "throwIn") return "LATERAL";
  return "TIRO DE META";
}

function setPieceInstruction(hud: Hud) {
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

function startSetPiece(
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

function executeSetPiece(state: MatchState, action: "pass" | "shot") {
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

function commitFoul(
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

function switchToClosestPlayer(state: MatchState, side: Side) {
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

function stealBall(state: MatchState, side: Side = "home") {
  const selected = getPlayer(state, selectedIdForSide(state, side));
  if (
    !selected ||
    selected.role === "GK" ||
    selected.sentOff ||
    selected.tackleCooldown > 0 ||
    selected.stealTimer > 0 ||
    selected.slideTimer > 0 ||
    selected.stumbleTimer > 0 ||
    selected.stamina < 3
  ) {
    return;
  }
  const opponentOwner = getPlayer(state, state.ball.owner);
  if (opponentOwner?.side === side) return;

  const target =
    opponentOwner ?? (state.ball.owner === null ? state.ball : null);
  if (!target) return;
  const targetDistance = distance(selected.x, selected.y, target.x, target.y);
  const defendingFactor = playerAttributeFactor(selected.defending);
  const maximumReach = (opponentOwner ? 4.7 : 4.25) * defendingFactor;
  if (targetDistance > maximumReach) {
    setMessage(state, "APROXIME PARA DAR O BOTE", 0.36);
    return;
  }

  const dx = target.x - selected.x;
  const dy = target.y - selected.y;
  const magnitude = Math.max(0.001, Math.hypot(dx, dy));
  selected.facingX = dx / magnitude;
  selected.facingY = dy / magnitude;
  selected.vx = selected.facingX * 18.5 * defendingFactor;
  selected.vy = selected.facingY * 18.5 * defendingFactor;
  selected.stealTimer = clamp(0.27 / defendingFactor, 0.19, 0.34);
  selected.stealHit = false;
  selected.tackleCooldown = clamp(0.58 / defendingFactor, 0.4, 0.74);
  selected.stamina = Math.max(0, selected.stamina - 3);
}

function slideTackle(state: MatchState, side: Side = "home") {
  const selected = getPlayer(state, selectedIdForSide(state, side));
  if (
    !selected ||
    selected.role === "GK" ||
    selected.tackleCooldown > 0 ||
    selected.stealTimer > 0 ||
    selected.slideTimer > 0 ||
    selected.stamina < 7
  ) {
    return;
  }
  const opponentOwner = getPlayer(state, state.ball.owner);
  let dx = selected.facingX;
  let dy = selected.facingY;
  if (
    opponentOwner &&
    opponentOwner.side !== side &&
    distance(selected.x, selected.y, opponentOwner.x, opponentOwner.y) < 8
  ) {
    dx = opponentOwner.x - selected.x;
    dy = opponentOwner.y - selected.y;
  }
  const magnitude = Math.max(0.001, Math.hypot(dx, dy));
  const defendingFactor = playerAttributeFactor(selected.defending);
  selected.facingX = dx / magnitude;
  selected.facingY = dy / magnitude;
  selected.vx = selected.facingX * 25 * defendingFactor;
  selected.vy = selected.facingY * 25 * defendingFactor;
  selected.slideTimer = clamp(0.48 / defendingFactor, 0.37, 0.59);
  selected.slideHit = false;
  selected.tackleCooldown = clamp(1.35 / defendingFactor, 1.02, 1.72);
  selected.stamina = Math.max(0, selected.stamina - 8);
  state.cameraShake = Math.max(state.cameraShake, 0.12);
  setMessage(state, "CARRINHO!", 0.34);
}

function movePlayer(
  player: Player,
  targetX: number,
  targetY: number,
  maxSpeed: number,
  dt: number,
) {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const magnitude = Math.hypot(dx, dy);
  const desiredX = magnitude > 0.1 ? (dx / magnitude) * maxSpeed : 0;
  const desiredY = magnitude > 0.1 ? (dy / magnitude) * maxSpeed : 0;
  const agility = playerAttributeFactor(
    player.pace * 0.58 + player.overall * 0.42,
  );
  const blend = 1 - Math.pow(clamp(0.065 / agility, 0.035, 0.1), dt);
  player.vx += (desiredX - player.vx) * blend;
  player.vy += (desiredY - player.vy) * blend;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  if (Math.hypot(player.vx, player.vy) > 0.2) {
    player.facingX = player.vx / Math.hypot(player.vx, player.vy);
    player.facingY = player.vy / Math.hypot(player.vx, player.vy);
  }
}

function updateSpecialMovement(player: Player, dt: number) {
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

function resolvePlayerCollisions(state: MatchState) {
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
      const overlap = (minimum - separation) * 0.5;
      const nx = dx / separation;
      const ny = dy / separation;
      const firstLocked = first.slideTimer > 0 || first.keeperDiveTimer > 0;
      const secondLocked = second.slideTimer > 0 || second.keeperDiveTimer > 0;
      if (!firstLocked) {
        first.x -= nx * overlap;
        first.y -= ny * overlap;
      }
      if (!secondLocked) {
        second.x += nx * overlap;
        second.y += ny * overlap;
      }
      if (first.side !== second.side) {
        first.vx -= nx * 0.3;
        first.vy -= ny * 0.3;
        second.vx += nx * 0.3;
        second.vy += ny * 0.3;
      }
    }
  }
}

function resolveStealAttempts(state: MatchState, demo: boolean) {
  const stealers = state.players.filter(
    (player) => player.stealTimer > 0 && !player.stealHit && !player.sentOff,
  );
  for (const stealer of stealers) {
    if (state.ball.owner === null) {
      const ballDistance = distance(
        stealer.x,
        stealer.y,
        state.ball.x,
        state.ball.y,
      );
      if (ballDistance >= 2.45 || state.ball.z >= 1.55) continue;
      const ballSpeed = Math.hypot(state.ball.vx, state.ball.vy);
      stealer.stealHit = true;
      if (ballSpeed < 28) {
        state.ball.owner = stealer.id;
        state.ball.lastTouch = stealer.side;
        state.ball.lastPlayerId = stealer.id;
        state.ball.z = 0.12;
        state.ball.vx = 0;
        state.ball.vy = 0;
        state.ball.vz = 0;
        stealer.controlShield = controlShieldDuration(stealer);
        setMessage(state, "ANTECIPAÇÃO PERFEITA", 0.58);
      } else {
        state.ball.vx = stealer.facingX * 15 + state.ball.vx * 0.18;
        state.ball.vy = stealer.facingY * 15 + state.ball.vy * 0.18;
        state.ball.vz = Math.max(1.2, state.ball.vz * 0.35);
        state.ball.lastTouch = stealer.side;
        state.ball.lastPlayerId = stealer.id;
        state.ball.looseTimer = 0.12;
        setMessage(state, "CORTE PRECISO", 0.48);
      }
      state.cameraShake = Math.max(state.cameraShake, 0.2);
      continue;
    }

    const carrier = getPlayer(state, state.ball.owner);
    if (!carrier || carrier.side === stealer.side || carrier.role === "GK")
      continue;
    const dx = carrier.x - stealer.x;
    const dy = carrier.y - stealer.y;
    const contactDistance = Math.hypot(dx, dy);
    if (contactDistance >= 2.48) continue;

    const nx = dx / Math.max(0.001, contactDistance);
    const ny = dy / Math.max(0.001, contactDistance);
    const alignment = stealer.facingX * nx + stealer.facingY * ny;
    const closingSpeed = Math.max(
      0,
      (stealer.vx - carrier.vx) * nx + (stealer.vy - carrier.vy) * ny,
    );
    const carrierToStealerX = stealer.x - carrier.x;
    const carrierToStealerY = stealer.y - carrier.y;
    const fromBehind =
      (carrierToStealerX * carrier.facingX +
        carrierToStealerY * carrier.facingY) /
        Math.max(0.001, contactDistance) <
      -0.24;
    const fromSide =
      !fromBehind &&
      Math.abs(
        (carrierToStealerX * carrier.facingX +
          carrierToStealerY * carrier.facingY) /
          Math.max(0.001, contactDistance),
      ) < 0.42;
    const shieldPenalty = carrier.controlShield > 0 ? 0.22 : 0;
    const duelAdvantage =
      duelModifier(stealer.defending, ballControlRating(carrier)) +
      (teamAbility(state, stealer.side) -
        teamAbility(state, carrier.side)) *
        0.32;
    const cleanChance = clamp(
      0.62 +
        Math.max(0, alignment) * 0.2 +
        Math.min(12, closingSpeed) * 0.009 -
        shieldPenalty -
        (fromBehind ? 0.24 : fromSide ? 0.05 : 0) +
        duelAdvantage,
      0.24,
      0.94,
    );

    stealer.stealHit = true;
    if (demo || random(state) < cleanChance) {
      state.ball.owner = stealer.id;
      state.ball.lastTouch = stealer.side;
      state.ball.lastPlayerId = stealer.id;
      state.ball.z = 0.12;
      state.ball.vx = 0;
      state.ball.vy = 0;
      state.ball.vz = 0;
      stealer.controlShield = Math.min(
        0.62,
        controlShieldDuration(stealer) + 0.07,
      );
      carrier.controlShield = 0;
      carrier.stumbleTimer = fromBehind ? 0.28 : 0.17;
      carrier.vx *= 0.45;
      carrier.vy *= 0.45;
      state.cameraShake = Math.max(state.cameraShake, 0.28);
      state.impactFlash = Math.max(state.impactFlash, 0.1);
      setMessage(
        state,
        fromSide ? "DESARME NO TEMPO CERTO" : "BOTE LIMPO!",
        0.62,
      );
      if (stealer.side === "home") state.selectedId = stealer.id;
      else if (state.gameMode === "local2p") state.selectedAwayId = stealer.id;
      continue;
    }

    const foulChance = fromBehind ? 0.46 : fromSide ? 0.16 : 0.055;
    if (!demo && random(state) < foulChance) {
      carrier.stumbleTimer = 0.34;
      state.cameraShake = Math.max(state.cameraShake, 0.42);
      commitFoul(state, stealer, carrier, demo);
      if (state.setPiece) return;
    } else {
      carrier.controlShield = Math.max(carrier.controlShield, 0.3);
      stealer.stumbleTimer = 0.1;
      setMessage(state, "ATACANTE PROTEGEU", 0.42);
    }
  }
}

function resolveKeeperSmothers(state: MatchState, demo: boolean) {
  const carrier = getPlayer(state, state.ball.owner);
  if (!carrier || carrier.role === "GK") return;
  const keeper = state.players.find(
    (candidate) =>
      candidate.side !== carrier.side &&
      candidate.role === "GK" &&
      !candidate.sentOff,
  );
  if (!keeper || keeper.tackleCooldown > 0) return;
  const keeperDefendsLeft = defendingGoalX(state, keeper.side) === 0;
  const insideKeeperBox = keeperDefendsLeft
    ? carrier.x < 18.5
    : carrier.x > 81.5;
  const contactDistance = distance(keeper.x, keeper.y, carrier.x, carrier.y);
  if (!insideKeeperBox || contactDistance >= 2.45) return;

  keeper.tackleCooldown = 0.58;
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

  if (demo || random(state) < smotherChance) {
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

function resolveSlideTackles(state: MatchState, demo: boolean) {
  const sliders = state.players.filter(
    (player) => player.slideTimer > 0 && !player.slideHit && !player.sentOff,
  );
  for (const slider of sliders) {
    if (
      state.ball.owner === null &&
      state.ball.z < 1.25 &&
      distance(slider.x, slider.y, state.ball.x, state.ball.y) < 2.15
    ) {
      state.ball.x = slider.x + slider.facingX * 1.5;
      state.ball.y = slider.y + slider.facingY * 1.5;
      state.ball.vx = slider.facingX * 18;
      state.ball.vy = slider.facingY * 18;
      state.ball.z = 0.16;
      state.ball.vz = 1.8;
      state.ball.lastTouch = slider.side;
      state.ball.lastPlayerId = slider.id;
      state.ball.looseTimer = 0.16;
      slider.slideHit = true;
      state.cameraShake = Math.max(state.cameraShake, 0.34);
      setMessage(state, "CARRINHO NA BOLA", 0.58);
      continue;
    }

    const victim = state.players
      .filter(
        (player) =>
          player.side !== slider.side &&
          !player.sentOff &&
          player.role !== "GK",
      )
      .sort(
        (a, b) =>
          distance(slider.x, slider.y, a.x, a.y) -
          distance(slider.x, slider.y, b.x, b.y),
      )[0];
    if (!victim || distance(slider.x, slider.y, victim.x, victim.y) >= 2.05) {
      continue;
    }

    slider.slideHit = true;
    const victimHasBall = state.ball.owner === victim.id;
    const victimToSliderX = slider.x - victim.x;
    const victimToSliderY = slider.y - victim.y;
    const contactDistance = Math.max(
      0.001,
      Math.hypot(victimToSliderX, victimToSliderY),
    );
    const fromBehind =
      (victimToSliderX * victim.facingX + victimToSliderY * victim.facingY) /
        contactDistance <
      -0.28;
    const cleanChance = clamp(
      0.78 -
        (fromBehind ? 0.34 : 0) -
        (victim.controlShield > 0 ? 0.17 : 0) +
        duelModifier(slider.defending, ballControlRating(victim)) +
        (teamAbility(state, slider.side) -
          teamAbility(state, victim.side)) *
          0.28,
      0.25,
      0.86,
    );

    if (victimHasBall && (demo || random(state) < cleanChance)) {
      state.ball.owner = null;
      state.ball.x = victim.x;
      state.ball.y = victim.y;
      state.ball.z = 0.16;
      state.ball.vx = slider.facingX * 15 + victim.vx * 0.25;
      state.ball.vy = slider.facingY * 15 + victim.vy * 0.25;
      state.ball.vz = 2.2;
      state.ball.spin = (random(state) - 0.5) * 4;
      state.ball.lastTouch = slider.side;
      state.ball.lastPlayerId = slider.id;
      state.ball.looseTimer = 0.2;
      victim.stumbleTimer = 0.42;
      victim.controlShield = 0;
      state.cameraShake = Math.max(state.cameraShake, 0.55);
      state.impactFlash = Math.max(state.impactFlash, 0.24);
      setMessage(state, "CARRINHO PERFEITO!", 0.75);
    } else {
      victim.stumbleTimer = 0.5;
      state.cameraShake = Math.max(state.cameraShake, 0.62);
      state.impactFlash = Math.max(state.impactFlash, 0.32);
      commitFoul(state, slider, victim, demo);
      if (state.setPiece) return;
    }
  }
}

function updateHuman(
  player: Player,
  input: InputState,
  dt: number,
  gameMode: GameMode,
  ability: number,
) {
  const usesHomeKeys = gameMode === "solo" || player.side === "home";
  const usesAwayKeys = gameMode === "solo" || player.side === "away";
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
  if (player.side === "home") {
    dx += input.touchX;
    dy += input.touchY;
  }
  const magnitude = Math.hypot(dx, dy);
  if (magnitude > 1) {
    dx /= magnitude;
    dy /= magnitude;
  }
  const sprint =
    (player.side === "home" &&
      (input.keys.has("ShiftLeft") ||
        input.touchSprint ||
        Math.hypot(input.touchX, input.touchY) > 0.82)) ||
    (player.side === "away" &&
      (input.keys.has("ShiftRight") || input.keys.has("Enter"))) ||
    (gameMode === "solo" && input.keys.has("ShiftRight"));
  const canSprint = sprint && player.stamina > 3 && magnitude > 0.1;
  const speed = (canSprint ? 19.5 : 13.6) * ability;
  const desiredX = dx * speed;
  const desiredY = dy * speed;
  const agility = playerAttributeFactor(
    player.pace * 0.62 + player.overall * 0.38,
  );
  const blend = 1 - Math.pow(clamp(0.04 / agility, 0.022, 0.072), dt);
  player.vx += (desiredX - player.vx) * blend;
  player.vy += (desiredY - player.vy) * blend;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  if (magnitude > 0.1) {
    player.facingX = dx;
    player.facingY = dy;
  }
  if (canSprint) player.stamina = Math.max(0, player.stamina - dt * 9.2);
  else player.stamina = Math.min(100, player.stamina + dt * 4.4);
}

function nearestPlayer(state: MatchState, side: Side, includeKeeper = false) {
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

function attackProgressAt(state: MatchState, side: Side, x: number) {
  return attacksRight(state, side) ? x : FIELD_W - x;
}

function xFromAttackProgress(
  state: MatchState,
  side: Side,
  progress: number,
) {
  return attacksRight(state, side) ? progress : FIELD_W - progress;
}

function roleProgressBounds(role: Role, tactic: TacticDefinition) {
  if (role === "DF") {
    return {
      min: 5,
      max:
        tactic.id === "attacking"
          ? 62
          : tactic.id === "defensive"
            ? 48
            : 56,
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
      min:
        tactic.id === "attacking"
          ? 51
          : tactic.id === "defensive"
            ? 42
            : 47,
      max: 97,
    };
  }
  return { min: 2, max: 18 };
}

function pressingPlayer(state: MatchState, side: Side) {
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

function predictBallAtX(ball: Ball, targetX: number) {
  if (Math.abs(ball.vx) < 0.01) return null;
  const time = (targetX - ball.x) / ball.vx;
  if (time <= 0 || time > 3.2) return null;
  return {
    time,
    y: ball.y + ball.vy * time + ball.spin * time * time * 0.08,
    z: Math.max(0, ball.z + ball.vz * time - 9.25 * time * time),
  };
}

function predictBallLanding(ball: Ball) {
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

function chooseKeeperDistributionTarget(state: MatchState, keeper: Player) {
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

function updateKeeper(state: MatchState, player: Player, dt: number) {
  const ownLeft = defendingGoalX(state, player.side) === 0;
  const keeperAbility =
    teamAbility(state, player.side) *
    playerAttributeFactor(player.overall) *
    0.94;
  const owner = getPlayer(state, state.ball.owner);
  const goalX = ownLeft ? 0 : FIELD_W;
  const baseX = ownLeft ? 4.8 : 95.2;
  const keeperLineX = ownLeft ? 3.55 : 96.45;
  const opponentOwner = owner && owner.side !== player.side ? owner : null;
  const threatX = opponentOwner?.x ?? state.ball.x;
  const threatY = opponentOwner?.y ?? state.ball.y;
  const threatDepth = Math.abs(threatX - goalX);
  const angleFactor = clamp(0.64 - threatDepth * 0.018, 0.2, 0.59);
  let targetX = baseX;
  let targetY = clamp(
    32 + (threatY - 32) * angleFactor,
    GOAL_TOP + 0.75,
    GOAL_BOTTOM - 0.75,
  );
  let keeperSpeed = 14.8;

  player.keeperCommitTimer = Math.max(0, player.keeperCommitTimer - dt);
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
      const predictedTargetY = clamp(
        goalPrediction.y,
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
          ? 25
          : goalPrediction.time < 0.82
            ? 22
            : 18.5;
      const reachY = Math.abs(targetY - player.y);
      const highBall = goalPrediction.z > 1.45;
      if (goalPrediction.time < 0.82 && (reachY > 1.15 || highBall)) {
        player.keeperDiveTimer = Math.max(player.keeperDiveTimer, 0.36);
        player.keeperDiveDirection = Math.sign(targetY - player.y) || 1;
      }
    } else {
      keeperSpeed = 15.5;
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
        player.keeperDiveTimer = Math.max(player.keeperDiveTimer, 0.2);
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

function findMarkTarget(state: MatchState, marker: Player) {
  const markers = state.players
    .filter(
      (player) =>
        player.side === marker.side &&
        !player.sentOff &&
        (player.role === "DF" || player.role === "MF"),
    )
    .sort((a, b) => a.homeY - b.homeY);
  const threats = state.players
    .filter(
      (player) =>
        player.side !== marker.side && !player.sentOff && player.role !== "GK",
    )
    .sort((a, b) => a.y - b.y);
  const markerIndex = Math.max(
    0,
    markers.findIndex((player) => player.id === marker.id),
  );
  return threats[markerIndex % Math.max(1, threats.length)];
}

function aiTarget(
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

  if (state.ball.owner === player.id) {
    const goalX = attackingGoalX(state, player.side, 1);
    const closestOpponent = state.players
      .filter(
        (candidate) => candidate.side !== player.side && !candidate.sentOff,
      )
      .sort(
        (a, b) =>
          distance(player.x, player.y, a.x, a.y) -
          distance(player.x, player.y, b.x, b.y),
      )[0];
    const avoid =
      closestOpponent &&
      distance(player.x, player.y, closestOpponent.x, closestOpponent.y) < 6
        ? clamp((player.y - closestOpponent.y) * 0.9, -7, 7)
        : 0;
    const styleLane =
      player.archetype === "sprinter"
        ? Math.sign(player.homeY - 32 || 1) * 5.2
        : player.archetype === "creator"
          ? (32 - player.y) * 0.22
          : 0;
    movePlayer(
      player,
      goalX,
      clamp(32 + avoid + styleLane, 8, 56),
      12.1 *
        difficultyBoost *
        abilityBoost *
        tactic.tempo *
        (player.archetype === "sprinter" ? 1.05 : 1),
      dt,
    );

    player.decisionCooldown -= dt;
    const shotLine = clamp(
      (tactic.id === "attacking" ? 72 : tactic.id === "counter" ? 74 : 77) -
        (player.shooting - 75) * 0.16 -
        (player.archetype === "finisher" ? 2.2 : 0),
      67,
      81,
    );
    const inRange =
      attackProgressAt(state, player.side, player.x) > shotLine;
    if (inRange && player.decisionCooldown <= 0) {
      const opposingKeeper = state.players.find(
        (candidate) =>
          candidate.side !== player.side &&
          candidate.role === "GK" &&
          !candidate.sentOff,
      );
      const openCorner =
        (opposingKeeper?.y ?? 32) < 32 ? GOAL_BOTTOM - 1.2 : GOAL_TOP + 1.2;
      const targetY = finishingTargetY(state, player, openCorner, 4.1);
      state.lastShotStyle =
        random(state) > 0.62 ? "CHUTE COLOCADO" : "FINALIZAÇÃO";
      kickBall(
        state,
        player,
        goalX,
        targetY,
        (43 + random(state) * 8) *
          teamAbility(state, player.side) *
          playerAttributeFactor(player.shooting),
        "shot",
        4.2 + random(state) * 2.4,
      );
      player.decisionCooldown = clamp(
        1.16 - (player.overall - 70) * 0.014,
        0.62,
        1.16,
      );
    } else if (
      closestOpponent &&
      distance(player.x, player.y, closestOpponent.x, closestOpponent.y) <
        (player.archetype === "creator" ? 6.1 : 3.8) &&
      player.decisionCooldown <= 0
    ) {
      const target = choosePassTarget(state, player);
      if (target) {
        if (isOffsidePosition(state, player, target)) {
          awardOffside(state, player, target);
        } else {
          const passTarget = accuratePassTarget(
            state,
            player,
            target.x,
            target.y,
          );
          kickBall(
            state,
            player,
            passTarget.x,
            passTarget.y,
            30 *
              teamAbility(state, player.side) *
              playerAttributeFactor(player.passing),
            "pass",
          );
        }
        player.decisionCooldown = clamp(
          1.05 - (player.passing - 70) * 0.013,
          0.48,
          1.05,
        );
      }
    }
    return;
  }

  if (player.id === chaser?.id && (!teamHasBall || !owner)) {
    const requestedX = owner ? owner.x : state.ball.x;
    const targetY = owner ? owner.y : state.ball.y;
    const requestedProgress = attackProgressAt(
      state,
      player.side,
      requestedX,
    );
    const targetProgress = clamp(requestedProgress, bounds.min, bounds.max);
    const targetX = xFromAttackProgress(
      state,
      player.side,
      targetProgress,
    );
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
    targetY += clamp((owner.y - anchorY) * 0.18, -4, 4);
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

function registerGoal(state: MatchState, scoringSide: Side, demo: boolean) {
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

function updateBall(state: MatchState, dt: number, demo: boolean) {
  state.ball.looseTimer = Math.max(0, state.ball.looseTimer - dt);
  const owner = getPlayer(state, state.ball.owner);
  if (owner) {
    const movement = Math.hypot(owner.vx, owner.vy);
    const stride = Math.sin(state.elapsed * 12 + owner.id) * 0.14;
    const touchDistance =
      1.32 + Math.abs(stride) + Math.min(0.22, movement * 0.01);
    state.ball.x = owner.x + owner.facingX * touchDistance;
    state.ball.y = owner.y + owner.facingY * touchDistance;
    state.ball.z = 0.12 + (movement > 2 ? Math.abs(stride) * 0.85 : 0);
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

    if (ballSpeed < 19 && state.ball.z < 1.1 && state.ball.looseTimer <= 0) {
      const controlCandidate = state.players
        .filter(
          (player) =>
            !player.sentOff &&
            player.role !== "GK" &&
            player.slideTimer <= 0 &&
            player.stumbleTimer <= 0,
        )
        .sort(
          (a, b) =>
            distance(a.x, a.y, state.ball.x, state.ball.y) -
            distance(b.x, b.y, state.ball.x, state.ball.y),
        )[0];
      if (controlCandidate) {
        const controlDistance = distance(
          controlCandidate.x,
          controlCandidate.y,
          state.ball.x,
          state.ball.y,
        );
        if (controlDistance < 4.2 && controlDistance > 0.05) {
          state.ball.vx +=
            ((controlCandidate.x - state.ball.x) / controlDistance) * dt * 13;
          state.ball.vy +=
            ((controlCandidate.y - state.ball.y) / controlDistance) * dt * 13;
        }
      }
    }

    state.players.forEach((player) => {
      if (player.sentOff || player.slideTimer > 0 || player.stumbleTimer > 0)
        return;
      if (state.ball.looseTimer > 0 && player.id === state.ball.lastPlayerId) {
        return;
      }
      const d = distance(player.x, player.y, state.ball.x, state.ball.y);
      const sameTeamPass = player.side === state.ball.lastTouch;
      const isSelectedHuman =
        player.id === state.selectedId ||
        (state.gameMode === "local2p" && player.id === state.selectedAwayId);
      const controlRadius =
        player.role === "GK"
          ? 3.05 + (player.keeperDiveTimer > 0 ? 1.18 : 0)
          : sameTeamPass
            ? 2.05 + (player.passing - 75) * 0.006
            : 1.62 + (player.overall - 75) * 0.005;
      const controlSpeed =
        (player.role === "GK" ? 78 : sameTeamPass ? 36 : 27) *
        teamAbility(state, player.side) *
        playerAttributeFactor(
          player.role === "GK" ? player.overall : player.passing,
        );
      const bonusRadius = isSelectedHuman ? 0.22 : 0;
      const canReachHeight =
        player.role === "GK" ? state.ball.z < 6.25 : state.ball.z < 1.55;
      const canControl = ballSpeed < controlSpeed && canReachHeight;
      if (d < controlRadius + bonusRadius && canControl && d < pickupDistance) {
        pickup = player;
        pickupDistance = d;
      } else if (
        player.role !== "GK" &&
        state.ball.z < 2.1 &&
        ballSpeed >= controlSpeed &&
        d < 1.42 &&
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
      if (
        pickup.role === "GK" &&
        ballSpeed > 31 &&
        random(state) > catchChance
      ) {
        const wideDirection = state.ball.y < 32 ? -1 : 1;
        state.ball.owner = null;
        state.ball.lastTouch = pickup.side;
        state.ball.lastPlayerId = pickup.id;
        state.ball.vx = attackDirectionFor(state, pickup.side) * 24;
        state.ball.vy = wideDirection * (26 + random(state) * 9);
        state.ball.z = Math.max(0.7, state.ball.z * 0.65);
        state.ball.vz = 3.8;
        state.ball.spin = (random(state) - 0.5) * 5;
        state.ball.looseTimer = 0.08;
        pickup.keeperDiveTimer = 0.38;
        pickup.keeperDiveDirection =
          Math.sign(state.ball.vy) || pickup.keeperDiveDirection || 1;
        setMessage(state, "ESPALMA O GOLEIRO!", 0.8);
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
      if (pickup.role === "GK") pickup.decisionCooldown = 0.72;
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

function updateSteals(state: MatchState, dt: number, demo: boolean) {
  const owner = getPlayer(state, state.ball.owner);
  if (!owner) return;
  if (owner.controlShield > 0) return;
  state.players.forEach((player) => {
    const humanControlled =
      !demo &&
      ((player.side === "home" && player.id === state.selectedId) ||
        (state.gameMode === "local2p" &&
          player.side === "away" &&
          player.id === state.selectedAwayId));
    if (
      !humanControlled &&
      player.side !== owner.side &&
      player.role !== "GK" &&
      !player.sentOff &&
      player.stealTimer <= 0 &&
      player.slideTimer <= 0 &&
      player.stumbleTimer <= 0 &&
      distance(player.x, player.y, owner.x, owner.y) < 1.35 &&
      player.tackleCooldown <= 0
    ) {
      const base =
        (player.side === "away" && state.difficulty === "hard" ? 0.7 : 0.42) *
        playerAttributeFactor(player.defending) *
        teamAbility(state, player.side);
      if (random(state) < dt * base) {
        player.tackleCooldown = 0.9;
        const ownerToDefenderX = player.x - owner.x;
        const ownerToDefenderY = player.y - owner.y;
        const ownerDistance = Math.max(
          0.001,
          Math.hypot(ownerToDefenderX, ownerToDefenderY),
        );
        const fromBehind =
          (ownerToDefenderX * owner.facingX +
            ownerToDefenderY * owner.facingY) /
            ownerDistance <
          -0.3;
        const cleanChance = clamp(
          (player.side === "away" && state.difficulty === "hard" ? 0.9 : 0.82) -
            (fromBehind ? 0.27 : 0) +
            duelModifier(player.defending, ballControlRating(owner)) +
            (teamAbility(state, player.side) -
              teamAbility(state, owner.side)) *
              0.28,
          0.46,
          0.92,
        );
        const cleanTackle = demo || random(state) < cleanChance;
        if (cleanTackle) {
          state.ball.owner = player.id;
          state.ball.lastTouch = player.side;
          state.ball.lastPlayerId = player.id;
          state.ball.z = 0.12;
          state.ball.vz = 0;
          player.controlShield = controlShieldDuration(player);
          if (!demo && player.side === "home") state.selectedId = player.id;
          if (!demo && player.side === "away" && state.gameMode === "local2p") {
            state.selectedAwayId = player.id;
          }
        } else {
          commitFoul(state, player, owner, demo);
        }
      }
    }
  });
}

function updateParticles(state: MatchState, dt: number) {
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

function updateSetPiece(
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
    let aimDirection =
      (piece.side === "home"
        ? input.keys.has("KeyS")
          ? 1
          : 0
        : input.keys.has("ArrowDown")
          ? 1
          : 0) -
      (piece.side === "home"
        ? input.keys.has("KeyW")
          ? 1
          : 0
        : input.keys.has("ArrowUp")
          ? 1
          : 0);
    if (piece.side === "home") aimDirection += input.touchY;
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

function updateMatch(
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
        state.finished = true;
        state.paused = true;
        setMessage(state, "FIM DE JOGO", 99);
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
  resolveKeeperSmothers(state, demo);
  resolveStealAttempts(state, demo);
  if (state.setPiece) return;
  resolveSlideTackles(state, demo);
  if (state.setPiece) return;
  updateBall(state, dt, demo);
  updateSteals(state, dt, demo);

  state.players.forEach((player) => {
    if (player.sentOff) return;
    player.x = clamp(player.x, 2.5, FIELD_W - 2.5);
    player.y = clamp(player.y, 3.5, FIELD_H - 3.5);
  });
}

type View = { width: number; height: number; dpr: number };

function project(view: View, x: number, y: number) {
  const t = y / FIELD_H;
  const top = view.height * 0.115;
  const bottom = view.height * 0.955;
  const inset = view.width * (0.075 - t * 0.045);
  const left = view.width * 0.025 + inset;
  const right = view.width * 0.975 - inset;
  return {
    x: left + (x / FIELD_W) * (right - left),
    y: top + t * (bottom - top),
  };
}

function traceWorldPolygon(
  ctx: CanvasRenderingContext2D,
  view: View,
  points: Array<[number, number]>,
) {
  points.forEach(([x, y], index) => {
    const p = project(view, x, y);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

function drawWorldLine(
  ctx: CanvasRenderingContext2D,
  view: View,
  points: Array<[number, number]>,
) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    const p = project(view, x, y);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
}

function drawStadium(
  ctx: CanvasRenderingContext2D,
  view: View,
  quality: Quality,
) {
  const bg = ctx.createLinearGradient(0, 0, 0, view.height);
  bg.addColorStop(0, "#071018");
  bg.addColorStop(0.45, "#101b22");
  bg.addColorStop(1, "#020506");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, view.width, view.height);

  const glow = ctx.createRadialGradient(
    view.width * 0.5,
    0,
    0,
    view.width * 0.5,
    0,
    view.width * 0.65,
  );
  glow.addColorStop(0, "rgba(105,196,255,.20)");
  glow.addColorStop(1, "rgba(7,16,24,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, view.width, view.height * 0.55);

  ctx.fillStyle = "#18242b";
  ctx.fillRect(0, view.height * 0.04, view.width, view.height * 0.09);
  const dots =
    quality === "performance" ? 120 : quality === "balanced" ? 230 : 360;
  for (let index = 0; index < dots; index += 1) {
    const x = ((index * 83) % 997) / 997;
    const y = (((index * 47) % 199) / 199) * 0.07 + 0.05;
    const hue =
      index % 11 === 0 ? "#ffd60a" : index % 7 === 0 ? "#56cbff" : "#d5e0e5";
    ctx.globalAlpha = 0.2 + ((index * 17) % 10) / 25;
    ctx.fillStyle = hue;
    ctx.fillRect(x * view.width, y * view.height, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;

  const boardY = view.height * 0.128;
  const boardHeight = Math.max(7, view.height * 0.018);
  const boardGradient = ctx.createLinearGradient(0, boardY, view.width, boardY);
  boardGradient.addColorStop(0, "#ffd60a");
  boardGradient.addColorStop(0.25, "#37d8ff");
  boardGradient.addColorStop(0.5, "#ffd60a");
  boardGradient.addColorStop(0.75, "#3ee28a");
  boardGradient.addColorStop(1, "#ffd60a");
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = boardGradient;
  ctx.fillRect(0, boardY, view.width, boardHeight);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(5,12,15,.82)";
  ctx.font = "900 " + Math.max(6, view.height * 0.011) + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const boardLabels = [
    "STADLER FOOTBALL",
    "FAIR PLAY",
    "TITAN SPORTS",
    "NEXT LEVEL",
  ];
  boardLabels.forEach((label, index) => {
    ctx.fillText(
      label,
      ((index + 0.5) / boardLabels.length) * view.width,
      boardY + boardHeight / 2,
    );
  });

  if (quality !== "performance") {
    const leftLight = ctx.createRadialGradient(
      view.width * 0.12,
      view.height * 0.03,
      0,
      view.width * 0.12,
      view.height * 0.03,
      view.height * 0.3,
    );
    leftLight.addColorStop(0, "rgba(230,249,255,.18)");
    leftLight.addColorStop(1, "rgba(230,249,255,0)");
    ctx.fillStyle = leftLight;
    ctx.fillRect(0, 0, view.width * 0.45, view.height * 0.5);
    ctx.save();
    ctx.translate(view.width, 0);
    ctx.scale(-1, 1);
    ctx.fillRect(0, 0, view.width * 0.45, view.height * 0.5);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    traceWorldPolygon(ctx, view, [
      [0, 0],
      [100, 0],
      [100, 64],
      [0, 64],
    ]);
    ctx.clip();
    const pitchLight = ctx.createLinearGradient(
      view.width * 0.18,
      view.height * 0.12,
      view.width * 0.82,
      view.height * 0.95,
    );
    pitchLight.addColorStop(0, "rgba(209,255,224,.075)");
    pitchLight.addColorStop(0.48, "rgba(255,255,255,0)");
    pitchLight.addColorStop(1, "rgba(1,29,15,.11)");
    ctx.fillStyle = pitchLight;
    ctx.fillRect(0, 0, view.width, view.height);

    const wearSpots = [project(view, 7, 32), project(view, 93, 32)];
    wearSpots.forEach((spot) => {
      const wear = ctx.createRadialGradient(
        spot.x,
        spot.y,
        0,
        spot.x,
        spot.y,
        view.height * 0.055,
      );
      wear.addColorStop(0, "rgba(177,190,112,.14)");
      wear.addColorStop(1, "rgba(177,190,112,0)");
      ctx.fillStyle = wear;
      ctx.fillRect(
        spot.x - view.height * 0.07,
        spot.y - view.height * 0.04,
        view.height * 0.14,
        view.height * 0.08,
      );
    });
    ctx.restore();
  }

  if (quality !== "performance") {
    const crest = project(view, 50, 32);
    const crestRadius = clamp(view.height * 0.052, 19, 42);
    ctx.save();
    ctx.globalAlpha = quality === "ultra" ? 0.13 : 0.085;
    ctx.strokeStyle = "#ecfff1";
    ctx.lineWidth = Math.max(1.2, view.height / 430);
    ctx.beginPath();
    ctx.arc(crest.x, crest.y, crestRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(crest.x, crest.y, crestRadius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ecfff1";
    ctx.font = "950 " + crestRadius * 0.67 + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SF", crest.x, crest.y + crestRadius * 0.04);
    ctx.restore();
  }
}

function drawField(
  ctx: CanvasRenderingContext2D,
  view: View,
  quality: Quality,
  state: MatchState,
) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.72)";
  ctx.shadowBlur = 28;
  ctx.beginPath();
  traceWorldPolygon(ctx, view, [
    [0, 0],
    [100, 0],
    [100, 64],
    [0, 64],
  ]);
  ctx.fillStyle = "#14753c";
  ctx.fill();
  ctx.restore();

  for (let stripe = 0; stripe < 8; stripe += 1) {
    ctx.beginPath();
    traceWorldPolygon(ctx, view, [
      [0, stripe * 8],
      [100, stripe * 8],
      [100, (stripe + 1) * 8],
      [0, (stripe + 1) * 8],
    ]);
    ctx.fillStyle = stripe % 2 === 0 ? "#1c8748" : "#157b40";
    ctx.fill();
  }

  if (quality !== "performance") {
    for (let stripe = 0; stripe < 10; stripe += 1) {
      ctx.beginPath();
      traceWorldPolygon(ctx, view, [
        [stripe * 10, 0],
        [(stripe + 1) * 10, 0],
        [(stripe + 1) * 10, 64],
        [stripe * 10, 64],
      ]);
      ctx.fillStyle =
        stripe % 2 === 0 ? "rgba(255,255,255,.018)" : "rgba(0,0,0,.018)";
      ctx.fill();
    }

    const grassDetails = quality === "ultra" ? 320 : 150;
    ctx.save();
    ctx.lineWidth = 0.55;
    for (let index = 0; index < grassDetails; index += 1) {
      const worldX = ((index * 47 + 13) % 997) / 9.97;
      const worldY = ((index * 83 + 29) % 631) / 9.86;
      const grass = project(view, worldX, worldY);
      ctx.strokeStyle =
        index % 3 === 0 ? "rgba(220,255,226,.11)" : "rgba(1,45,21,.14)";
      ctx.beginPath();
      ctx.moveTo(grass.x, grass.y);
      ctx.lineTo(grass.x + (index % 2 ? 1.1 : -0.8), grass.y - 1.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(244,255,246,.82)";
  ctx.lineWidth = Math.max(1, view.height / 560);
  drawWorldLine(ctx, view, [
    [0, 0],
    [100, 0],
    [100, 64],
    [0, 64],
    [0, 0],
  ]);
  drawWorldLine(ctx, view, [
    [50, 0],
    [50, 64],
  ]);
  drawWorldLine(ctx, view, [
    [0, 15],
    [17, 15],
    [17, 49],
    [0, 49],
  ]);
  drawWorldLine(ctx, view, [
    [100, 15],
    [83, 15],
    [83, 49],
    [100, 49],
  ]);
  drawWorldLine(ctx, view, [
    [0, 23],
    [6, 23],
    [6, 41],
    [0, 41],
  ]);
  drawWorldLine(ctx, view, [
    [100, 23],
    [94, 23],
    [94, 41],
    [100, 41],
  ]);

  const circle: Array<[number, number]> = [];
  for (let index = 0; index <= 40; index += 1) {
    const angle = (index / 40) * Math.PI * 2;
    circle.push([50 + Math.cos(angle) * 9.2, 32 + Math.sin(angle) * 9.2]);
  }
  drawWorldLine(ctx, view, circle);
  const center = project(view, 50, 32);
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.beginPath();
  ctx.arc(center.x, center.y, 2, 0, Math.PI * 2);
  ctx.fill();

  const penaltySpots = [project(view, 11, 32), project(view, 89, 32)];
  penaltySpots.forEach((spot) => {
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  const leftArc: Array<[number, number]> = [];
  const rightArc: Array<[number, number]> = [];
  for (let index = 0; index <= 18; index += 1) {
    const leftAngle = -0.94 + (index / 18) * 1.88;
    const rightAngle = Math.PI - 0.94 + (index / 18) * 1.88;
    leftArc.push([
      11 + Math.cos(leftAngle) * 9.2,
      32 + Math.sin(leftAngle) * 9.2,
    ]);
    rightArc.push([
      89 + Math.cos(rightAngle) * 9.2,
      32 + Math.sin(rightAngle) * 9.2,
    ]);
  }
  drawWorldLine(ctx, view, leftArc);
  drawWorldLine(ctx, view, rightArc);

  const cornerSpecs: Array<[number, number, number, number]> = [
    [0, 0, 0, Math.PI / 2],
    [100, 0, Math.PI / 2, Math.PI],
    [100, 64, Math.PI, Math.PI * 1.5],
    [0, 64, Math.PI * 1.5, Math.PI * 2],
  ];
  cornerSpecs.forEach(([cx, cy, start, end]) => {
    const points: Array<[number, number]> = [];
    for (let index = 0; index <= 8; index += 1) {
      const angle = start + ((end - start) * index) / 8;
      points.push([cx + Math.cos(angle) * 2.2, cy + Math.sin(angle) * 2.2]);
    }
    drawWorldLine(ctx, view, points);
  });

  drawGoal(ctx, view, "home", state.netPulse);
  drawGoal(ctx, view, "away", state.netPulse);
}

function drawGoal(
  ctx: CanvasRenderingContext2D,
  view: View,
  side: Side,
  netPulse: number,
) {
  const x = side === "home" ? 0 : 100;
  const outsideX =
    side === "home" ? -3.6 - netPulse * 1.4 : 103.6 + netPulse * 1.4;
  const a = project(view, x, GOAL_TOP);
  const b = project(view, x, GOAL_BOTTOM);
  const c = project(view, outsideX, GOAL_TOP + 1);
  const d = project(view, outsideX, GOAL_BOTTOM - 1);
  ctx.save();
  const netGlow = ctx.createLinearGradient(a.x, a.y, c.x, c.y);
  netGlow.addColorStop(0, "rgba(255,255,255,.1)");
  netGlow.addColorStop(1, "rgba(130,225,255,.02)");
  ctx.fillStyle = netGlow;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.lineTo(b.x, b.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(239,250,255,.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.globalAlpha = 0.32;
  ctx.lineWidth = 0.7;
  for (let index = 1; index < 5; index += 1) {
    const t = index / 5;
    ctx.beginPath();
    ctx.moveTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    ctx.lineTo(c.x + (d.x - c.x) * t, c.y + (d.y - c.y) * t);
    ctx.stroke();
  }
  for (let index = 1; index < 4; index += 1) {
    const t = index / 4;
    ctx.beginPath();
    ctx.moveTo(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t);
    ctx.lineTo(b.x + (d.x - b.x) * t, b.y + (d.y - b.y) * t);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  view: View,
  player: Player,
  team: Team,
  selected: boolean,
  quality: Quality,
) {
  const p = project(view, player.x, player.y);
  const depthScale = 0.78 + (player.y / FIELD_H) * 0.28;
  const size = clamp(view.height / 48, 8, 14) * depthScale;
  const speed = Math.hypot(player.vx, player.vy);
  const kitPrimary =
    player.role === "GK"
      ? player.side === "home"
        ? "#8dff5a"
        : "#ff714b"
      : team.primary;
  const kitSecondary =
    player.role === "GK"
      ? player.side === "home"
        ? "#17390f"
        : "#4a130b"
      : team.secondary;
  const kitShorts = player.role === "GK" ? kitSecondary : team.shorts;
  const kitSocks = player.role === "GK" ? kitPrimary : team.socks;

  ctx.save();
  ctx.translate(p.x, p.y);
  if (
    player.role === "GK" &&
    player.keeperDiveTimer > 0 &&
    quality !== "performance"
  ) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = kitPrimary;
    ctx.translate(0, -player.keeperDiveDirection * size * 0.58);
    ctx.rotate(player.keeperDiveDirection * 0.24);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.66, size * 1.02, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (speed > 15 && quality !== "performance" && player.slideTimer <= 0) {
    ctx.strokeStyle = "rgba(220,248,255,.22)";
    ctx.lineWidth = 1.2;
    for (let streak = 1; streak <= 2; streak += 1) {
      ctx.beginPath();
      ctx.moveTo(-player.facingX * size * (0.6 + streak * 0.3), size * 0.2);
      ctx.lineTo(-player.facingX * size * (1.2 + streak * 0.45), size * 0.35);
      ctx.stroke();
    }
  }
  if (player.role === "GK" && player.keeperDiveTimer > 0) {
    ctx.rotate(player.keeperDiveDirection * 0.34);
    ctx.scale(1.08, 0.9);
  } else if (player.slideTimer > 0) {
    ctx.rotate(player.facingY * 0.48);
    ctx.translate(player.facingX * size * 0.28, size * 0.28);
    ctx.scale(1.34, 0.64);
  } else if (player.stealTimer > 0) {
    ctx.rotate(player.facingY * 0.18);
    ctx.translate(player.facingX * size * 0.2, size * 0.08);
    ctx.scale(1.12, 0.92);
  } else if (player.stumbleTimer > 0) {
    ctx.rotate(-player.facingY * 0.2);
  }
  ctx.fillStyle = "rgba(0,0,0,.32)";
  ctx.beginPath();
  ctx.ellipse(1.5, size * 0.8, size * 0.75, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  if (selected) {
    const selectionPulse = 0.82 + Math.sin(performance.now() * 0.008) * 0.12;
    ctx.strokeStyle = team.primary;
    ctx.globalAlpha = selectionPulse;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.45, size, size * 0.46, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = team.primary;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.75);
    ctx.lineTo(-size * 0.38, -size * 2.3);
    ctx.lineTo(size * 0.38, -size * 2.3);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = kitShorts;
  ctx.lineWidth = Math.max(2, size * 0.23);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-size * 0.25, size * 0.2);
  ctx.lineTo(-size * 0.4 + player.facingX * size * 0.15, size * 0.78);
  ctx.moveTo(size * 0.25, size * 0.2);
  ctx.lineTo(size * 0.4 + player.facingX * size * 0.15, size * 0.78);
  ctx.stroke();

  ctx.strokeStyle = kitSocks;
  ctx.lineWidth = Math.max(1.2, size * 0.12);
  ctx.beginPath();
  ctx.moveTo(-size * 0.39, size * 0.58);
  ctx.lineTo(-size * 0.42, size * 0.82);
  ctx.moveTo(size * 0.39, size * 0.58);
  ctx.lineTo(size * 0.42, size * 0.82);
  ctx.stroke();

  ctx.strokeStyle = "#e8ad7d";
  ctx.lineWidth = Math.max(1.6, size * 0.18);
  ctx.beginPath();
  ctx.moveTo(-size * 0.48, -size * 0.55);
  ctx.lineTo(-size * 0.72 - player.facingY * size * 0.12, -size * 0.05);
  ctx.moveTo(size * 0.48, -size * 0.55);
  ctx.lineTo(size * 0.72 + player.facingY * size * 0.12, -size * 0.05);
  ctx.stroke();

  if (player.role !== "GK") {
    ctx.strokeStyle =
      team.kitPattern === "white-sleeves" ? team.secondary : team.primary;
    ctx.lineWidth = Math.max(1.4, size * 0.24);
    ctx.beginPath();
    ctx.moveTo(-size * 0.48, -size * 0.58);
    ctx.lineTo(-size * 0.59 - player.facingY * size * 0.04, -size * 0.34);
    ctx.moveTo(size * 0.48, -size * 0.58);
    ctx.lineTo(size * 0.59 + player.facingY * size * 0.04, -size * 0.34);
    ctx.stroke();
  }

  if (player.role === "GK") {
    ctx.fillStyle = "#f5fbff";
    ctx.beginPath();
    ctx.arc(-size * 0.78, -size * 0.03, size * 0.19, 0, Math.PI * 2);
    ctx.arc(size * 0.78, -size * 0.03, size * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(25,45,55,.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const jersey = ctx.createLinearGradient(-size, -size, size, size);
  jersey.addColorStop(0, kitPrimary);
  jersey.addColorStop(1, player.role === "GK" ? kitSecondary : kitPrimary);
  ctx.fillStyle = jersey;
  ctx.beginPath();
  ctx.roundRect(
    -size * 0.53,
    -size * 0.88,
    size * 1.06,
    size * 1.18,
    size * 0.36,
  );
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.28)";
  ctx.lineWidth = 1;
  ctx.stroke();
  if (player.role !== "GK") {
    ctx.save();
    ctx.clip();
    if (team.kitPattern === "horizontal") {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = team.secondary;
      ctx.fillRect(-size * 0.56, -size * 0.47, size * 1.12, size * 0.2);
      ctx.fillRect(-size * 0.56, -size * 0.02, size * 1.12, size * 0.2);
    } else if (team.kitPattern === "vertical") {
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = team.secondary;
      ctx.fillRect(-size * 0.43, -size * 0.9, size * 0.18, size * 1.24);
      ctx.fillRect(size * 0.24, -size * 0.9, size * 0.18, size * 1.24);
      if (team.kitAccent) {
        ctx.fillStyle = team.kitAccent;
        ctx.fillRect(-size * 0.08, -size * 0.9, size * 0.16, size * 1.24);
      }
    } else if (team.kitPattern === "sash") {
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = team.secondary;
      ctx.translate(-size * 0.02, -size * 0.24);
      ctx.rotate(-0.62);
      ctx.fillRect(-size * 0.13, -size * 0.9, size * 0.27, size * 1.8);
    } else if (team.kitPattern === "chest-band") {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = team.secondary;
      ctx.fillRect(-size * 0.56, -size * 0.35, size * 1.12, size * 0.15);
      ctx.fillStyle = team.kitAccent ?? "#151515";
      ctx.fillRect(-size * 0.56, -size * 0.2, size * 1.12, size * 0.15);
    } else if (team.kitPattern === "center-stripe") {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = team.kitAccent ?? "#f5f5f5";
      ctx.fillRect(-size * 0.16, -size * 0.9, size * 0.32, size * 1.24);
      ctx.fillStyle = team.secondary;
      ctx.fillRect(-size * 0.085, -size * 0.9, size * 0.17, size * 1.24);
    } else {
      ctx.fillStyle = "rgba(255,255,255,.24)";
      ctx.fillRect(-size * 0.055, -size * 0.84, size * 0.11, size * 1.02);
    }
    ctx.restore();
  }

  if (player.role !== "GK") {
    ctx.strokeStyle = team.secondary;
    ctx.lineWidth = Math.max(0.7, size * 0.065);
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.81);
    ctx.quadraticCurveTo(0, -size * 0.67, size * 0.22, -size * 0.81);
    ctx.stroke();
    if (team.kitPattern === "solid" && team.kitAccent) {
      ctx.strokeStyle = team.kitAccent;
      ctx.lineWidth = Math.max(0.6, size * 0.045);
      ctx.beginPath();
      ctx.moveTo(-size * 0.43, -size * 0.68);
      ctx.lineTo(-size * 0.28, -size * 0.78);
      ctx.moveTo(size * 0.43, -size * 0.68);
      ctx.lineTo(size * 0.28, -size * 0.78);
      ctx.stroke();
    }
  }

  if (player.role === "GK") {
    ctx.strokeStyle = "rgba(255,255,255,.58)";
    ctx.lineWidth = Math.max(0.8, size * 0.075);
    ctx.beginPath();
    ctx.moveTo(-size * 0.36, -size * 0.52);
    ctx.lineTo(size * 0.36, -size * 0.52);
    ctx.stroke();
  }

  ctx.fillStyle = "#f0bc8b";
  ctx.beginPath();
  ctx.arc(0, -size * 1.15, size * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#17191c";
  ctx.beginPath();
  ctx.arc(0, -size * 1.27, size * 0.31, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = kitSecondary;
  ctx.font = "700 " + Math.max(7, size * 0.58) + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(player.number), 0, -size * 0.28);

  if (player.yellowCards > 0) {
    ctx.fillStyle = "#ffe000";
    ctx.strokeStyle = "rgba(0,0,0,.42)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(size * 0.62, -size * 1.72, size * 0.34, size * 0.48, 1);
    ctx.fill();
    ctx.stroke();
  }

  if (selected && quality !== "performance") {
    const label = player.name.toUpperCase();
    ctx.font = "800 " + Math.max(8, size * 0.58) + "px Arial";
    const width = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(4,9,12,.84)";
    ctx.beginPath();
    ctx.roundRect(-width / 2, size * 1.05, width, size * 0.9, 5);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(label, 0, size * 1.5);
  }
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, view: View, ball: Ball) {
  const p = project(view, ball.x, ball.y);
  const liftPixels = ball.z * clamp(view.height / 92, 5.4, 10.5);
  const ballY = p.y - liftPixels;
  const radius =
    clamp(view.height / 150, 3.1, 5.4) *
    (0.82 + (ball.y / FIELD_H) * 0.22) *
    (1 + Math.min(0.16, ball.z * 0.018));
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0," + clamp(0.34 - ball.z * 0.035, 0.1, 0.34) + ")";
  ctx.beginPath();
  ctx.ellipse(
    p.x + 1.5,
    p.y + radius * 1.5,
    radius * (1.25 + ball.z * 0.03),
    radius * 0.55,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  const gradient = ctx.createRadialGradient(
    p.x - radius * 0.35,
    ballY - radius * 0.45,
    0,
    p.x,
    ballY,
    radius * 1.3,
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.68, "#eef3f4");
  gradient.addColorStop(1, "#8b979d");
  ctx.fillStyle = gradient;
  if (ball.z > 0.85) {
    ctx.shadowColor = "rgba(218,248,255,.62)";
    ctx.shadowBlur = Math.min(15, 4 + ball.z * 1.4);
  }
  ctx.beginPath();
  ctx.arc(p.x, ballY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#172129";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(
    p.x + Math.cos(ball.spin + performance.now() * 0.01) * radius * 0.2,
    ballY,
    radius * 0.32,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.restore();
}

function drawDefensiveCue(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: MatchState,
  quality: Quality,
) {
  const owner = getPlayer(state, state.ball.owner);
  if (!owner) return;
  const controlled = [getPlayer(state, state.selectedId)];
  if (state.gameMode === "local2p") {
    controlled.push(getPlayer(state, state.selectedAwayId));
  }
  controlled.forEach((player) => {
    if (!player || player.side === owner.side || player.role === "GK") return;
    const pressDistance = distance(player.x, player.y, owner.x, owner.y);
    if (pressDistance > 6.2) return;
    const from = project(view, player.x, player.y);
    const target = project(view, owner.x, owner.y);
    const color =
      player.side === "home" ? state.homeTeam.primary : state.awayTeam.primary;
    const readiness = clamp(1 - pressDistance / 6.2, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.28 + readiness * 0.48;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3 + readiness * 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 9 + (1 - readiness) * 4, 0, Math.PI * 2);
    ctx.stroke();
    if (quality !== "performance") {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  });
}

function drawBallTrail(
  ctx: CanvasRenderingContext2D,
  view: View,
  trail: TrailPoint[],
) {
  trail.forEach((point, index) => {
    const p = project(view, point.x, point.y);
    const liftPixels = point.z * clamp(view.height / 92, 5.4, 10.5);
    const size = 1.5 + (index / Math.max(1, trail.length)) * 2.3;
    ctx.globalAlpha = clamp(point.life * 0.52, 0, 0.42);
    ctx.fillStyle = "#e9fbff";
    ctx.beginPath();
    ctx.arc(p.x, p.y - liftPixels, size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawSetPieceGuide(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: MatchState,
) {
  const piece = state.setPiece;
  if (
    !piece ||
    !piece.ready ||
    (piece.side === "away" && state.gameMode !== "local2p")
  ) {
    return;
  }
  const from = project(view, piece.spotX, piece.spotY);
  const attackDirection = attackDirectionFor(state, piece.side);
  let targetX = attackingGoalX(state, piece.side, 3);
  let targetY = piece.aimY;
  if (piece.kind === "corner") {
    targetX = attackingGoalX(state, piece.side) - attackDirection * 13;
    targetY = 32;
  } else if (piece.kind === "throwIn") {
    targetX = clamp(piece.spotX + attackDirection * 13, 5, 95);
    targetY = piece.spotY < 32 ? 11 : 53;
  } else if (piece.kind === "goalKick") {
    targetX = piece.spotX + attackDirection * 31;
    targetY = 32;
  } else if (piece.kind === "offside") {
    targetX = piece.spotX + attackDirection * 14;
    targetY = piece.spotY;
  }
  const to = project(view, targetX, targetY);
  const guideColor =
    piece.side === "home" ? state.homeTeam.primary : state.awayTeam.primary;
  ctx.save();
  ctx.strokeStyle = guideColor;
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = guideColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(to.x, to.y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x - 11, to.y);
  ctx.lineTo(to.x + 11, to.y);
  ctx.moveTo(to.x, to.y - 11);
  ctx.lineTo(to.x, to.y + 11);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  view: View,
  particles: Particle[],
) {
  particles.forEach((particle) => {
    const p = project(view, particle.x, particle.y);
    ctx.globalAlpha = clamp(particle.life, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(p.x, p.y, particle.size, particle.size * 1.8);
  });
  ctx.globalAlpha = 1;
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: MatchState,
) {
  const width = clamp(view.width * 0.18, 120, 184);
  const height = width * 0.38;
  const x = view.width / 2 - width / 2;
  const y = view.height - height - 9;
  ctx.save();
  ctx.fillStyle = "rgba(3,9,12,.72)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.3)";
  ctx.strokeRect(x + 7, y + 7, width - 14, height - 14);
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y + 7);
  ctx.lineTo(x + width / 2, y + height - 7);
  ctx.stroke();
  state.players.forEach((player) => {
    if (player.sentOff) return;
    ctx.fillStyle =
      player.side === "home" ? state.homeTeam.primary : state.awayTeam.primary;
    ctx.beginPath();
    ctx.arc(
      x + 7 + (player.x / FIELD_W) * (width - 14),
      y + 7 + (player.y / FIELD_H) * (height - 14),
      player.id === state.selectedId ||
        (state.gameMode === "local2p" && player.id === state.selectedAwayId)
        ? 3.2
        : 2.1,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(
    x + 7 + (state.ball.x / FIELD_W) * (width - 14),
    y + 7 + (state.ball.y / FIELD_H) * (height - 14),
    1.8,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  view: View,
  state: MatchState,
  quality: Quality,
) {
  const shakeScale = clamp(view.height / 720, 0.65, 1.25);
  const shakeX =
    Math.sin(state.elapsed * 93) * state.cameraShake * 5.5 * shakeScale;
  const shakeY =
    Math.cos(state.elapsed * 71) * state.cameraShake * 3.4 * shakeScale;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawStadium(ctx, view, quality);
  drawField(ctx, view, quality, state);
  drawDefensiveCue(ctx, view, state, quality);
  if (quality !== "performance") drawBallTrail(ctx, view, state.trail);
  const sortedPlayers = state.players
    .filter((player) => !player.sentOff)
    .sort((a, b) => a.y - b.y);
  sortedPlayers.forEach((player) => {
    const selected =
      player.id === state.selectedId ||
      (state.gameMode === "local2p" && player.id === state.selectedAwayId);
    drawPlayer(
      ctx,
      view,
      player,
      player.side === "home" ? state.homeTeam : state.awayTeam,
      selected,
      quality,
    );
  });
  drawSetPieceGuide(ctx, view, state);
  drawBall(ctx, view, state.ball);
  drawParticles(ctx, view, state.particles);
  ctx.restore();
  drawMinimap(ctx, view, state);
  if (quality === "ultra") {
    const vignette = ctx.createRadialGradient(
      view.width / 2,
      view.height / 2,
      view.height * 0.3,
      view.width / 2,
      view.height / 2,
      view.width * 0.72,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.32)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, view.width, view.height);
  }
  if (state.impactFlash > 0) {
    ctx.fillStyle = "rgba(226,248,255," + state.impactFlash * 0.18 + ")";
    ctx.fillRect(0, 0, view.width, view.height);
  }
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}

function badgeTextColor(color: string) {
  const hex = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#fff";
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 255000;
  return luminance > 0.66 ? "#101416" : "#fff";
}

function officialCrestUrl(team: Team) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    team.officialDomain,
  )}&sz=128`;
}

function TeamBadge({
  team,
  compact = false,
}: {
  team: Team;
  compact?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span
      className={"team-badge" + (compact ? " team-badge--compact" : "")}
      style={{
        background:
          "linear-gradient(145deg, " +
          team.primary +
          ", " +
          team.secondary +
          ")",
        color: badgeTextColor(team.primary),
      }}
      role="img"
      aria-label={`Escudo do ${team.name}`}
      title={team.name}
    >
      {!imageFailed && (
        // External club favicons need the native error event for the in-game fallback.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={officialCrestUrl(team)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      )}
      <span className="team-badge__fallback" aria-hidden="true">
        {team.short.slice(0, 3)}
      </span>
    </span>
  );
}

function TeamFlag({ team }: { team: Team }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span
      className="team-flag"
      role="img"
      aria-label={`Escudo do ${team.name}`}
      title={team.name}
    >
      <span
        className="team-flag__cloth"
        style={{
          background:
            "linear-gradient(135deg, " +
            team.primary +
            " 0 48%, " +
            team.secondary +
            " 48% 100%)",
          color: badgeTextColor(team.primary),
        }}
      >
        {!imageFailed && (
          // External club favicons need the native error event for the in-game fallback.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={officialCrestUrl(team)}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        )}
        <span aria-hidden="true">{team.short}</span>
      </span>
      <span className="team-flag__country" aria-hidden="true">
        {team.flag}
      </span>
    </span>
  );
}

function leagueFor(leagueId: LeagueId) {
  return LEAGUES.find((league) => league.id === leagueId) ?? LEAGUES[0];
}

function leagueNameFor(leagueId: LeagueId) {
  return leagueFor(leagueId).name;
}

function cupNameFor(team: Team, scope: CupScope) {
  if (scope === "world") return "Mundial de Clubes";
  return team.leagueId === "brasileirao" ? "Libertadores" : "Champions League";
}

function leagueTeamsFor(leagueId: LeagueId) {
  return TEAMS.filter((team) => team.leagueId === leagueId).sort(
    (first, second) =>
      lineupOverall(second) - lineupOverall(first) ||
      first.name.localeCompare(second.name, "pt-BR"),
  );
}

function competitionPoolFor(
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

function createLeagueRows(leagueId: LeagueId): LeagueRow[] {
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

function applyFixture(
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

function simulateLeagueRound(
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
  let next = applyFixture(rows, homeId, awayId, homeGoals, awayGoals);
  const others = next.filter(
    (row) => row.teamId !== homeId && row.teamId !== awayId,
  );
  const simulatedGoals = (
    team: Team | undefined,
    rival: Team | undefined,
    salt: number,
  ) => {
    if (!team || !rival) return 0;
    const qualityEdge =
      (lineupOverall(team) - lineupOverall(rival)) * 0.12;
    const roll =
      (seedFromName(`${team.id}-${rival.id}-${salt}`) % 1000) / 999;
    return Math.round(clamp(0.35 + roll * 2.35 + qualityEdge, 0, 5));
  };
  for (let index = 0; index + 1 < others.length; index += 2) {
    const first = TEAMS.find((team) => team.id === others[index].teamId);
    const second = TEAMS.find((team) => team.id === others[index + 1].teamId);
    const round = others[index].played + 1;
    const firstGoals = simulatedGoals(first, second, round + index);
    const secondGoals = simulatedGoals(second, first, round * 2 + index);
    next = applyFixture(
      next,
      others[index].teamId,
      others[index + 1].teamId,
      firstGoals,
      secondGoals,
    );
  }
  return next;
}

function sortedLeagueRows(rows: LeagueRow[]) {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
}

function createCareer(team: Team): CareerState {
  return {
    clubId: team.id,
    season: 1,
    budget: Math.round(55 + Math.max(0, lineupOverall(team) - 78) * 10.5),
    fans: 250_000,
    squad: rosterFor(team).map((seed, index) => [
      seed[0],
      seed[1],
      seed[2],
      FORMATIONS["2-3-2"].slots[index]?.[0] ?? "MF",
    ]),
    history: [],
    transactions: [],
  };
}

function marketPrice(overall: number) {
  return Math.max(8, Math.round((overall - 65) ** 2 / 6));
}

function squadPlayerKey(seed: SquadSeed) {
  return `${seed[0].trim().toLocaleLowerCase("pt-BR")}-${seed[1]}`;
}

function completePurchase(current: CareerState, entry: MarketEntry) {
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

function completeSale(current: CareerState, player: SquadSeed) {
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

function transferMarketFor(team: Team, squad: SquadSeed[]): MarketEntry[] {
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

export default function FootballGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const engineRef = useRef<MatchState | null>(null);
  const screenRef = useRef<Screen>("menu");
  const qualityRef = useRef<Quality>("ultra");
  const audioEnabledRef = useRef(true);
  const inputRef = useRef<InputState>({
    keys: new Set<string>(),
    touchX: 0,
    touchY: 0,
    touchSprint: false,
  });
  const actionsRef = useRef<GameActions>({
    pass: () => undefined,
    shootStart: () => undefined,
    shootRelease: () => undefined,
    steal: () => undefined,
    switchPlayer: () => undefined,
    slide: () => undefined,
    togglePause: () => undefined,
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const resultRecordedRef = useRef(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [homeIndex, setHomeIndex] = useState(0);
  const [awayIndex, setAwayIndex] = useState(1);
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [competitionMode, setCompetitionMode] =
    useState<CompetitionMode>("friendly");
  const [cupScope, setCupScope] = useState<CupScope>("continental");
  const [selectedLeagueId, setSelectedLeagueId] =
    useState<LeagueId>("brasileirao");
  const [homeFormation, setHomeFormation] = useState<FormationId>("2-3-2");
  const [awayFormation, setAwayFormation] = useState<FormationId>("3-2-2");
  const [homeTactic, setHomeTactic] = useState<TacticId>("balanced");
  const [awayTactic, setAwayTactic] = useState<TacticId>("counter");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [quality, setQuality] = useState<Quality>("ultra");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [teamPickerSide, setTeamPickerSide] = useState<Side | null>(null);
  const [teamRegionFilter, setTeamRegionFilter] =
    useState<TeamRegionFilter>("all");
  const [paused, setPaused] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [leagueRows, setLeagueRows] = useState<LeagueRow[]>(() =>
    createLeagueRows("brasileirao"),
  );
  const [cupRound, setCupRound] = useState(0);
  const [cupEliminated, setCupEliminated] = useState(false);
  const [career, setCareer] = useState<CareerState>(() =>
    createCareer(TEAMS[0]),
  );
  const [hud, setHud] = useState<Hud>({
    homeScore: 0,
    awayScore: 0,
    remaining: HALF_SECONDS,
    half: 1,
    playerName: "Pedro",
    playerNumber: 9,
    stamina: 100,
    shotCharge: 0,
    message: "",
    fps: 60,
    setPieceKind: null,
    setPieceReady: false,
    setPieceSide: null,
    homeCards: 0,
    awayCards: 0,
    awayPlayerName: "Mbappé",
    awayPlayerNumber: 10,
    awayStamina: 100,
    awayShotCharge: 0,
    playerOverall: 84,
    awayPlayerOverall: 91,
    gameMode: "solo",
  });
  const [finalStats, setFinalStats] = useState<MatchStats>({
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
  });

  const homeTeam = TEAMS[homeIndex];
  const awayTeam = TEAMS[awayIndex];
  const selectedLeague = leagueFor(selectedLeagueId);
  const careerTeam =
    TEAMS.find((team) => team.id === career.clubId) ?? homeTeam;
  const activeCareerSquad =
    competitionMode === "career" && career.clubId === homeTeam.id
      ? career.squad
      : undefined;
  const homeOverall = useMemo(
    () => lineupOverall(homeTeam, homeFormation, activeCareerSquad),
    [activeCareerSquad, homeFormation, homeTeam],
  );
  const awayOverall = useMemo(
    () => lineupOverall(awayTeam, awayFormation),
    [awayFormation, awayTeam],
  );
  const availableAwayTeams = useMemo(
    () =>
      competitionPoolFor(
        homeTeam,
        competitionMode,
        cupScope,
        selectedLeagueId,
      ).filter((team) => team.id !== homeTeam.id),
    [competitionMode, cupScope, homeTeam, selectedLeagueId],
  );
  const teamPickerOptions = useMemo(() => {
    const championshipMode =
      competitionMode === "league" || competitionMode === "career";
    const source =
      teamPickerSide === "away"
        ? availableAwayTeams
        : championshipMode
          ? leagueTeamsFor(selectedLeagueId)
          : TEAMS;
    return source
      .filter((team) => {
        if (teamRegionFilter === "brazil") {
          return team.city === "Brasileirão";
        }
        if (teamRegionFilter === "europe") {
          return team.city.startsWith("Europa");
        }
        return true;
      })
      .sort((first, second) => {
        const firstRegion = first.city === "Brasileirão" ? 0 : 1;
        const secondRegion = second.city === "Brasileirão" ? 0 : 1;
        return (
          firstRegion - secondRegion ||
          first.city.localeCompare(second.city, "pt-BR") ||
          first.name.localeCompare(second.name, "pt-BR")
        );
      });
  }, [
    availableAwayTeams,
    competitionMode,
    selectedLeagueId,
    teamPickerSide,
    teamRegionFilter,
  ]);
  const featuredPlayer = useMemo(
    () =>
      [...rosterFor(homeTeam, activeCareerSquad)].sort(
        (a, b) => b[2] - a[2],
      )[0],
    [activeCareerSquad, homeTeam],
  );
  const featuredAttributes = useMemo(
    () => attributeProfile(featuredPlayer, featuredPlayer[3] ?? "FW"),
    [featuredPlayer],
  );
  const standings = useMemo(() => sortedLeagueRows(leagueRows), [leagueRows]);
  const transferMarket = useMemo(
    () => transferMarketFor(careerTeam, career.squad),
    [career.squad, careerTeam],
  );
  const careerStarters = useMemo(
    () => lineupFor(career.squad, FORMATIONS[homeFormation]),
    [career.squad, homeFormation],
  );
  const careerStarterKeys = useMemo(
    () => new Set(careerStarters.map(squadPlayerKey)),
    [careerStarters],
  );
  const careerOverall = useMemo(
    () => lineupOverall(careerTeam, homeFormation, career.squad),
    [career.squad, careerTeam, homeFormation],
  );

  useEffect(() => {
    let restoreTimer: number | undefined;
    try {
      const stored = window.localStorage.getItem("stadler-career-v1");
      if (!stored) return;
      const parsed = JSON.parse(stored) as CareerState;
      const storedTeamIndex = TEAMS.findIndex(
        (team) => team.id === parsed.clubId,
      );
      if (storedTeamIndex >= 0 && Array.isArray(parsed.squad)) {
        restoreTimer = window.setTimeout(() => {
          const restoredTeam = TEAMS[storedTeamIndex];
          const restoredLeagueTeams = leagueTeamsFor(restoredTeam.leagueId);
          setCareer({
            ...parsed,
            history: Array.isArray(parsed.history) ? parsed.history : [],
            transactions: Array.isArray(parsed.transactions)
              ? parsed.transactions
              : [],
          });
          setHomeIndex(storedTeamIndex);
          setSelectedLeagueId(restoredTeam.leagueId);
          setLeagueRows(createLeagueRows(restoredTeam.leagueId));
          const opponentIndex = TEAMS.findIndex(
            (team) =>
              team.id ===
              restoredLeagueTeams.find(
                (candidate) => candidate.id !== restoredTeam.id,
              )?.id,
          );
          if (opponentIndex >= 0) setAwayIndex(opponentIndex);
        }, 0);
      }
    } catch {
      // Um save inválido não impede o jogo de iniciar.
    }
    return () => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("stadler-career-v1", JSON.stringify(career));
    } catch {
      // O modo carreira segue funcional quando o navegador bloqueia storage.
    }
  }, [career]);

  useEffect(() => {
    if (screen !== "finished" || resultRecordedRef.current) return;
    const state = engineRef.current;
    if (!state) return;
    resultRecordedRef.current = true;
    if (competitionMode === "league" || competitionMode === "career") {
      setLeagueRows((current) =>
        simulateLeagueRound(
          current,
          state.homeTeam.id,
          state.awayTeam.id,
          state.homeScore,
          state.awayScore,
        ),
      );
    }
    if (competitionMode === "cup") {
      const possessionEdge =
        state.stats.homePossession >= state.stats.awayPossession;
      const advanced =
        state.homeScore > state.awayScore ||
        (state.homeScore === state.awayScore && possessionEdge);
      if (advanced) setCupRound((current) => Math.min(3, current + 1));
      else setCupEliminated(true);
    }
    if (competitionMode === "career") {
      const won = state.homeScore > state.awayScore;
      const draw = state.homeScore === state.awayScore;
      const income = won ? 14 : draw ? 8 : 5;
      const result = `${state.homeTeam.short} ${state.homeScore} × ${state.awayScore} ${state.awayTeam.short}`;
      setCareer((current) => ({
        ...current,
        budget: current.budget + income,
        fans: Math.max(
          10_000,
          current.fans + (won ? 7_500 : draw ? 1_800 : -2_200),
        ),
        history: [result, ...current.history].slice(0, 6),
      }));
    }
  }, [competitionMode, screen]);

  const playTone = useCallback(
    (kind: "kick" | "goal" | "whistle" | "tackle") => {
      if (!audioEnabledRef.current) return;
      try {
        const AudioCtor = window.AudioContext;
        const audio = audioContextRef.current ?? new AudioCtor();
        audioContextRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
        const now = audio.currentTime;
        const notes =
          kind === "goal"
            ? [330, 440, 660, 880]
            : kind === "whistle"
              ? [960, 1180]
              : kind === "tackle"
                ? [110]
                : [150];
        notes.forEach((frequency, index) => {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type =
            kind === "goal"
              ? "triangle"
              : kind === "whistle"
                ? "sine"
                : "square";
          oscillator.frequency.setValueAtTime(frequency, now + index * 0.08);
          gain.gain.setValueAtTime(0.0001, now + index * 0.08);
          gain.gain.exponentialRampToValueAtTime(
            kind === "goal" ? 0.055 : 0.025,
            now + index * 0.08 + 0.012,
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + index * 0.08 + (kind === "goal" ? 0.23 : 0.1),
          );
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start(now + index * 0.08);
          oscillator.stop(now + index * 0.08 + 0.28);
        });
      } catch {
        // Audio is an enhancement; gameplay continues if the browser blocks it.
      }
    },
    [],
  );

  const setGameScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  const startMatch = useCallback(() => {
    const matchHome = TEAMS[homeIndex];
    const validOpponentPool = competitionPoolFor(
      matchHome,
      competitionMode,
      cupScope,
      selectedLeagueId,
    ).filter((team) => team.id !== matchHome.id);
    const matchAway =
      validOpponentPool.find((team) => team.id === TEAMS[awayIndex]?.id) ??
      validOpponentPool[0];
    if (!matchAway) return;
    const safeAwayIndex = TEAMS.findIndex((team) => team.id === matchAway.id);
    if (safeAwayIndex !== awayIndex) setAwayIndex(safeAwayIndex);
    const next = createMatch(
      matchHome,
      matchAway,
      difficulty,
      false,
      gameMode,
      homeFormation,
      awayFormation,
      homeTactic,
      awayTactic,
      activeCareerSquad,
    );
    const selected = getPlayer(next, next.selectedId);
    const selectedAway = getPlayer(next, next.selectedAwayId);
    engineRef.current = next;
    resultRecordedRef.current = false;
    inputRef.current.keys.clear();
    inputRef.current.touchX = 0;
    inputRef.current.touchY = 0;
    inputRef.current.touchSprint = false;
    setKnob({ x: 0, y: 0 });
    setHud({
      homeScore: 0,
      awayScore: 0,
      remaining: HALF_SECONDS,
      half: 1,
      playerName: selected?.name ?? matchHome.name,
      playerNumber: selected?.number ?? 10,
      stamina: 100,
      shotCharge: 0,
      message: "APITO INICIAL",
      fps: 60,
      setPieceKind: null,
      setPieceReady: false,
      setPieceSide: null,
      homeCards: 0,
      awayCards: 0,
      awayPlayerName: selectedAway?.name ?? matchAway.name,
      awayPlayerNumber: selectedAway?.number ?? 10,
      awayStamina: 100,
      awayShotCharge: 0,
      playerOverall: selected?.overall ?? matchHome.rating,
      awayPlayerOverall: selectedAway?.overall ?? matchAway.rating,
      gameMode,
    });
    setPaused(false);
    setGameScreen("playing");
    playTone("whistle");
  }, [
    activeCareerSquad,
    awayFormation,
    awayIndex,
    awayTactic,
    competitionMode,
    cupScope,
    difficulty,
    gameMode,
    homeFormation,
    homeIndex,
    homeTactic,
    playTone,
    selectedLeagueId,
    setGameScreen,
  ]);

  const goToMenu = useCallback(() => {
    const demo = createMatch(
      TEAMS[homeIndex],
      TEAMS[awayIndex],
      difficulty,
      true,
      gameMode,
      homeFormation,
      awayFormation,
      homeTactic,
      awayTactic,
      activeCareerSquad,
    );
    engineRef.current = demo;
    inputRef.current.keys.clear();
    inputRef.current.touchX = 0;
    inputRef.current.touchY = 0;
    inputRef.current.touchSprint = false;
    setKnob({ x: 0, y: 0 });
    setPaused(false);
    setSettingsOpen(false);
    setGameScreen("menu");
  }, [
    activeCareerSquad,
    awayFormation,
    awayIndex,
    awayTactic,
    difficulty,
    gameMode,
    homeFormation,
    homeIndex,
    homeTactic,
    setGameScreen,
  ]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engineRef.current = createMatch(
      homeTeam,
      awayTeam,
      difficulty,
      true,
      gameMode,
      homeFormation,
      awayFormation,
      homeTactic,
      awayTactic,
      activeCareerSquad,
    );
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    let view: View = { width: 1280, height: 720, dpr: 1 };
    let animationFrame = 0;
    let previous = performance.now();
    let hudTimer = 0;
    let fpsTimer = 0;
    let frames = 0;
    let measuredFps = 60;
    let previousHomeScore = 0;
    let previousAwayScore = 0;
    let previousHalf: 1 | 2 = 1;
    let previousSetPiece: SetPieceKind | null = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const maxDpr =
        qualityRef.current === "performance"
          ? 1
          : qualityRef.current === "balanced"
            ? 1.45
            : 1.85;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const width = Math.max(320, rect.width);
      const height = Math.max(180, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      view = { width, height, dpr };
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const updateHud = (state: MatchState) => {
      const selected = getPlayer(state, state.selectedId);
      const selectedAway = getPlayer(state, state.selectedAwayId);
      setHud({
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        remaining: state.remaining,
        half: state.half,
        playerName: selected?.name ?? state.homeTeam.short,
        playerNumber: selected?.number ?? 10,
        stamina: selected?.stamina ?? 100,
        shotCharge: state.shotCharge,
        message: state.message,
        fps: measuredFps,
        setPieceKind: state.setPiece?.kind ?? null,
        setPieceReady: state.setPiece?.ready ?? false,
        setPieceSide: state.setPiece?.side ?? null,
        homeCards: state.stats.homeCards,
        awayCards: state.stats.awayCards,
        awayPlayerName: selectedAway?.name ?? state.awayTeam.short,
        awayPlayerNumber: selectedAway?.number ?? 10,
        awayStamina: selectedAway?.stamina ?? 100,
        awayShotCharge: state.awayShotCharge,
        playerOverall: selected?.overall ?? state.homeTeam.rating,
        awayPlayerOverall: selectedAway?.overall ?? state.awayTeam.rating,
        gameMode: state.gameMode,
      });
    };

    const loop = (now: number) => {
      const state = engineRef.current;
      const dt = Math.min(0.034, Math.max(0.001, (now - previous) / 1000));
      previous = now;
      resize();
      if (state) {
        const demo = screenRef.current === "menu";
        if (demo || screenRef.current === "playing") {
          updateMatch(state, inputRef.current, dt * (demo ? 0.62 : 1), demo);
        } else {
          updateParticles(state, dt);
        }

        if (
          state.homeScore !== previousHomeScore ||
          state.awayScore !== previousAwayScore
        ) {
          if (screenRef.current === "playing") playTone("goal");
          previousHomeScore = state.homeScore;
          previousAwayScore = state.awayScore;
        }

        if (state.half !== previousHalf) {
          if (screenRef.current === "playing") playTone("whistle");
          previousHalf = state.half;
        }

        const currentSetPiece = state.setPiece?.kind ?? null;
        if (
          currentSetPiece &&
          previousSetPiece === null &&
          screenRef.current === "playing"
        ) {
          playTone("whistle");
        }
        previousSetPiece = currentSetPiece;

        if (state.finished && screenRef.current === "playing") {
          setFinalStats({ ...state.stats });
          setGameScreen("finished");
          playTone("whistle");
        }

        context.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
        drawScene(context, view, state, qualityRef.current);
        hudTimer += dt;
        fpsTimer += dt;
        frames += 1;
        if (fpsTimer >= 0.75) {
          measuredFps = Math.round(frames / fpsTimer);
          frames = 0;
          fpsTimer = 0;
        }
        if (hudTimer >= 0.09) {
          updateHud(state);
          hudTimer = 0;
        }
      }
      animationFrame = requestAnimationFrame(loop);
    };

    actionsRef.current = {
      pass: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) {
          if (state.setPiece.side === side && state.setPiece.ready) {
            executeSetPiece(state, "pass");
            playTone("kick");
          }
          return;
        }
        passBall(state, side);
        playTone("kick");
      },
      shootStart: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) {
          if (
            state.setPiece.side === side &&
            state.setPiece.ready &&
            state.setPiece.kind !== "throwIn" &&
            state.setPiece.kind !== "goalKick" &&
            state.setPiece.kind !== "offside"
          ) {
            if (side === "home") state.chargingShot = true;
            else state.chargingAwayShot = true;
          }
          return;
        }
        const owner = getPlayer(state, state.ball.owner);
        if (
          owner?.id === selectedIdForSide(state, side) &&
          owner.side === side
        ) {
          if (side === "home") state.chargingShot = true;
          else state.chargingAwayShot = true;
        }
      },
      shootRelease: (side = "home") => {
        const state = engineRef.current;
        const charging =
          side === "home" ? state?.chargingShot : state?.chargingAwayShot;
        if (!state || !charging) return;
        if (state.setPiece?.side === side && state.setPiece.ready) {
          executeSetPiece(state, "shot");
        } else {
          releaseShot(state, side);
        }
        playTone("kick");
      },
      steal: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) return;
        stealBall(state, side);
        playTone("tackle");
      },
      switchPlayer: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) return;
        switchToClosestPlayer(state, side);
      },
      slide: (side = "home") => {
        const state = engineRef.current;
        if (!state || state.paused || screenRef.current !== "playing") return;
        if (state.setPiece) return;
        slideTackle(state, side);
        playTone("tackle");
      },
      togglePause: () => {
        const state = engineRef.current;
        if (!state || screenRef.current !== "playing") return;
        state.paused = !state.paused;
        setPaused(state.paused);
      },
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (screenRef.current !== "playing") return;
      const blocked = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
      ];
      if (blocked.includes(event.code)) event.preventDefault();
      inputRef.current.keys.add(event.code);
      if (event.repeat) return;
      const localTwoPlayer = engineRef.current?.gameMode === "local2p";
      if (localTwoPlayer) {
        if (event.code === "KeyF") actionsRef.current.pass("home");
        if (event.code === "Space") actionsRef.current.shootStart("home");
        if (event.code === "KeyE") actionsRef.current.steal("home");
        if (event.code === "KeyQ") actionsRef.current.switchPlayer("home");
        if (event.code === "KeyR") actionsRef.current.slide("home");
        if (event.code === "KeyK") actionsRef.current.pass("away");
        if (event.code === "KeyL") actionsRef.current.shootStart("away");
        if (event.code === "KeyJ") actionsRef.current.steal("away");
        if (event.code === "KeyI") actionsRef.current.switchPlayer("away");
        if (event.code === "KeyU") actionsRef.current.slide("away");
      } else {
        if (event.code === "KeyF" || event.code === "KeyX") {
          actionsRef.current.pass("home");
        }
        if (event.code === "Space" || event.code === "KeyC") {
          actionsRef.current.shootStart("home");
        }
        if (event.code === "KeyE" || event.code === "KeyZ") {
          actionsRef.current.steal("home");
        }
        if (event.code === "KeyQ") {
          actionsRef.current.switchPlayer("home");
        }
        if (event.code === "KeyR" || event.code === "KeyV") {
          actionsRef.current.slide("home");
        }
      }
      if (event.code === "KeyP" || event.code === "Escape") {
        actionsRef.current.togglePause();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      inputRef.current.keys.delete(event.code);
      const localTwoPlayer = engineRef.current?.gameMode === "local2p";
      if (localTwoPlayer) {
        if (event.code === "Space") actionsRef.current.shootRelease("home");
        if (event.code === "KeyL") actionsRef.current.shootRelease("away");
      } else if (event.code === "KeyC" || event.code === "Space") {
        actionsRef.current.shootRelease("home");
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    animationFrame = requestAnimationFrame(loop);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    activeCareerSquad,
    awayFormation,
    awayTactic,
    difficulty,
    homeFormation,
    homeTactic,
    homeTeam,
    awayTeam,
    gameMode,
    playTone,
    setGameScreen,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.imageRendering = quality === "performance" ? "auto" : "auto";
  }, [quality]);

  const selectCompetition = (mode: CompetitionMode) => {
    setCompetitionMode(mode);
    if (mode === "league" || mode === "career") {
      const homeLeagueIsPlayable =
        leagueTeamsFor(homeTeam.leagueId).length >= 2;
      const selectedLeagueIsPlayable =
        leagueTeamsFor(selectedLeagueId).length >= 2;
      const leagueId = homeLeagueIsPlayable
        ? homeTeam.leagueId
        : selectedLeagueIsPlayable
          ? selectedLeagueId
          : (LEAGUES.find((league) => leagueTeamsFor(league.id).length >= 2)
              ?.id ?? "brasileirao");
      const leagueTeams = leagueTeamsFor(leagueId);
      const nextHome = leagueTeams.some((team) => team.id === homeTeam.id)
        ? homeTeam
        : leagueTeams[0];
      const opponent = leagueTeams.find((team) => team.id !== nextHome?.id);
      if (!nextHome || !opponent) return;
      setSelectedLeagueId(leagueId);
      setLeagueRows(createLeagueRows(leagueId));
      setHomeIndex(TEAMS.findIndex((team) => team.id === nextHome.id));
      setAwayIndex(TEAMS.findIndex((team) => team.id === opponent.id));
      if (mode === "career" && career.clubId !== nextHome.id) {
        setCareer(createCareer(nextHome));
      }
      return;
    }
    if (mode === "cup") {
      const opponent = competitionPoolFor(homeTeam, mode, cupScope).find(
        (team) => team.id !== homeTeam.id,
      );
      const opponentIndex = TEAMS.findIndex((team) => team.id === opponent?.id);
      if (opponentIndex >= 0) setAwayIndex(opponentIndex);
    }
  };

  const selectLeague = (leagueId: LeagueId) => {
    const leagueTeams = leagueTeamsFor(leagueId);
    if (leagueTeams.length < 2) return;
    const nextHome = leagueTeams.some((team) => team.id === homeTeam.id)
      ? homeTeam
      : leagueTeams[0];
    const opponent = leagueTeams.find((team) => team.id !== nextHome.id);
    if (!opponent) return;
    setSelectedLeagueId(leagueId);
    setLeagueRows(createLeagueRows(leagueId));
    setHomeIndex(TEAMS.findIndex((team) => team.id === nextHome.id));
    setAwayIndex(TEAMS.findIndex((team) => team.id === opponent.id));
    setCupRound(0);
    setCupEliminated(false);
    if (competitionMode === "career" && career.clubId !== nextHome.id) {
      setCareer(createCareer(nextHome));
    }
  };

  const resetCup = () => {
    setCupRound(0);
    setCupEliminated(false);
  };

  const selectCupScope = (scope: CupScope) => {
    setCupScope(scope);
    resetCup();
    const opponent = competitionPoolFor(homeTeam, "cup", scope).find(
      (team) => team.id !== homeTeam.id,
    );
    const opponentIndex = TEAMS.findIndex((team) => team.id === opponent?.id);
    if (opponentIndex >= 0) setAwayIndex(opponentIndex);
  };

  const buyPlayer = (entry: MarketEntry) => {
    setCareer((current) => completePurchase(current, entry));
  };

  const sellPlayer = (player: SquadSeed) => {
    setCareer((current) => completeSale(current, player));
  };

  const selectHomeTeam = (next: number) => {
    if (!TEAMS[next] || next === homeIndex) return;
    const nextTeam = TEAMS[next];
    const championshipMode =
      competitionMode === "league" || competitionMode === "career";
    if (championshipMode && nextTeam.leagueId !== selectedLeagueId) return;
    setHomeIndex(next);
    setCupRound(0);
    setCupEliminated(false);
    if (competitionMode === "career") setCareer(createCareer(nextTeam));
    const pool = competitionPoolFor(
      nextTeam,
      competitionMode,
      cupScope,
      selectedLeagueId,
    );
    const currentOpponentIsValid = pool.some(
      (team) => team.id === awayTeam.id && team.id !== nextTeam.id,
    );
    if (currentOpponentIsValid) return;
    const opponent = pool.find((team) => team.id !== nextTeam.id);
    const opponentIndex = TEAMS.findIndex((team) => team.id === opponent?.id);
    if (opponentIndex >= 0) setAwayIndex(opponentIndex);
  };

  const cycleHome = (direction: number) => {
    const championshipMode =
      competitionMode === "league" || competitionMode === "career";
    const pool = championshipMode
      ? leagueTeamsFor(selectedLeagueId)
      : TEAMS;
    const currentPoolIndex = pool.findIndex((team) => team.id === homeTeam.id);
    const nextPoolIndex =
      (Math.max(0, currentPoolIndex) + direction + pool.length) % pool.length;
    const next = TEAMS.findIndex((team) => team.id === pool[nextPoolIndex]?.id);
    if (next >= 0) selectHomeTeam(next);
  };

  const selectAwayTeam = (next: number) => {
    const nextTeam = TEAMS[next];
    if (
      !nextTeam ||
      nextTeam.id === homeTeam.id ||
      !availableAwayTeams.some((team) => team.id === nextTeam.id)
    ) {
      return;
    }
    setAwayIndex(next);
  };

  const cycleAway = (direction: number) => {
    const currentPoolIndex = availableAwayTeams.findIndex(
      (team) => team.id === TEAMS[awayIndex].id,
    );
    const nextPoolIndex =
      (Math.max(0, currentPoolIndex) + direction + availableAwayTeams.length) %
      availableAwayTeams.length;
    const nextIndex = TEAMS.findIndex(
      (team) => team.id === availableAwayTeams[nextPoolIndex]?.id,
    );
    if (nextIndex >= 0) selectAwayTeam(nextIndex);
  };

  const handleJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    let x =
      (event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.36);
    let y =
      (event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.36);
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    inputRef.current.touchX = x;
    inputRef.current.touchY = y;
    setKnob({ x, y });
  };

  const stopJoystick = () => {
    inputRef.current.touchX = 0;
    inputRef.current.touchY = 0;
    setKnob({ x: 0, y: 0 });
  };

  const toggleSettings = (open: boolean) => {
    const state = engineRef.current;
    if (open && state && screenRef.current === "playing") state.paused = true;
    if (!open && state && screenRef.current === "playing" && !paused) {
      state.paused = false;
    }
    setSettingsOpen(open);
  };

  const resume = () => {
    const state = engineRef.current;
    if (state) state.paused = false;
    setPaused(false);
  };

  const restart = () => {
    startMatch();
  };

  const possessionTotal =
    finalStats.homePossession + finalStats.awayPossession || 1;
  const homePossession = Math.round(
    (finalStats.homePossession / possessionTotal) * 100,
  );
  const awayPossession = 100 - homePossession;

  return (
    <main
      ref={rootRef}
      className={"football-shell quality-" + quality}
      aria-label="Stadler Football 3D"
    >
      <section className="game-stage">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="Campo de futebol com partida em andamento"
        >
          Seu navegador precisa oferecer suporte a Canvas para rodar o jogo.
        </canvas>

        <div className="game-grain" aria-hidden="true" />

        <header className="game-brand">
          <span className="brand-mark">S</span>
          <span>
            <strong>STADLER</strong>
            <small>FOOTBALL 3D</small>
          </span>
        </header>

        {screen === "playing" && (
          <>
            <div className="scoreboard" aria-label="Placar da partida">
              <div className="score-team">
                <TeamBadge team={homeTeam} compact />
                <span>{homeTeam.short}</span>
                {hud.homeCards > 0 && (
                  <small className="card-total">
                    <i />
                    {hud.homeCards}
                  </small>
                )}
              </div>
              <strong>{hud.homeScore}</strong>
              <div className="match-clock">
                <span>{hud.half}º TEMPO</span>
                <b>{formatTime(hud.remaining)}</b>
              </div>
              <strong>{hud.awayScore}</strong>
              <div className="score-team score-team--away">
                {hud.awayCards > 0 && (
                  <small className="card-total">
                    <i />
                    {hud.awayCards}
                  </small>
                )}
                <span>{awayTeam.short}</span>
                <TeamBadge team={awayTeam} compact />
              </div>
            </div>

            {hud.setPieceKind && (
              <div
                className="set-piece-hud"
                data-ready={hud.setPieceReady}
                role="status"
              >
                <span>{setPieceName(hud.setPieceKind)}</span>
                <strong>{setPieceInstruction(hud)}</strong>
              </div>
            )}

            <div className="match-tools">
              <span className="fps-pill">
                <i />
                {hud.fps} FPS
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => actionsRef.current.togglePause()}
                aria-label="Pausar partida"
              >
                <Pause size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => toggleSettings(true)}
                aria-label="Abrir configurações"
              >
                <Settings size={17} />
              </button>
              <button
                type="button"
                className="icon-button desktop-only"
                onClick={() => void rootRef.current?.requestFullscreen()}
                aria-label="Tela cheia"
              >
                <Maximize2 size={17} />
              </button>
            </div>

            <div className="player-hud player-hud--home">
              <TeamBadge team={homeTeam} compact />
              <div
                className="player-number"
                style={{
                  background: homeTeam.primary,
                  color: homeTeam.primary === "#ffd60a" ? "#111619" : "#fff",
                }}
              >
                {hud.playerNumber}
              </div>
              <div className="player-info">
                <strong>{hud.playerName}</strong>
                <span>JOGADOR 1 • OVR {hud.playerOverall}</span>
                <div className="stamina-track">
                  <i
                    style={{
                      width: hud.stamina + "%",
                      background:
                        "linear-gradient(90deg, " +
                        homeTeam.primary +
                        ", #65ff8f)",
                    }}
                  />
                </div>
              </div>
            </div>

            {hud.gameMode === "local2p" && (
              <div className="player-hud player-hud--away">
                <TeamBadge team={awayTeam} compact />
                <div
                  className="player-number"
                  style={{
                    background: awayTeam.primary,
                    color: awayTeam.primary === "#ffd60a" ? "#111619" : "#fff",
                  }}
                >
                  {hud.awayPlayerNumber}
                </div>
                <div className="player-info">
                  <strong>{hud.awayPlayerName}</strong>
                  <span>JOGADOR 2 • OVR {hud.awayPlayerOverall}</span>
                  <div className="stamina-track">
                    <i
                      style={{
                        width: hud.awayStamina + "%",
                        background:
                          "linear-gradient(90deg, " +
                          awayTeam.primary +
                          ", #65ff8f)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div
              className={
                "shot-meter" +
                (hud.gameMode === "local2p" ? " shot-meter--p1" : "")
              }
              data-visible={hud.shotCharge > 0}
            >
              <span>J1 • FORÇA DO CHUTE</span>
              <div>
                <i style={{ width: hud.shotCharge * 100 + "%" }} />
              </div>
            </div>

            {hud.gameMode === "local2p" && (
              <div
                className="shot-meter shot-meter--p2"
                data-visible={hud.awayShotCharge > 0}
              >
                <span>J2 • FORÇA DO CHUTE</span>
                <div>
                  <i style={{ width: hud.awayShotCharge * 100 + "%" }} />
                </div>
              </div>
            )}

            {hud.gameMode === "local2p" ? (
              <button
                type="button"
                className="controls-corner-hint"
                onClick={() => actionsRef.current.togglePause()}
                aria-label="Pausar e ver controles dos dois jogadores"
              >
                <kbd>P</kbd> controles
              </button>
            ) : (
              <div className="keyboard-guide">
                <span>
                  <kbd>WASD</kbd> mover
                </span>
                <span>
                  <kbd>SHIFT</kbd> correr
                </span>
                <span>
                  <kbd>F</kbd> passe
                </span>
                <span>
                  <kbd>ESPAÇO</kbd> chute
                </span>
                <span>
                  <kbd>E</kbd> bote/roubar
                </span>
                <span>
                  <kbd>Q</kbd> trocar
                </span>
                <span>
                  <kbd>R</kbd> carrinho
                </span>
              </div>
            )}

            <div className="touch-controls" aria-label="Controles de toque">
              <div
                className="joystick"
                role="presentation"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  handleJoystick(event);
                }}
                onPointerMove={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    handleJoystick(event);
                  }
                }}
                onPointerUp={stopJoystick}
                onPointerCancel={stopJoystick}
              >
                <i
                  style={{
                    transform:
                      "translate(" + knob.x * 32 + "px, " + knob.y * 32 + "px)",
                  }}
                />
              </div>
              <button
                type="button"
                className="touch-sprint"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  inputRef.current.touchSprint = true;
                }}
                onPointerUp={() => {
                  inputRef.current.touchSprint = false;
                }}
                onPointerCancel={() => {
                  inputRef.current.touchSprint = false;
                }}
                aria-label="Correr"
              >
                <Zap size={18} />
                <small>correr</small>
              </button>
              <div className="touch-actions">
                <button
                  type="button"
                  className="touch-button touch-button--tackle"
                  onPointerDown={() => actionsRef.current.steal()}
                  aria-label="Dar o bote e roubar a bola"
                >
                  ROU
                  <small>roubar</small>
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--switch"
                  onPointerDown={() => actionsRef.current.switchPlayer()}
                  aria-label="Trocar jogador selecionado"
                >
                  TRO
                  <small>trocar</small>
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--slide"
                  onPointerDown={() => actionsRef.current.slide()}
                  aria-label="Dar carrinho"
                >
                  CAR
                  <small>carrinho</small>
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--pass"
                  onPointerDown={() => actionsRef.current.pass()}
                  aria-label="Passar a bola"
                >
                  PAS
                  <small>passe</small>
                </button>
                <button
                  type="button"
                  className="touch-button touch-button--shoot"
                  onPointerDown={() => actionsRef.current.shootStart()}
                  onPointerUp={() => actionsRef.current.shootRelease()}
                  onPointerCancel={() => actionsRef.current.shootRelease()}
                  aria-label="Chutar a bola"
                >
                  CHU
                  <small>chute</small>
                </button>
              </div>
            </div>
          </>
        )}

        {hud.message && screen === "playing" && (
          <div className="match-message" role="status">
            {hud.message}
          </div>
        )}

        {screen === "menu" && (
          <div className="menu-screen">
            <div className="menu-panel">
              <div className="eyebrow">
                <span>
                  <i /> ORIGINAL
                </span>
                <span>FÍSICA PRO</span>
                <span>SIMULAÇÃO PRO</span>
              </div>
              <h1>
                <em>STADLER</em>
                FOOTBALL 3D
              </h1>
              <p>
                Escolha os clubes, compare o OVR dos titulares, defina a tática
                e entre em campo no futebol 8×8.
              </p>

              <nav
                className="competition-tabs"
                aria-label="Modos de competição"
              >
                <button
                  type="button"
                  data-active={competitionMode === "friendly"}
                  onClick={() => selectCompetition("friendly")}
                >
                  <Target />
                  <span>
                    <b>Amistoso</b>
                    <small>Partida rápida</small>
                  </span>
                </button>
                <button
                  type="button"
                  data-active={competitionMode === "league"}
                  onClick={() => selectCompetition("league")}
                >
                  <BarChart3 />
                  <span>
                    <b>Liga</b>
                    <small>Pontos corridos</small>
                  </span>
                </button>
                <button
                  type="button"
                  data-active={competitionMode === "cup"}
                  onClick={() => selectCompetition("cup")}
                >
                  <Crown />
                  <span>
                    <b>Copa</b>
                    <small>Mata-mata</small>
                  </span>
                </button>
                <button
                  type="button"
                  data-active={competitionMode === "career"}
                  onClick={() => selectCompetition("career")}
                >
                  <BriefcaseBusiness />
                  <span>
                    <b>Carreira</b>
                    <small>Clube e mercado</small>
                  </span>
                </button>
              </nav>

              {(competitionMode === "league" ||
                competitionMode === "career") && (
                <section
                  className="league-selector"
                  aria-label="Selecionar liga do campeonato"
                >
                  <div className="league-selector__heading">
                    <span>
                      <Landmark /> Escolha a liga
                    </span>
                    <small>
                      Matchmaking bloqueado em {selectedLeague.country}
                    </small>
                  </div>
                  <div className="league-selector__grid">
                    {LEAGUES.map((league) => {
                      const clubs = leagueTeamsFor(league.id);
                      const playable = clubs.length >= 2;
                      return (
                        <button
                          type="button"
                          key={league.id}
                          disabled={!playable}
                          data-active={selectedLeagueId === league.id}
                          style={{ "--league-accent": league.accent } as CSSProperties}
                          onClick={() => selectLeague(league.id)}
                        >
                          <b>{league.flag}</b>
                          <span>
                            <strong>{league.name}</strong>
                            <small>
                              {playable
                                ? `${clubs.length} clubes disponíveis`
                                : "Aguardando mais clubes"}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <div className="matchup-selector">
                <div className="team-choice">
                  <button
                    type="button"
                    onClick={() => cycleHome(-1)}
                    aria-label="Time anterior"
                  >
                    <ChevronLeft />
                  </button>
                  <TeamFlag team={homeTeam} />
                  <button
                    type="button"
                    className="team-choice__details"
                    onClick={() => {
                      setTeamRegionFilter("all");
                      setTeamPickerSide("home");
                    }}
                    aria-label="Abrir seleção do seu time"
                  >
                    <small>SEU TIME</small>
                    <strong>{homeTeam.name}</strong>
                    <span>
                      {homeTeam.flag} {homeTeam.city} • escolher clube
                    </span>
                    <b className="team-choice__overall">OVR {homeOverall}</b>
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleHome(1)}
                    aria-label="Próximo time"
                  >
                    <ChevronRight />
                  </button>
                </div>
                <div className="versus">VS</div>
                <div className="team-choice team-choice--away">
                  <button
                    type="button"
                    onClick={() => cycleAway(-1)}
                    aria-label="Adversário anterior"
                  >
                    <ChevronLeft />
                  </button>
                  <TeamFlag team={awayTeam} />
                  <button
                    type="button"
                    className="team-choice__details"
                    onClick={() => {
                      setTeamRegionFilter("all");
                      setTeamPickerSide("away");
                    }}
                    aria-label="Abrir seleção do adversário"
                  >
                    <small>
                      {gameMode === "local2p" ? "JOGADOR 2" : "ADVERSÁRIO"}
                    </small>
                    <strong>{awayTeam.name}</strong>
                    <span>
                      {awayTeam.flag} {awayTeam.city} • escolher clube
                    </span>
                    <b className="team-choice__overall">OVR {awayOverall}</b>
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleAway(1)}
                    aria-label="Próximo adversário"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </div>

              {competitionMode === "league" && (
                <section className="mode-dashboard league-dashboard">
                  <div className="mode-dashboard__heading">
                    <span>
                      <Landmark /> {leagueNameFor(selectedLeagueId)}
                    </span>
                    <small>
                      {standings.length} clubes • {standings[0]?.played ?? 0}{" "}
                      rodada(s)
                    </small>
                  </div>
                  <Table
                    className="league-table"
                    aria-label="Classificação completa da liga"
                  >
                    <TableHeader>
                      <TableRow>
                        <TableHead aria-label="Posição">#</TableHead>
                        <TableHead>Clube</TableHead>
                        <TableHead>OVR</TableHead>
                        <TableHead>J</TableHead>
                        <TableHead>V</TableHead>
                        <TableHead>E</TableHead>
                        <TableHead>D</TableHead>
                        <TableHead>GP</TableHead>
                        <TableHead>GC</TableHead>
                        <TableHead>SG</TableHead>
                        <TableHead>PTS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((row, index) => {
                        const team = TEAMS.find(
                          (candidate) => candidate.id === row.teamId,
                        );
                        const goalDifference = row.goalsFor - row.goalsAgainst;
                        return (
                          <TableRow
                            key={row.teamId}
                            data-user={row.teamId === homeTeam.id}
                          >
                            <TableCell className="league-position">
                              {index + 1}
                            </TableCell>
                            <TableCell className="league-club">
                              <TeamBadge team={team ?? homeTeam} compact />
                              <span>{team?.name ?? row.teamId}</span>
                            </TableCell>
                            <TableCell>
                              {team ? lineupOverall(team) : "—"}
                            </TableCell>
                            <TableCell>{row.played}</TableCell>
                            <TableCell>{row.wins}</TableCell>
                            <TableCell>{row.draws}</TableCell>
                            <TableCell>{row.losses}</TableCell>
                            <TableCell>{row.goalsFor}</TableCell>
                            <TableCell>{row.goalsAgainst}</TableCell>
                            <TableCell>
                              {goalDifference > 0 ? "+" : ""}
                              {goalDifference}
                            </TableCell>
                            <TableCell className="league-points">
                              {row.points}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </section>
              )}

              {competitionMode === "cup" && (
                <section className="mode-dashboard cup-dashboard">
                  <div className="mode-dashboard__heading">
                    <span>
                      <Trophy /> {cupNameFor(homeTeam, cupScope)}
                    </span>
                    <small>
                      {cupEliminated
                        ? "Eliminado"
                        : cupRound === 3
                          ? "Campeão"
                          : "Em disputa"}
                    </small>
                  </div>
                  <div className="cup-switch" aria-label="Tipo de copa">
                    <button
                      type="button"
                      data-active={cupScope === "continental"}
                      onClick={() => selectCupScope("continental")}
                    >
                      Continental
                    </button>
                    <button
                      type="button"
                      data-active={cupScope === "world"}
                      onClick={() => selectCupScope("world")}
                    >
                      Mundial
                    </button>
                  </div>
                  <div className="cup-path">
                    {["Quartas", "Semifinal", "Final", "Taça"].map(
                      (round, index) => (
                        <span
                          key={round}
                          data-complete={index < cupRound}
                          data-current={!cupEliminated && index === cupRound}
                        >
                          {index === 3 ? <Trophy /> : index + 1}
                          <small>{round}</small>
                        </span>
                      ),
                    )}
                  </div>
                  {(cupEliminated || cupRound === 3) && (
                    <button
                      type="button"
                      className="inline-action"
                      onClick={resetCup}
                    >
                      <RotateCcw /> Nova campanha
                    </button>
                  )}
                </section>
              )}

              {competitionMode === "career" && (
                <section className="mode-dashboard career-dashboard">
                  <div className="career-metric">
                    <WalletCards />
                    <span>
                      <small>ORÇAMENTO</small>
                      <b>€ {career.budget} mi</b>
                    </span>
                  </div>
                  <div className="career-metric">
                    <Users />
                    <span>
                      <small>TORCIDA</small>
                      <b>{career.fans.toLocaleString("pt-BR")}</b>
                    </span>
                  </div>
                  <div className="career-metric">
                    <Shield />
                    <span>
                      <small>ELENCO</small>
                      <b>{career.squad.length} atletas</b>
                    </span>
                  </div>
                  <div className="career-metric">
                    <Gauge />
                    <span>
                      <small>TIME TITULAR</small>
                      <b>OVR {careerOverall}</b>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="market-button"
                    onClick={() => setMarketOpen(true)}
                  >
                    <ShoppingCart /> Mercado
                  </button>
                </section>
              )}

              <section
                className="tactics-config"
                aria-label="Configuração tática"
              >
                <div>
                  <strong>
                    {gameMode === "local2p" ? "PLANO J1" : "SEU PLANO"}
                  </strong>
                  <label>
                    <span>Formação 8×8</span>
                    <select
                      value={homeFormation}
                      onChange={(event) =>
                        setHomeFormation(event.target.value as FormationId)
                      }
                    >
                      {Object.values(FORMATIONS).map((formation) => (
                        <option value={formation.id} key={formation.id}>
                          {formation.label} · {formation.description}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Postura</span>
                    <select
                      value={homeTactic}
                      onChange={(event) =>
                        setHomeTactic(event.target.value as TacticId)
                      }
                    >
                      {Object.values(TACTICS).map((tactic) => (
                        <option value={tactic.id} key={tactic.id}>
                          {tactic.label} · {tactic.description}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <strong>
                    {gameMode === "local2p" ? "PLANO J2" : "PLANO RIVAL"}
                  </strong>
                  <label>
                    <span>Formação 8×8</span>
                    <select
                      value={awayFormation}
                      onChange={(event) =>
                        setAwayFormation(event.target.value as FormationId)
                      }
                    >
                      {Object.values(FORMATIONS).map((formation) => (
                        <option value={formation.id} key={formation.id}>
                          {formation.label} · {formation.description}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Postura</span>
                    <select
                      value={awayTactic}
                      onChange={(event) =>
                        setAwayTactic(event.target.value as TacticId)
                      }
                    >
                      {Object.values(TACTICS).map((tactic) => (
                        <option value={tactic.id} key={tactic.id}>
                          {tactic.label} · {tactic.description}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <div className="difficulty-row mode-row">
                <span>MODO DE JOGO</span>
                <RadioGroup
                  value={gameMode}
                  onValueChange={(value) => setGameMode(value as GameMode)}
                  className="game-radio-group"
                  aria-label="Modo de jogo"
                >
                  <label className="game-radio-option">
                    <RadioGroupItem value="solo" />
                    <span>1 JOGADOR</span>
                  </label>
                  <label className="game-radio-option">
                    <RadioGroupItem value="local2p" />
                    <span>2 JOGADORES</span>
                  </label>
                </RadioGroup>
              </div>

              <div className="difficulty-row">
                <span>
                  {gameMode === "local2p" ? "NÍVEL DA IA" : "DIFICULDADE"}
                </span>
                <RadioGroup
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as Difficulty)}
                  className="game-radio-group"
                  aria-label="Dificuldade"
                >
                  {[
                    ["easy", "Fácil"],
                    ["normal", "Normal"],
                    ["hard", "Difícil"],
                  ].map(([value, label]) => (
                    <label className="game-radio-option" key={value}>
                      <RadioGroupItem value={value} />
                      <span>{label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="menu-actions">
                <button
                  type="button"
                  className="play-button"
                  onClick={startMatch}
                >
                  <Play fill="currentColor" size={21} />
                  JOGAR AGORA
                  <span>
                    {gameMode === "local2p" ? "2 jogadores • " : ""}
                    partida completa: 1min50
                  </span>
                </button>
                <button
                  type="button"
                  className="settings-button"
                  onClick={() => toggleSettings(true)}
                  aria-label="Configurações"
                >
                  <Settings size={20} />
                </button>
              </div>

              <div className="feature-strip">
                <span>
                  <Zap /> OVR comparado em cada duelo
                </span>
                <span>
                  <Shield /> Força pela média do elenco
                </span>
                <span>
                  <Gauge /> 2 tempos de 55 segundos
                </span>
              </div>
              <small className="original-note">
                Projeto independente, sem afiliação aos clubes. Escudos e
                marcas pertencem aos respectivos titulares; uniformes do motor
                reproduzem apenas cores e padrões esportivos, sem patrocinadores.
              </small>
            </div>

            <div className="menu-callout">
              <span>CRAQUE EM CAMPO</span>
              <strong>{featuredPlayer[0]}</strong>
              <div>
                <b>{featuredPlayer[2]}</b>
                <p>
                  Velocidade{" "}
                  <i style={{ width: featuredAttributes.pace + "%" }} />
                </p>
                <p>
                  Chute{" "}
                  <i style={{ width: featuredAttributes.shooting + "%" }} />
                </p>
                <p>
                  Passe{" "}
                  <i style={{ width: featuredAttributes.passing + "%" }} />
                </p>
              </div>
            </div>
          </div>
        )}

        {screen === "finished" && (
          <div className="finish-screen">
            <div className="finish-card">
              <Trophy className="finish-trophy" />
              <span>FIM DE JOGO</span>
              <h2>
                {competitionMode === "cup" && hud.homeScore === hud.awayScore
                  ? homePossession >= 50
                    ? "CLASSIFICADO NOS PÊNALTIS!"
                    : "ELIMINADO NOS PÊNALTIS"
                  : hud.homeScore === hud.awayScore
                    ? "EMPATE!"
                    : hud.gameMode === "local2p"
                      ? hud.homeScore > hud.awayScore
                        ? "JOGADOR 1 VENCEU!"
                        : "JOGADOR 2 VENCEU!"
                      : hud.homeScore > hud.awayScore
                        ? "VITÓRIA!"
                        : "QUASE LÁ!"}
              </h2>
              <div className="final-score">
                <div>
                  <TeamBadge team={homeTeam} />
                  <strong>{homeTeam.short}</strong>
                </div>
                <b>{hud.homeScore}</b>
                <em>—</em>
                <b>{hud.awayScore}</b>
                <div>
                  <TeamBadge team={awayTeam} />
                  <strong>{awayTeam.short}</strong>
                </div>
              </div>
              <div className="stats-table" aria-label="Estatísticas da partida">
                <div>
                  <b>{finalStats.homeShots}</b>
                  <span>Chutes</span>
                  <b>{finalStats.awayShots}</b>
                </div>
                <div>
                  <b>{finalStats.homePasses}</b>
                  <span>Passes</span>
                  <b>{finalStats.awayPasses}</b>
                </div>
                <div>
                  <b>{homePossession}%</b>
                  <span>Posse de bola</span>
                  <b>{awayPossession}%</b>
                </div>
                <div>
                  <b>{finalStats.homeFouls}</b>
                  <span>Faltas</span>
                  <b>{finalStats.awayFouls}</b>
                </div>
                <div>
                  <b>{finalStats.homeOffsides}</b>
                  <span>Impedimentos</span>
                  <b>{finalStats.awayOffsides}</b>
                </div>
                <div>
                  <b>{finalStats.homeCards}</b>
                  <span>Cartões</span>
                  <b>{finalStats.awayCards}</b>
                </div>
              </div>
              <div className="finish-actions">
                <button type="button" className="play-button" onClick={restart}>
                  <RotateCcw size={19} /> REVANCHE
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={goToMenu}
                >
                  MENU PRINCIPAL
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={teamPickerSide !== null}
        onOpenChange={(open) => {
          if (!open) setTeamPickerSide(null);
        }}
      >
        <DialogContent className="game-dialog team-picker-dialog">
          <DialogHeader>
            <DialogTitle>
              {teamPickerSide === "away"
                ? "Escolher adversário"
                : "Escolher seu clube"}
            </DialogTitle>
            <DialogDescription>
              Compare a média dos oito titulares. Quanto maior o OVR, mais
              forte o time será em campo.
            </DialogDescription>
          </DialogHeader>
          <div className="team-filter" aria-label="Filtrar clubes por região">
            {[
              ["all", "Todos"],
              ["brazil", "Brasileirão"],
              ["europe", "Europa"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                data-active={teamRegionFilter === value}
                onClick={() => setTeamRegionFilter(value as TeamRegionFilter)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="team-picker-summary">
            <span>{teamPickerOptions.length} clubes disponíveis</span>
            <small>OVR = média da escalação</small>
          </div>
          <div className="team-picker-grid">
            {teamPickerOptions.length === 0 && (
              <p className="team-picker-empty">
                Nenhum clube desta região participa do torneio selecionado.
              </p>
            )}
            {teamPickerOptions.map((team) => {
              const index = TEAMS.findIndex(
                (candidate) => candidate.id === team.id,
              );
              const selected =
                teamPickerSide === "away"
                  ? team.id === awayTeam.id
                  : team.id === homeTeam.id;
              const overall =
                team.id === homeTeam.id && teamPickerSide !== "away"
                  ? homeOverall
                  : team.id === awayTeam.id && teamPickerSide === "away"
                    ? awayOverall
                    : lineupOverall(
                        team,
                        teamPickerSide === "away"
                          ? awayFormation
                          : homeFormation,
                      );
              return (
                <button
                  type="button"
                  className="team-picker-card"
                  data-selected={selected}
                  key={team.id}
                  onClick={() => {
                    if (teamPickerSide === "away") selectAwayTeam(index);
                    else selectHomeTeam(index);
                    setTeamPickerSide(null);
                  }}
                  aria-label={`Selecionar ${team.name}, OVR ${overall}`}
                >
                  <TeamFlag team={team} />
                  <span>
                    <strong>{team.name}</strong>
                    <small>
                      {team.flag} {team.city}
                    </small>
                  </span>
                  <b>{overall}</b>
                </button>
              );
            })}
          </div>
          <p className="team-picker-hint">
            Velocidade, passe, finalização, domínio, desarme e goleiro usam o
            OVR de cada atleta e a força relativa do rival.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={toggleSettings}>
        <DialogContent className="game-dialog">
          <DialogHeader>
            <DialogTitle>Configurações do jogo</DialogTitle>
            <DialogDescription>
              Escolha o nível visual. O modo Ultra ativa a apresentação mais
              rica e imersiva do estádio.
            </DialogDescription>
          </DialogHeader>
          <div className="settings-section">
            <div className="settings-heading">
              <span>
                <Gauge size={18} />
                Qualidade gráfica
              </span>
              <small>Recomendado: ultra</small>
            </div>
            <RadioGroup
              value={quality}
              onValueChange={(value) => setQuality(value as Quality)}
              className="quality-options"
              aria-label="Qualidade gráfica"
            >
              <label>
                <RadioGroupItem value="performance" />
                <span>
                  <b>Desempenho</b>
                  <small>Mais FPS</small>
                </span>
              </label>
              <label>
                <RadioGroupItem value="balanced" />
                <span>
                  <b>Equilibrado</b>
                  <small>Boa imagem</small>
                </span>
              </label>
              <label>
                <RadioGroupItem value="ultra" />
                <span>
                  <b>Ultra</b>
                  <small>Mais detalhes</small>
                </span>
              </label>
            </RadioGroup>
          </div>
          <div className="setting-toggle">
            <span>
              {audioEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
              <span>
                <b>Efeitos sonoros</b>
                <small>Chutes, apito e gols</small>
              </span>
            </span>
            <Switch
              checked={audioEnabled}
              onCheckedChange={setAudioEnabled}
              aria-label="Ativar efeitos sonoros"
            />
          </div>
          <button
            type="button"
            className="dialog-done"
            onClick={() => toggleSettings(false)}
          >
            SALVAR E VOLTAR
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={marketOpen} onOpenChange={setMarketOpen}>
        <DialogContent className="game-dialog market-dialog">
          <DialogHeader>
            <DialogTitle>Mercado de transferências</DialogTitle>
            <DialogDescription>
              Toda negociação é aplicada imediatamente ao orçamento e à
              escalação. Os titulares são escolhidos por posição e OVR.
            </DialogDescription>
          </DialogHeader>
          <div className="market-summary">
            <span>
              <small>Saldo disponível</small>
              <b>€ {career.budget} mi</b>
            </span>
            <span>
              <small>Força titular</small>
              <b>OVR {careerOverall}</b>
            </span>
            <span>
              <small>Plantel</small>
              <b>{career.squad.length} atletas</b>
            </span>
          </div>
          <div className="market-columns">
            <section>
              <h3>
                <ShoppingCart /> Disponíveis
              </h3>
              <div className="transfer-list">
                {transferMarket.map((entry) => {
                  const price = marketPrice(entry.seed[2]);
                  return (
                    <div key={`${entry.team.id}-${entry.seed[0]}`}>
                      <TeamBadge team={entry.team} compact />
                      <span>
                        <b>{entry.seed[0]}</b>
                        <small>
                          {entry.seed[3]} • {entry.team.short}
                        </small>
                      </span>
                      <strong>OVR {entry.seed[2]}</strong>
                      <button
                        type="button"
                        disabled={career.budget < price}
                        onClick={() => buyPlayer(entry)}
                      >
                        €{price} mi
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
            <section>
              <h3>
                <Users /> Seu elenco
              </h3>
              <div className="transfer-list squad-list">
                {[...career.squad]
                  .sort((a, b) => b[2] - a[2])
                  .map((player) => (
                    <div key={squadPlayerKey(player)}>
                      <span className="squad-number">{player[1]}</span>
                      <span>
                        <b>{player[0]}</b>
                        <small>
                          {player[3] ?? "MF"} •{" "}
                          {careerStarterKeys.has(squadPlayerKey(player))
                            ? "Titular"
                            : "Reserva"}
                        </small>
                      </span>
                      <strong>OVR {player[2]}</strong>
                      <button
                        type="button"
                        disabled={career.squad.length <= 8}
                        onClick={() => sellPlayer(player)}
                      >
                        Vender
                      </button>
                    </div>
                  ))}
              </div>
            </section>
          </div>
          {career.transactions.length > 0 && (
            <div className="transfer-history" aria-label="Últimas operações">
              <strong>Últimas movimentações</strong>
              <div>
                {career.transactions.slice(0, 4).map((entry, index) => (
                  <span key={`${entry}-${index}`}>{entry}</span>
                ))}
              </div>
            </div>
          )}
          <small className="market-hint">
            A contratação já fica disponível na próxima partida da carreira.
          </small>
          <button
            type="button"
            className="dialog-done"
            onClick={() => setMarketOpen(false)}
          >
            CONFIRMAR ELENCO
          </button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paused && screen === "playing"}
        onOpenChange={(open) => {
          if (!open) resume();
        }}
      >
        <DialogContent className="game-dialog pause-dialog">
          <DialogHeader>
            <DialogTitle>Jogo pausado</DialogTitle>
            <DialogDescription>
              Respire, ajuste a estratégia e volte para a partida.
            </DialogDescription>
          </DialogHeader>
          <div className="pause-controls" aria-label="Controles da partida">
            <section>
              <strong>{gameMode === "local2p" ? "Jogador 1" : "Jogador"}</strong>
              <span><kbd>WASD</kbd> mover</span>
              <span><kbd>SHIFT</kbd> correr</span>
              <span><kbd>F</kbd> passe</span>
              <span><kbd>ESPAÇO</kbd> chute</span>
              <span><kbd>E</kbd> roubar</span>
              <span><kbd>Q</kbd> trocar</span>
              <span><kbd>R</kbd> carrinho</span>
            </section>
            {gameMode === "local2p" && (
              <section>
                <strong>Jogador 2</strong>
                <span><kbd>SETAS</kbd> mover</span>
                <span><kbd>ENTER</kbd> correr</span>
                <span><kbd>K</kbd> passe</span>
                <span><kbd>L</kbd> chute</span>
                <span><kbd>J</kbd> roubar</span>
                <span><kbd>I</kbd> trocar</span>
                <span><kbd>U</kbd> carrinho</span>
              </section>
            )}
          </div>
          <button type="button" className="play-button" onClick={resume}>
            <Play fill="currentColor" size={19} /> CONTINUAR
          </button>
          <button type="button" className="secondary-button" onClick={restart}>
            <RotateCcw size={18} /> REINICIAR PARTIDA
          </button>
          <button type="button" className="text-button" onClick={goToMenu}>
            VOLTAR AO MENU
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
