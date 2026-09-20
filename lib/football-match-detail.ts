import type { MatchState, Player, Side } from './football-engine.ts';

export type AthleteStats = {
  key: string; name: string; side: Side; number: number; seconds: number; distance: number;
  passes: number; completed: number; shots: number; goals: number; assists: number;
  saves: number; duels: number; badRequests:number; outOfPosition:number; heat: number[];
};
export type MatchDetail = {
  athletes: Record<string, AthleteStats>;
  pending: { key: string; side: Side; expires: number; shot: boolean } | null;
  assist: { key: string; receiver: string; expires: number } | null;
};
export const athleteKey = (p: Player) => `${p.side}:${p.squadId}`;
export function detailFor(state: MatchState) {
  return state.detail ??= { athletes: {}, pending: null, assist: null };
}
export function statsFor(state: MatchState, p: Player): AthleteStats {
  const d = detailFor(state), key = athleteKey(p);
  return d.athletes[key] ??= { key, name: p.name, side: p.side, number: p.number,
    seconds: 0, distance: 0, passes: 0, completed: 0, shots: 0, goals: 0, assists: 0,
    saves: 0, duels: 0, badRequests:0,outOfPosition:0,heat: Array(60).fill(0) };
}
export function recordKick(state: MatchState, p: Player, kind: string) {
  const d = detailFor(state), row = statsFor(state, p);
  if (kind === 'pass') row.passes++;
  if (kind === 'shot') row.shots++;
  d.pending = kind === 'clear' ? null : { key: athleteKey(p), side: p.side, expires: state.elapsed + 5, shot: kind === 'shot' };
  if (d.assist?.receiver !== athleteKey(p)) d.assist = null;
}
export function recordReception(state: MatchState, p: Player, controlled = true) {
  const d = detailFor(state), pending = d.pending;
  if (pending && pending.expires >= state.elapsed) {
    if (pending.side === p.side && !pending.shot && controlled && pending.key !== athleteKey(p)) {
      d.athletes[pending.key].completed++;
      d.assist = { key: pending.key, receiver: athleteKey(p), expires: state.elapsed + 8 };
    } else if (pending.side !== p.side) {
      if (pending.shot && p.role === 'GK') statsFor(state, p).saves++;
      d.assist = null;
    }
  }
  d.pending = null;
}
export function recordGoal(state: MatchState, p: Player | undefined, side: Side) {
  const d = detailFor(state);
  if (p?.side === side) {
    statsFor(state, p).goals++;
    if (d.assist && d.assist.receiver === athleteKey(p) && d.assist.expires >= state.elapsed)
      d.athletes[d.assist.key].assists++;
  }
  d.pending = null; d.assist = null;
}
export function trackAthletes(state: MatchState, dt: number) {
  for (const p of state.players) {
    if (p.sentOff) continue;
    const s = statsFor(state, p);
    if(p.id===state.lockedPlayerId){
      const right=p.side==='home'?state.homeAttacksRight:!state.homeAttacksRight, progress=right?p.x:100-p.x;
      const nearBall=Math.hypot(p.x-state.ball.x,p.y-state.ball.y)<12;
      const outside=p.role==='FW'?progress<38:p.role==='DF'?progress>75:progress<18||progress>90;
      if(outside&&!nearBall)s.outOfPosition+=dt;
    }
    s.seconds += dt; s.distance += Math.hypot(p.vx, p.vy) * dt;
    const column = Math.max(0, Math.min(9, Math.floor(p.x / 10)));
    const row = Math.max(0, Math.min(5, Math.floor(p.y / (64 / 6))));
    s.heat[row * 10 + column] += dt;
  }
}
export function playerRating(s: AthleteStats) {
  return Math.round(Math.max(4, Math.min(10, 6 + s.goals * 1.15 + s.assists * .65 + s.completed * .055 +
    s.duels * .16 + s.saves * .18 + Math.min(.4, s.shots * .06) - (s.passes - s.completed) * .09 - (s.badRequests??0)*.25 - Math.min(2,(s.outOfPosition??0)/25))) * 10) / 10;
}
export function passAccuracy(s: { passes: number; completed: number }) {
  return s.passes ? Math.round(s.completed / s.passes * 100) : 0;
}
