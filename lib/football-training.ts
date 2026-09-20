import { createMatch, getPlayer, startSetPiece, aerialWindow, TEAMS, type MatchState, type Team, type TrainingKind, type SetPiece } from './football-engine.ts';
export const TRAINING_DRILLS = [
  {id:'dribble',name:'Domínio e dribles',description:'Passe por três zonas com a bola. Use finta, proteção e movimentos curtos.'},
  {id:'freeKick',name:'Faltas',description:'Ajuste a mira, carregue o chute e vença a barreira.'},
  {id:'penalty',name:'Pênaltis',description:'Escolha o canto e controle a força para superar o goleiro.'},
  {id:'bicycle',name:'Bicicletas',description:'Receba uma bola levantada e finalize quando o indicador ficar verde.'},
] as const;
export const TRAINING_GATES = [{x:61,y:25},{x:69,y:38},{x:79,y:30}];
export function createTraining(kind: TrainingKind, team: Team=TEAMS[0]) {
  const state=createMatch(team,TEAMS.find(t=>t.id!==team.id)!, 'normal');
  state.training={kind,attempts:0,successes:0,started:0,resolved:false,checkpoint:0,baselineGoals:0,feedback:'',next:0};
  resetTraining(state);return state;
}
export function resetTraining(state: MatchState) {
  const t=state.training;if(!t)return;
  const p=state.players.find(p=>p.side==='home'&&p.role==='FW')!;
  const keeper=state.players.find(p=>p.side==='away'&&p.role==='GK')!;
  for(const q of state.players){q.sentOff=q!==p&&q!==keeper;q.vx=0;q.vy=0;q.action='none';q.actionTimer=0;q.skillCooldown=0;q.stamina=100;q.stumbleTimer=0;q.slideTimer=0;q.stealTimer=0;}
  state.lockedPlayerId=p.id;state.selectedId=p.id;state.setPiece=null;state.penaltyDuel=undefined;state.paused=false;state.finished=false;
  state.shotCharge=0;state.chargingShot=false;state.frozen=0;state.passIntent=null;state.oneTwo=undefined;state.goalFrame=undefined;
  p.x=t.kind==='dribble'?52:t.kind==='bicycle'?83:75;p.y=32;p.facingX=1;p.facingY=0;
  keeper.x=96;keeper.y=32;keeper.keeperShotPending=false;keeper.keeperCommitTimer=0;
  Object.assign(state.ball,{x:p.x+1,y:p.y,z:.12,vx:0,vy:0,vz:0,owner:p.id,lastPlayerId:p.id,lastTouch:'home',looseTimer:0});
  t.started=state.elapsed;t.resolved=false;t.checkpoint=0;t.baselineGoals=state.homeScore;t.next=0;t.feedback='';t.attempts++;
  if(t.kind==='freeKick'||t.kind==='penalty'){
    if(t.kind==='freeKick')state.players.filter(q=>q.side==='away'&&q.role==='DF').slice(0,2).forEach(q=>q.sentOff=false);
    startSetPiece(state,t.kind,'home',75,28);state.frozen=0;
    const piece=state.setPiece as SetPiece|null; if(piece){piece.ready=true;piece.timer=0;piece.readyTimer=0;}
  }
  if(t.kind==='bicycle')Object.assign(state.ball,{owner:null,x:p.x+.5,y:p.y,z:.2,vz:8.5,vx:0,vy:0,looseTimer:1});
  state.message='TREINO • '+TRAINING_DRILLS.find(d=>d.id===t.kind)?.name.toUpperCase();state.messageTimer=1;
}
export function trainingHint(state: MatchState) {
  const t=state.training,p=getPlayer(state,state.lockedPlayerId??null);if(!t||!p)return null;
  let ready=false,text=t.feedback;
  if(!t.resolved){
    if(t.kind==='bicycle'){ready=aerialWindow(state,p,'bicycle')&&Math.abs(state.ball.z-2.3)<.65;text=ready?'AGORA! B / bicicleta':'Aguarde a bola na altura do corpo';}
    else if(t.kind==='dribble'){const g=TRAINING_GATES[t.checkpoint];text=g?`Zona ${t.checkpoint+1}/3 • siga o círculo verde`:'Circuito concluído';ready=true;}
    else {ready=state.shotCharge>=.3&&state.shotCharge<=.65;text=ready?'SOLTE O CHUTE • força equilibrada':'Mire com W/S ou analógico; segure e solte o chute';}
  }
  return {text,ready,attempts:t.attempts,successes:t.successes,kind:t.kind};
}
export function tickTraining(state: MatchState) {
  const t=state.training,p=getPlayer(state,state.lockedPlayerId??null);if(!t||!p||state.paused)return;
  if(t.resolved){if(state.elapsed>=t.next)resetTraining(state);return;}
  let success=false;
  if(t.kind==='bicycle')success=p.action==='bicycle'&&p.actionTimer>0;
  else if(t.kind==='dribble'){
    const gate=TRAINING_GATES[t.checkpoint];
    if(gate&&state.ball.owner===p.id&&Math.hypot(p.x-gate.x,p.y-gate.y)<3)t.checkpoint++;
    success=t.checkpoint>=TRAINING_GATES.length;
  } else success=state.homeScore>t.baselineGoals;
  const timeout=state.elapsed-t.started>(t.kind==='dribble'?35:t.kind==='bicycle'?5:14);
  if(success||timeout){t.resolved=true;t.successes+=success?1:0;t.feedback=success?'ACERTO! Prepare-se para a próxima tentativa.':'Tente novamente: ajuste a posição, a mira e o tempo.';t.next=state.elapsed+2;}
}
