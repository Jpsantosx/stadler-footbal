import type { MatchState } from "./football-engine.ts";

export type CameraMode = "broadcast" | "tactical" | "close";
export type StadiumLight = "night" | "day";
export type PresentationSettings = { camera: CameraMode; lighting: StadiumLight; automatic: boolean; radar: boolean };
export type CameraFrame = { x: number; y: number; span: number };
export const DEFAULT_PRESENTATION: PresentationSettings = { camera: "broadcast", lighting: "night", automatic: true, radar: true };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The same field-space composition drives the WebGL and Canvas cameras. */
export function cameraTarget(state: MatchState, mode: CameraMode, aspect: number): CameraFrame {
  if (mode === "tactical") return { x: 50, y: 32, span: Math.max(136, aspect * 80) };
  const ball = state.ball;
  const lead = ball.owner === null ? 0.18 : 0.3;
  let x = clamp(ball.x + ball.vx * lead, 2, 98);
  let y = clamp(ball.y + ball.vy * lead, 3, 61);
  let span = Math.max(mode === "close" ? 62 : 78, aspect * (mode === "close" ? 35 : 37));
  if (ball.owner === null) span += clamp(Math.hypot(ball.vx, ball.vy) - 25, 0, 40) * .45;
  // Shared-screen play must keep BOTH humans and the ball in the composition.
  if (state.gameMode === "local2p") {
    const humans = state.players.filter(p => !p.sentOff && (p.id === state.selectedId || p.id === state.selectedAwayId));
    const xs = [x, ...humans.map(p => p.x)], ys = [y, ...humans.map(p => p.y)];
    const lo = Math.min(...xs), hi = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    span = Math.max(span, (hi - lo + 20) * 1.12, (bottom - top + 18) * aspect * .9);
    x = (lo + hi) / 2; y = (top + bottom) / 2;
  }
  span = clamp(span, 62, 148);
  const edge = Math.min(50, span * .36);
  return { x: clamp(x, edge, 100 - edge), y: clamp(y, 18, 48), span };
}

export function stepCamera(current: CameraFrame, target: CameraFrame, dt: number): CameraFrame {
  const pan = 1 - Math.exp(-4.8 * clamp(dt, 0, 1));
  const zoom = 1 - Math.exp(-(target.span > current.span ? 6 : 2.7) * clamp(dt, 0, 1));
  return { x: current.x + (target.x - current.x) * pan,
    y: current.y + (target.y - current.y) * pan,
    span: current.span + (target.span - current.span) * zoom };
}

/** Perspective camera geometry; no WebGL context is needed to validate framing. */
export function broadcastCameraPose(frame: CameraFrame, aspect: number) {
  const fov = 38;
  const distance = frame.span / (2 * Math.max(.35, aspect) * Math.tan(fov * Math.PI / 360));
  return { x: frame.x, height: distance * .86, z: frame.y + distance * .51,
    lookX: frame.x, lookY: frame.y, fov };
}

export function parsePresentation(value: unknown): PresentationSettings {
  const saved = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    camera: saved.camera === "close" || saved.camera === "tactical" ? saved.camera : "broadcast",
    lighting: saved.lighting === "day" ? "day" : "night",
    automatic: saved.automatic !== false,
    radar: saved.radar !== false,
  };
}
