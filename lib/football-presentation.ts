import type { MatchState, Player, Side } from "./football-engine.ts";

export type Shootout = { home: number; away: number; kicks: { side: Side; player: string; scored: boolean }[] };
export type TitleCelebration = {
  winner: Side;
  captainId: number;
  time: number;
  duration: number;
  complete: boolean;
  origins: { id: number; x: number; y: number }[];
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };

// Each kick is resolved against the opposing keeper; possession never breaks a tie.
export function resolveShootout(state: MatchState, random: () => number): Shootout {
  const result: Shootout = { home: 0, away: 0, kicks: [] };
  const squad = (side: Side) => state.players.filter(p => p.side === side && !p.sentOff)
    .sort((a, b) => b.shooting - a.shooting);
  const home = squad("home"), away = squad("away");
  const take = (side: Side, round: number) => {
    const own = side === "home" ? home : away, opponent = side === "home" ? away : home;
    const player = own[round % own.length];
    const keeper = opponent.find(p => p.role === "GK");
    const chance = clamp(0.75 + ((player?.shooting ?? 70) - (keeper?.overall ?? 65)) * 0.004
      - Math.max(0, 35 - (player?.stamina ?? 100)) * 0.0015, 0.54, 0.9);
    const scored = random() < chance;
    result.kicks.push({ side, player: player?.name ?? "Cobrador", scored });
    if (scored) result[side]++;
  };
  for (let round = 0; round < 5; round++) {
    take("home", round);
    if (result.home > result.away + 5 - round || result.away > result.home + 4 - round) return result;
    take("away", round);
    if (Math.abs(result.home - result.away) > 4 - round) return result;
  }
  // Sudden death. The seeded PRNG makes the result reproducible in replays/tests.
  let round = 5;
  while (result.home === result.away) {
    take("home", round);
    take("away", round++);
  }
  return result;
}

export function beginTitleCelebration(state: MatchState): boolean {
  if (!state.finished || state.cupRound !== 2 || !state.winner || state.celebration) return false;
  const winners = state.players.filter(p => p.side === state.winner);
  const captain = [...winners].sort((a, b) => b.overall - a.overall || a.number - b.number)[0];
  if (!captain) return false;
  state.paused = true;
  state.celebration = {
    winner: state.winner, captainId: captain.id, time: 0, duration: 17, complete: false,
    origins: winners.map(p => ({ id: p.id, x: p.x, y: p.y })),
  };
  return true;
}

export function updateTitleCelebration(state: MatchState, dt: number) {
  const c = state.celebration;
  if (!c || c.complete) return;
  c.time = Math.min(c.duration, c.time + Math.max(0, Math.min(dt, 1)));
  c.complete = c.time >= c.duration;
  // Only the presentation clock advances. Physics, result, stamina and match time stay frozen.
}

export function seekTitleCelebration(state: MatchState | null, restart: boolean) {
  const c = state?.celebration;
  if (!c) return false;
  c.time = restart ? 0 : c.duration;
  c.complete = !restart;
  return true;
}

export function celebrationPose(c: TitleCelebration, player: Player) {
  const origin = c.origins.find(p => p.id === player.id);
  if (!origin) return null;
  const peers = c.origins.filter(p => p.id !== c.captainId);
  const captain = player.id === c.captainId;
  const index = peers.findIndex(p => p.id === player.id);
  const targetX = captain ? 50 : 50 + (index - (peers.length - 1) / 2) * 2.7;
  const targetY = captain ? 34 : 30.8;
  const gather = smooth(c.time / 4.5);
  const lift = smooth((c.time - 5) / 1.6);
  const jump = c.time > 6.6 ? Math.max(0, Math.sin((c.time - 6.6) * 5 + player.id)) * 0.32 : 0;
  return {
    x: origin.x + (targetX - origin.x) * gather,
    y: origin.y + (targetY - origin.y) * gather,
    height: smooth((c.time - 3.5) / 1) * 0.7 + (captain ? 0 : jump),
    lift, captain, gathered: gather === 1,
  };
}

// Deterministic particles evaluated from ceremony time: pause/resize cannot change their paths.
export function celebrationParticle(index: number, time: number) {
  const delay = (index % 80) * 0.021;
  const age = time - 6.4 - delay;
  if (age < 0 || age > 10) return null;
  const side = index % 2 ? 1 : -1;
  const spread = ((index * 73) % 137) / 137;
  return {
    x: 50 + side * (17 - age * (2.1 + spread)) + Math.sin(age * 1.9 + index) * 2,
    y: 24 + ((index * 31) % 230) / 10 + Math.sin(age + index) * 2,
    z: Math.max(0.15, 1 + age * (10 + spread * 5) - age * age * 1.2),
    rotation: age * (2 + spread * 7), alpha: clamp((10 - age) / 2, 0, 1),
  };
}

export function fireworkParticle(index: number, time: number) {
  const burst = Math.floor(index / 48);
  const age = time - 7.1 - burst * 1.3;
  if (age < 0 || age > 2.4) return null;
  const angle = (index % 48) / 48 * Math.PI * 2;
  const radius = age * (5 + index % 4);
  return { x: 21 + (burst % 3) * 29 + Math.cos(angle) * radius,
    y: -10 + (burst % 2) * 3,
    z: 22 + Math.sin(angle) * radius - age * age * 1.5,
    alpha: 1 - age / 2.4 };
}

export function celebrationShot(time: number) {
  if (time < 4.5) return { x: 63 - time, y: 26 - time * 3, z: 66 - time * 3.2, zoom: 2.4 + time * 0.35 };
  if (time < 9) return { x: 53 + Math.sin(time * 0.3) * 3, y: 8.4, z: 49, zoom: 5.1 };
  return { x: 50 + Math.sin((time - 9) * 0.2) * 14, y: 12 + (time - 9) * 0.4, z: 57, zoom: 3.6 };
}
