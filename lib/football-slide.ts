import type {Player} from './football-engine.ts';
export type SlideState={phase:'fall'|'slide'|'impact'|'recover';time:number;elapsed:number;contact:'ball'|'foul'|null};
export function startSlide(p:Player){p.slideState={phase:'fall',time:0,elapsed:0,contact:null};p.slideTimer=1.05;p.slideHit=false;}
export function slideImpact(p:Player,contact:'ball'|'foul'){if(!p.slideState)return;p.slideState.phase='impact';p.slideState.time=0;p.slideState.contact=contact;p.vx*=contact==='ball'?.62:.25;p.vy*=contact==='ball'?.62:.25;}
export function updateSlide(p:Player,dt:number){
 const s=p.slideState;if(!s)return false;s.time+=dt;s.elapsed+=dt;
 const duration=s.phase==='fall'?.12:s.phase==='slide'?.4:s.phase==='impact'?.12:.38;
 if(s.time>=duration){if(s.phase==='recover'){p.slideState=undefined;p.slideTimer=0;p.vx=p.vy=0;return true;}s.phase=s.phase==='fall'?'slide':'recover';s.time=0;}
 const drag=s.phase==='recover'?16:s.phase==='impact'?12:5.5;
 const friction=Math.exp(-drag*dt*(75/Math.max(55,p.mass)));p.vx*=friction;p.vy*=friction;
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.slideTimer=Math.max(.01,1.05-s.elapsed);return true;
}
export function slidePose(p:Player){
 const s=p.slideState;if(!s)return null;
 const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const ground=s.phase==='fall'?smooth(s.time/.12):s.phase==='recover'?1-smooth(s.time/.38):1;
 return {ground,lean:-1.18*ground,height:-.72*ground,leg:-.95*ground,bent:1.2*ground,impact:s.phase==='impact'?Math.sin(s.time/.12*Math.PI)*.12:0};
}
