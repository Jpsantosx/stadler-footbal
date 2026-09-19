import type { MatchState } from './football-engine.ts';
type Frame = NonNullable<MatchState['goalFrame']>;
const snapshot = (s: MatchState): Frame => ({players:s.players.map(p=>({...p})),ball:{...s.ball},elapsed:s.elapsed});
/** Bounded 4-second, 30 Hz visual recording. No replay frame is simulated. */
export function createGoalReplay() {
  let source: MatchState|null=null, frames: Frame[]=[], clock=0, playback: Frame[]=[], cursor=0;
  let visual: MatchState|null=null;
  return {
    get active(){return playback.length>1;},
    get count(){return frames.length;},
    reset(){source=null;frames=[];playback=[];visual=null;clock=0;cursor=0;},
    record(s:MatchState,dt:number){
      if(source!==s){source=s;frames=[];playback=[];visual=null;clock=0;}
      clock+=dt;
      if(clock>=1/30){clock%=1/30;frames.push(snapshot(s));if(frames.length>120)frames.shift();}
    },
    start(s:MatchState){
      if(source!==s || frames.length<2 || !s.goalFrame)return false;
      playback=[...frames,s.goalFrame];cursor=playback[0].elapsed;
      visual={...s,players:playback[0].players.map(p=>({...p})),ball:{...playback[0].ball},particles:[],trail:[],replayView:true,goalFrame:undefined};
      frames=[];return true;
    },
    skip(){playback=[];visual=null;frames=[];clock=0;},
    sample(dt:number){
      if(playback.length<2||!visual)return null;
      cursor+=Math.min(.1,Math.max(0,dt))*.5;
      const end=playback[playback.length-1];
      if(cursor>end.elapsed+.45){this.skip();return null;}
      let index=0;while(index<playback.length-2&&playback[index+1].elapsed<cursor)index++;
      const a=playback[index],b=playback[index+1],t=Math.max(0,Math.min(1,(cursor-a.elapsed)/Math.max(.001,b.elapsed-a.elapsed)));
      visual.elapsed=cursor;
      visual.players.forEach((p,i)=>{Object.assign(p,a.players[i]);for(const key of ['x','y','vx','vy','actionTimer'] as const)p[key]=a.players[i][key]+(b.players[i][key]-a.players[i][key])*t;});
      Object.assign(visual.ball,a.ball);
      for(const key of ['x','y','z'] as const)visual.ball[key]=a.ball[key]+(b.ball[key]-a.ball[key])*t;
      return visual;
    }
  };
}
