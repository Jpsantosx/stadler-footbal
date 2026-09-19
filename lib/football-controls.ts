import type { ShotKind } from './football-engine.ts';
export type ControlPreferences = {sensitivity:number;vibration:boolean;touchScale:number;layout:Record<string,{x:number;y:number}>;touchShot:ShotKind};
export const DEFAULT_CONTROLS:ControlPreferences={sensitivity:1,vibration:true,touchScale:1,layout:{},touchShot:'auto'};
export function parseControls(raw:unknown):ControlPreferences {
  const p=(raw&&typeof raw==='object'?raw:{}) as Partial<ControlPreferences>;
  const bounded=(n:unknown,low:number,high:number,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(low,Math.min(high,n)):fallback;
  const layout:ControlPreferences['layout']={};
  if(p.layout&&typeof p.layout==='object')for(const key of ['joystick','sprint','tackle','switch','slide','pass','shoot']){
    const v=p.layout[key];if(v&&typeof v==='object')layout[key]={x:bounded(v.x,-1,1,0),y:bounded(v.y,-1,1,0)};
  }
  return {sensitivity:bounded(p.sensitivity,.5,1.8,1),vibration:p.vibration!==false,touchScale:bounded(p.touchScale,.85,1.25,1),layout,
    touchShot:['auto','placed','power','lob'].includes(p.touchShot??'')?p.touchShot!:'auto'};
}
export function shotModifiers(shield:boolean,sprint:boolean):ShotKind {return shield&&sprint?'power':shield?'placed':sprint?'lob':'auto';}
type RumblePad={vibrationActuator?:{playEffect:(type:'dual-rumble',params:{duration:number;startDelay:number;strongMagnitude:number;weakMagnitude:number})=>Promise<unknown>}};
export async function rumble(pad:RumblePad|null|undefined,enabled:boolean,strength=.4,duration=90){
  if(!enabled||!pad?.vibrationActuator?.playEffect)return false;
  try {const result=await pad.vibrationActuator.playEffect('dual-rumble',{duration:Math.max(0,Math.min(350,duration)),startDelay:0,strongMagnitude:strength,weakMagnitude:strength*.6});return result!=='preempted';}catch{return false;}
}
