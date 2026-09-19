import type { InputState, MatchState } from "./football-engine.ts";

export function joystickVector(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) {
  const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.36);
  const x = (clientX - rect.left - rect.width / 2) / radius;
  const y = (clientY - rect.top - rect.height / 2) / radius;
  const length = Math.hypot(x, y);
  if (length < 0.12) return { x: 0, y: 0 };
  const strength = Math.min(1, (length - 0.12) / 0.88);
  return { x: x / length * strength, y: y / length * strength };
}

export function clearMatchInput(input: InputState, state: MatchState | null) {
  input.keys.clear(); input.touchX = 0; input.touchY = 0; input.touchSprint = false;
  input.controllers = {};
  if (!state) return;
  state.chargingShot = false; state.chargingAwayShot = false;
  state.shotCharge = 0; state.awayShotCharge = 0;
}
