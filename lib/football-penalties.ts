import { recordKick, statsFor } from './football-match-detail.ts';
import type { MatchState, Side } from './football-engine.ts';
export type PenaltyDuel = { single:boolean; side:Side; phase:'aim'|'flight'|'result'; time:number; aim:number; height:number; dive:number; committed:boolean; takerId:number; keeperId:number; scored:boolean; saved:boolean; kicks:{side:Side;player:string;scored:boolean}[]; home:number;away:number };
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const other=(s:Side):Side=>s==='home'?'away':'home';
function prepare(s:MatchState,d:PenaltyDuel){
  const squad=s.players.filter(p=>p.side===d.side&&!p.sentOff).sort((a,b)=>b.shooting-a.shooting);
  const count=d.kicks.filter(k=>k.side===d.side).length;
  const p=(d.single&&d.takerId?squad.find(p=>p.id===d.takerId):null)??squad[count%squad.length];const keeper=s.players.find(p=>p.side!==d.side&&p.role==='GK'&&!p.sentOff)??s.players.find(p=>p.side!==d.side&&!p.sentOff)!;
  d.takerId=p.id;d.keeperId=keeper.id;d.phase='aim';d.time=0;d.aim=32;d.height=1;d.dive=0;d.committed=false;d.scored=false;d.saved=false;
  s.players.forEach((p,i)=>{p.x=65-i%4*3;p.y=5+Math.floor(i/4)*4;p.vx=p.vy=0;});
  p.x=86;p.y=32;p.facingX=1;p.facingY=0;keeper.x=99;keeper.y=32;keeper.facingX=-1;keeper.facingY=0;
  s.ball={...s.ball,x:88,y:32,z:.2,vx:0,vy:0,vz:0,owner:null,spin:0,lastTouch:d.side,lastPlayerId:p.id};
  s.selectedId=d.side==='home'?p.id:keeper.id;s.selectedAwayId=d.side==='away'?p.id:keeper.id;
  s.chargingShot=s.chargingAwayShot=false;s.shotCharge=s.awayShotCharge=0;s.setPiece=null;s.frozen=0;
}
export function beginPenaltyDuel(s:MatchState,single=false,side:Side='home'){
  const d:PenaltyDuel={single,side,phase:'aim',time:0,aim:32,height:1,dive:0,committed:false,takerId:0,keeperId:0,scored:false,saved:false,kicks:[],home:0,away:0};
  if(single&&s.setPiece)d.takerId=s.setPiece.takerId;
  s.penaltyDuel=d;s.paused=false;prepare(s,d);
}
export function commitPenaltyDive(s:MatchState,side:Side,direction?:number){
  const d=s.penaltyDuel;if(!d||side===d.side||d.phase==='result'||d.committed)return;
  if(direction!==undefined)d.dive=clamp(direction,-1,1);d.committed=true;
}
export function strikePenalty(s:MatchState,side:Side){
  const d=s.penaltyDuel;if(!d)return;
  if(side!==d.side){commitPenaltyDive(s,side);return;}
  if(d.phase!=='aim')return;
  const p=s.players.find(p=>p.id===d.takerId)!;const charge=side==='home'?s.shotCharge:s.awayShotCharge;
  const error=(1-p.shooting/110)*(charge>.9?1.7:.55)*Math.sin(s.rng+++s.elapsed*7);
  const power=30+charge*22,dy=d.aim+error-32,dx=12,length=Math.hypot(dx,dy),flight=12/(power*dx/length);
  s.ball.vx=power*dx/length;s.ball.vy=power*dy/length;s.ball.vz=(d.height-.2)/flight+9.25*flight;s.ball.owner=null;
  if(d.single){if(side==='home')s.stats.homeShots++;else s.stats.awayShots++;recordKick(s,p,'shot');}
  p.action='shot';p.actionTimer=.5;d.phase='flight';d.time=0;
  if(other(side)==='away'&&s.gameMode!=='local2p'){d.dive=Math.sin(s.rng++*12.9898)>.2?1:Math.sin(s.rng++*7.31)<-.2?-1:0;d.committed=true;}
  s.chargingShot=s.chargingAwayShot=false;
}
export function shootoutWinner(d:Pick<PenaltyDuel,'kicks'|'home'|'away'>):Side|null{
  const h=d.kicks.filter(k=>k.side==='home').length,a=d.kicks.length-h;
  if(h<=5&&a<=5){if(d.home>d.away+5-a)return 'home';if(d.away>d.home+5-h)return 'away';}
  if(h>=5&&h===a&&d.home!==d.away)return d.home>d.away?'home':'away';return null;
}
/** Integrates the actual shot and goalkeeper reach; no coin-flip goal resolution. */
export function stepPenaltyDuel(s:MatchState,dt:number,aim:number,dive:number):'goal'|'miss'|'complete'|null{
  const d=s.penaltyDuel;if(!d)return null;d.time+=dt;
  const human=d.side==='home'||s.gameMode==='local2p';
  if(d.phase==='aim'){
    if(human){d.aim=clamp(d.aim+aim*dt*8,22,42);if(d.side==='home'&&s.chargingShot)s.shotCharge=clamp(s.shotCharge+dt*.75,0,1);if(d.side==='away'&&s.chargingAwayShot)s.awayShotCharge=clamp(s.awayShotCharge+dt*.75,0,1);}
    else if(d.time>2){d.aim=25+((Math.sin(s.rng++*8.71)+1)/2)*14;s.awayShotCharge=.55;strikePenalty(s,d.side);}
    if(!d.committed)d.dive=dive;return null;
  }
  if(d.phase==='flight'){
    const keeper=s.players.find(p=>p.id===d.keeperId)!;
    if(!d.committed&&Math.abs(dive)>.5){d.dive=dive;d.committed=true;}
    if(d.committed){keeper.y=clamp(keeper.y+d.dive*dt*(15+keeper.overall*.025),25,39);keeper.keeperSave='dive';keeper.actionTimer=.5;keeper.keeperDiveTimer=.6;keeper.keeperDiveDirection=d.dive;}
    const b=s.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vz-=18.5*dt;b.z=Math.max(.15,b.z+b.vz*dt);
    const reach=1.2+keeper.overall*.009;
    if(!d.saved&&b.x>=97.8&&b.x<=100&&Math.abs(b.y-keeper.y)<reach&&b.z<2.7){d.saved=true;if(d.single)statsFor(s,keeper).saves++;b.vx=-Math.abs(b.vx)*.23;b.vy=d.dive*7;b.vz=3;}
    if(b.x>=100||d.saved||d.time>1.1){d.scored=!d.saved&&b.x>=100&&b.y>24&&b.y<40&&b.z<4.5;d.phase='result';d.time=0;
      d.kicks.push({side:d.side,player:s.players.find(p=>p.id===d.takerId)!.name,scored:d.scored});if(d.scored)d[d.side]++;
      s.message=d.scored?'GOL!':d.saved?'DEFENDEU!':'PARA FORA!';s.messageTimer=1.5;
    }return null;
  }
  if(d.time<1.6)return null;
  if(d.single){const result=d.scored?'goal':'miss';s.penaltyDuel=undefined;return result;}
  const winner=shootoutWinner(d);if(winner){s.shootout={home:d.home,away:d.away,kicks:d.kicks};s.winner=winner;s.penaltyDuel=undefined;return 'complete';}
  d.side=other(d.side);prepare(s,d);return null;
}
