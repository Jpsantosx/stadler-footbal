import { TRAINING_GATES } from "./football-training.ts";
import type { MatchState } from "./football-engine.ts";

/** Field coordinates stay fixed when the broadcast camera pans or zooms. */
export function drawRadar(ctx: CanvasRenderingContext2D, state: MatchState) {
  const width = 220, height = 146, pad = 8;
  const x = (v: number) => pad + Math.max(0, Math.min(100, v)) * 2.04;
  const y = (v: number) => pad + Math.max(0, Math.min(64, v)) * 2.03;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(7, 19, 23, .76)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(213, 239, 219, .36)"; ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, 204, 130);
  ctx.beginPath(); ctx.moveTo(x(50), pad); ctx.lineTo(x(50), 138);
  ctx.moveTo(x(59.15), y(32)); ctx.ellipse(x(50), y(32), 18.66, 18.57, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(x(0), y(15), 34.7, 69); ctx.strokeRect(x(83), y(15), 34.7, 69);
  if(state.training?.kind==='dribble'){const g=TRAINING_GATES[state.training.checkpoint];if(g){ctx.strokeStyle='#a8ff64';ctx.beginPath();ctx.arc(x(g.x),y(g.y),6,0,Math.PI*2);ctx.stroke();}}
  for (const p of state.players) {
    if (p.sentOff) continue;
    const selected = p.id === state.selectedId || (state.gameMode === "local2p" && p.id === state.selectedAwayId);
    ctx.fillStyle = p.side === "home" ? "#d9ffa2" : "#75ccff";
    ctx.strokeStyle = selected ? "#ffffff" : "#10222a"; ctx.lineWidth = selected ? 1.5 : .8;
    ctx.beginPath(); ctx.arc(x(p.x), y(p.y), selected ? 4.3 : 2.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (selected) {
      ctx.beginPath(); ctx.moveTo(x(p.x), y(p.y));
      ctx.lineTo(x(p.x) + p.facingX * 8, y(p.y) + p.facingY * 8); ctx.stroke();
    }
  }
  ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#10222a"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x(state.ball.x), y(state.ball.y), 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
