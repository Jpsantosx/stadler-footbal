import type { MatchState } from "./football-engine.ts";

export type CameraMode = "broadcast" | "tactical" | "close" | "pro";
export type StadiumLight = "night" | "sunset" | "day";
export type PresentationSettings = { camera: CameraMode; lighting: StadiumLight; automatic: boolean; radar: boolean };
export type CameraFrame = { x: number; y: number; span: number };
export const DEFAULT_PRESENTATION: PresentationSettings = { camera: "broadcast", lighting: "night", automatic: true, radar: true };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The same field-space composition drives the WebGL and Canvas cameras. */
export function cameraTarget(state: MatchState, mode: CameraMode, aspect: number): CameraFrame {
  if (mode === "tactical") return { x: 50, y: 32, span: Math.max(136, aspect * 80) };
  if(mode==='pro'){const p=state.players.find(p=>p.id===(state.lockedPlayerId??state.selectedId));if(p)return {x:p.x,y:p.y,span:Math.max(50,aspect*32)};}
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
    camera: saved.camera === "pro" || saved.camera === "close" || saved.camera === "tactical" ? saved.camera : "broadcast",
    lighting: saved.lighting === "day" || saved.lighting === "sunset" ? saved.lighting : "night",
    automatic: saved.automatic !== false,
    radar: saved.radar !== false,
  };
}

export function proCameraForward(s:MatchState){
 const p=s.players.find(p=>p.id===(s.lockedPlayerId??s.selectedId));if(!p)return {x:1,y:0};
 const attack=s.homeAttacksRight?1:-1,dx=s.ball.x-p.x,dy=s.ball.y-p.y,len=Math.hypot(dx,dy);
 const x=attack*.7+(len>3?dx/len:p.facingX)*.3,y=(len>3?dy/len:p.facingY)*.3,n=Math.hypot(x,y);return {x:x/n,y:y/n};
}
export function proCameraPose(s:MatchState){
 const p=s.players.find(p=>p.id===(s.lockedPlayerId??s.selectedId))!,f=proCameraForward(s);
 return {x:p.x-f.x*11,y:6.4,z:p.y-f.y*11,lookX:p.x+f.x*9,lookZ:p.y+f.y*9};
}
