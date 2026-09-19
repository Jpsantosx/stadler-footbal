import type { MatchState, Player } from "./football-engine.ts";
type Position = { x: number; y: number; z?: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Interpolate presentation only. The authoritative simulation stays at 120 Hz. */
export function createFramePresenter() {
  let identity: MatchState | null = null;
  let visual: MatchState | null = null;
  let previousBall: Position = { x: 50, y: 32, z: 0 };
  const previousPlayers = new Map<number, Position>();
  let previousHalf = 1, previousGoals = 0;
  function bind(state: MatchState) {
    if (state === identity) return;
    identity = state;
    visual = { ...state, players: state.players.map(p => ({ ...p })), ball: { ...state.ball } };
    previousPlayers.clear();
    capture(state);
  }
  function capture(state: MatchState) {
    if (identity !== state) bind(state);
    previousBall = { x: state.ball.x, y: state.ball.y, z: state.ball.z };
    previousHalf = state.half; previousGoals = state.homeScore + state.awayScore;
    for (const p of state.players) previousPlayers.set(p.id, { x: p.x, y: p.y });
  }
  function blend(p: Position, previous: Position | undefined, alpha: number) {
    if (!previous || Math.hypot(p.x - previous.x, p.y - previous.y) > 5) return p;
    return { x: lerp(previous.x, p.x, alpha), y: lerp(previous.y, p.y, alpha), z: lerp(previous.z ?? 0, p.z ?? 0, alpha) };
  }
  return { capture, sample(state: MatchState, alpha: number) {
    bind(state);
    const v = visual!, players = v.players, ball = v.ball;
    const discontinuity = state.paused || state.finished || state.frozen > 0 || !!state.setPiece ||
      state.half !== previousHalf || state.homeScore + state.awayScore !== previousGoals;
    const t = discontinuity ? 1 : Math.max(0, Math.min(1, alpha));
    Object.assign(v, state); v.players = players; v.ball = ball;
    state.players.forEach((p, i) => Object.assign(players[i] ?? (players[i] = {} as Player), p, blend(p, previousPlayers.get(p.id), t)));
    Object.assign(ball, state.ball, blend(state.ball, previousBall, t));
    return v;
  } };
}
