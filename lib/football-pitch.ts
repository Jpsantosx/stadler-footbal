import type { Player } from "./football-engine.ts";

export const WEAR_COLS = 50, WEAR_ROWS = 32;
export type PitchWear = {
  cells: number[];
  marks: { x: number; y: number; dx: number; dy: number; strength: number }[];
  revision: number;
  accumulator: number;
};
export function createPitchWear(): PitchWear {
  return { cells: Array(WEAR_COLS * WEAR_ROWS).fill(0), marks: [], revision: 0, accumulator: 0 };
}
export function updatePitchWear(wear: PitchWear, players: Player[], dt: number) {
  wear.accumulator += dt;
  if (wear.accumulator < 0.16) return;
  const step = wear.accumulator;
  wear.accumulator = 0;
  for (const p of players) {
    if (p.sentOff || Math.hypot(p.vx, p.vy) < 0.3) continue;
    const col = Math.floor(p.x / 2), row = Math.floor(p.y / 2);
    const slide = p.slideTimer > 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const x = col + ox, y = row + oy;
      if (x < 0 || y < 0 || x >= WEAR_COLS || y >= WEAR_ROWS) continue;
      const index = y * WEAR_COLS + x;
      wear.cells[index] = Math.min(1, wear.cells[index] + step * (slide ? 0.8 : 0.028) / (1 + ox * ox + oy * oy));
    }
    if (slide) wear.marks.push({ x: p.x, y: p.y, dx: -p.vx * step, dy: -p.vy * step, strength: 0.7 });
  }
  wear.marks = wear.marks.slice(-384);
  wear.revision++;
}
