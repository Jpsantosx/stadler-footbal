import type { Player } from "./football-engine.ts";
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export type Locomotion = { phase: number; speed: number; vx: number; vy: number; heading: number; lean: number; turn: number; poses?: number[] };
export function createLocomotion(p: Player): Locomotion {
  return { phase: p.id * 1.71, speed: 0, vx: p.vx, vy: p.vy, heading: Math.atan2(p.facingX, p.facingY), lean: 0, turn: 0 };
}

/** Blended stride, plant/recovery, body banking and separate pass/shot follow-through. */
export function athletePose(p: Player, m: Locomotion, dt: number) {
  const step = clamp(dt, 0, .1), blend = 1 - Math.exp(-12 * step);
  const speed = Math.hypot(p.vx, p.vy);
  m.speed += (speed - m.speed) * blend;
  m.phase += (speed > .45 ? speed * .95 : 1.05) * step;
  const target = Math.atan2(p.facingX, p.facingY);
  const angle = Math.atan2(Math.sin(target - m.heading), Math.cos(target - m.heading));
  m.heading += angle * (1 - Math.exp(-10 * step));
  const acceleration = step > 0 ? ((p.vx - m.vx) * p.facingX + (p.vy - m.vy) * p.facingY) / step : 0;
  m.lean += (clamp(m.speed * .006 + acceleration * .003, -.16, .24) - m.lean) * blend;
  m.turn += (clamp(angle * m.speed * .035, -.3, .3) - m.turn) * blend;
  m.vx = p.vx; m.vy = p.vy;
  const amplitude = clamp(m.speed / 21, 0, .78);
  // A slower planted phase and bent-knee recovery replace symmetric pendulum legs.
  const phases=[m.phase,m.phase+Math.PI];
  // Hold the support leg closer to the turf through the contact phase. This
  // reduces the skating look without changing simulation positions.
  const stride=phases.map(t=>{
    const swing=Math.sin(t)*amplitude*(Math.cos(t)>0?1:.82);
    const planted=Math.max(0,Math.cos(t));
    return swing*(1-planted*.14);
  });
  const knees=phases.map(t=>{
    const recovery=Math.max(0,Math.cos(t));
    const support=Math.max(0,-Math.cos(t));
    return recovery*amplitude*1.5 + support*amplitude*.09 + .055;
  });

  const arms = [-stride[0] * .7, -stride[1] * .7];
  const elbows = [-.35 - amplitude * .65, -.35 - amplitude * .65];
  let bob = Math.abs(Math.sin(m.phase)) * amplitude * .05;
  let kick = 0;
  if (p.actionTimer > 0 && (p.action === "shot" || p.action === "pass")) {
    const duration = p.action === "shot" ? .5 : .34;
    const progress = clamp(1 - p.actionTimer / duration, 0, 1);
    kick = Math.sin(progress * Math.PI) * (p.action === "shot" ? 1.35 : .88);
    stride[1] = -.2 - kick; knees[1] = .15 + Math.max(0, .22 - progress) * 3;
    stride[0] *= .25; arms[0] = -.65; arms[1] = .5;
    bob *= .3;
  } else if (p.action === "control" && p.actionTimer > 0) {
    stride[1] = -.3; knees[1] = .65; arms[0] -= .2; arms[1] -= .2;
  }
  let lean=m.lean, bank=m.turn;
  if(p.actionTimer>0 && p.action==='bicycle') {const t=clamp(1-p.actionTimer/.85,0,1);lean=-Math.sin(t*Math.PI)*1.65;bob+=Math.sin(t*Math.PI)*1.2;stride[0]=1.3;stride[1]=-1.4;arms[0]=arms[1]=-.9;}
  if(p.actionTimer>0 && p.action==='rainbow'){knees[0]=1.1;knees[1]=.9;bob+=Math.sin(clamp(1-p.actionTimer/.62,0,1)*Math.PI)*.2;}
  if(p.actionTimer>0 && p.action==='feint')bank+=Math.sin(clamp(1-p.actionTimer/.4,0,1)*Math.PI)*.3;
  if(p.actionTimer>0 && p.action==='header'){const t=clamp(1-p.actionTimer/.65,0,1);bob+=Math.sin(t*Math.PI)*.65;lean+=Math.sin(t*Math.PI)*.36;arms[0]=arms[1]=-.8;}
  if(p.actionTimer>0 && p.action==='volley'){const t=clamp(1-p.actionTimer/.65,0,1);stride[1]=-1.5*Math.sin(t*Math.PI);knees[1]=.2;lean=-.35;arms[0]=-.9;}
  if(p.actionTimer>0 && p.action==='celebrate'){
    const style=p.appearance?.celebration ?? (['wings','jump','point'] as const)[p.id%3];
    arms[0]=style==='point'?-2.7:-1.7;arms[1]=style==='point'?.3:-1.7;elbows[0]=elbows[1]=-.1;
    if(style==='jump')bob+=Math.abs(Math.sin(p.actionTimer*6))*.7;
  }
  if(p.shielding){arms[0]=-.9;arms[1]=.6;lean+=.08;}
  if(p.action==='request'&&p.actionTimer>0){arms[0]=-2.85;elbows[0]=-.15;}
  if(m.speed<.5)bob+=Math.sin(m.phase+p.stamina*.02)*.008;
  const raw=[...stride,...knees,...arms,...elbows,bob,lean,bank];
  if(!m.poses)m.poses=[...raw];
  raw.forEach((n,i)=>{m.poses![i]+=(n-m.poses![i])*(1-Math.exp(-22*step));});
  const poses=m.poses;
  return {heading:m.heading,stride:poses.slice(0,2),knees:poses.slice(2,4),arms:poses.slice(4,6),elbows:poses.slice(6,8),bob:poses[8],lean:poses[9],bank:poses[10],kick};
}
