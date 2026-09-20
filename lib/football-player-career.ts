import { TEAMS, createMatch, type Role, type PlayerLook, type Player, type LeagueRow, type MatchState, type Difficulty } from './football-engine.ts';
import { createLeagueRows, nextLeagueFixture, simulateLeagueRound, sortedLeagueRows } from './football-competition.ts';
import { athleteKey, statsFor, playerRating, type AthleteStats } from './football-match-detail.ts';
export const JOURNEY_KEY='stadler-player-career-v1';
export const SKIN_COLORS=['#f2c7a5','#d7a379','#ad7955','#80543a','#513628'];
export const HAIR_COLORS=['#171717','#57331e','#b17c35','#ead5a5'];
export type CareerAttribute='pace'|'shooting'|'passing'|'defending'|'strength'|'endurance';
export const CAREER_ATTRIBUTES:Record<CareerAttribute,string>={pace:'Velocidade',shooting:'Finalização',passing:'Passe e domínio',defending:'Defesa',strength:'Força',endurance:'Resistência'};
export type PlayerCareer={
  version:1;id:string;name:string;number:number;clubId:string;role:Exclude<Role,'GK'>;
  foot:'left'|'right';weakFoot:number;trait:NonNullable<Player['trait']>;look:PlayerLook;
  attributes:Record<CareerAttribute,number>;xp:number;points:number;season:number;rows:LeagueRow[];
  appearances:number;goals:number;assists:number;titles:{season:number;name:string}[];
  history:{fixture:string;score:string;rating:number;xp:number}[];lastFixture:string|null;
};
export type CareerDraft=Pick<PlayerCareer,'name'|'number'|'clubId'|'role'|'foot'|'weakFoot'|'trait'|'look'>;
export function careerOverall(c:PlayerCareer){
  const a=c.attributes;return Math.round(c.role==='FW'?(a.shooting*.38+a.pace*.22+a.passing*.17+a.strength*.13+a.endurance*.1):
    c.role==='MF'?(a.passing*.35+a.endurance*.2+a.pace*.17+a.shooting*.15+a.defending*.13):
    (a.defending*.38+a.strength*.23+a.pace*.17+a.passing*.12+a.endurance*.1));
}
export function newPlayerCareer(draft:CareerDraft,id:string):PlayerCareer{
  const club=TEAMS.find(t=>t.id===draft.clubId)??TEAMS[0];
  const attributes={pace:65,shooting:draft.role==='FW'?69:57,passing:draft.role==='MF'?70:63,defending:draft.role==='DF'?70:48,strength:62,endurance:66};
  if(draft.trait==='speed')attributes.pace+=5;if(draft.trait==='technical')attributes.passing+=5;
  if(draft.trait==='aerial')attributes.strength+=5;if(draft.trait==='power')attributes.shooting+=5;
  return {...draft,name:draft.name.trim().slice(0,24)||'Novo craque',number:Math.max(1,Math.min(99,Math.round(draft.number)||10)),
    clubId:club.id,version:1,id,attributes,xp:0,points:0,season:1,rows:createLeagueRows(club.leagueId),appearances:0,goals:0,assists:0,titles:[],history:[],lastFixture:null};
}
export function parsePlayerCareer(raw:unknown):PlayerCareer|null{
  if(!raw||typeof raw!=='object')return null;
  const c=raw as PlayerCareer,club=TEAMS.find(t=>t.id===c.clubId);
  if(c.version!==1||!club||typeof c.id!=='string'||c.id.length>100||typeof c.name!=='string'||c.name.length>24||
    !['FW','MF','DF'].includes(c.role)||!['right','left'].includes(c.foot)||!['technical','aerial','speed','power'].includes(c.trait)||
    !c.look||!SKIN_COLORS.includes(c.look.skin)||!HAIR_COLORS.includes(c.look.hair)||!['short','mohawk','bald','curly','long'].includes(c.look.style)||
    !['wings','jump','point'].includes(c.look.celebration)||!Number.isFinite(c.look.height)||c.look.height<165||c.look.height>200||
    !c.attributes||!Object.keys(CAREER_ATTRIBUTES).every(k=>Number.isFinite(c.attributes[k as CareerAttribute])&&c.attributes[k as CareerAttribute]>=35&&c.attributes[k as CareerAttribute]<=95)||
    ![c.xp,c.points,c.season,c.appearances,c.goals,c.assists,c.number,c.weakFoot].every(n=>Number.isInteger(n)&&n>=0)||
    c.weakFoot<1||c.weakFoot>5||c.number<1||c.number>99||c.season<1||!Array.isArray(c.rows)||
    !Array.isArray(c.history)||!Array.isArray(c.titles)||!(c.lastFixture===null||typeof c.lastFixture==='string'))return null;
  const look=c.look;
  if((look.weight!==undefined&&(!Number.isFinite(look.weight)||look.weight<55||look.weight>105))||
    ['eyes','eyeSize','nose','mouth','jaw'].some(k=>{const n=look[k as keyof typeof look];return n!==undefined&&(typeof n!=='number'||!Number.isFinite(n)||n<.6||n>1.4);})||
    (look.beard!==undefined&&!['none','stubble','full'].includes(look.beard))||
    (look.boots!==undefined&&!/^#[0-9a-f]{6}$/i.test(look.boots))||
    (look.socks!==undefined&&!['high','low'].includes(look.socks)))return null;
  const expected=createLeagueRows(club.leagueId);
  if(c.rows.length!==expected.length||new Set(c.rows.map(r=>r.teamId)).size!==expected.length||
    !c.rows.every(r=>expected.some(e=>e.teamId===r.teamId)&&['played','wins','draws','losses','goalsFor','goalsAgainst','points'].every(k=>Number.isInteger(r[k as keyof LeagueRow])&&Number(r[k as keyof LeagueRow])>=0))||
    !c.history.every(h=>typeof h.fixture==='string'&&typeof h.score==='string'&&Number.isFinite(h.rating)&&Number.isFinite(h.xp))||
    !c.titles.every(t=>Number.isInteger(t.season)&&typeof t.name==='string'))return null;
  return structuredClone(c);
}
export function playerCareerFixture(c:PlayerCareer){
  const fixture=nextLeagueFixture(c.rows,c.clubId);if(!fixture)return null;
  return {id:`${c.id}:${c.season}:${c.rows.find(r=>r.teamId===c.clubId)!.played}`,opponent:TEAMS.find(t=>t.id===(fixture.homeId===c.clubId?fixture.awayId:fixture.homeId))!};
}
export function makePlayerCareerMatch(c:PlayerCareer,difficulty:Difficulty='normal'){
  const fixture=playerCareerFixture(c);if(!fixture)return null;
  const club=TEAMS.find(t=>t.id===c.clubId)!;
  const state=createMatch(club,fixture.opponent,difficulty);
  const p=state.players.find(p=>p.side==='home'&&p.role===c.role)!;
  const oldKey=athleteKey(p);if(state.detail)delete state.detail.athletes[oldKey];
  Object.assign(p,effectiveCareerAttributes(c),{squadId:c.id,name:c.name,number:c.number,preferredFoot:c.foot,weakFoot:c.weakFoot,
    trait:c.trait,appearance:{...c.look},overall:careerOverall(c),mass:c.look.weight??(65+(c.look.height-165)*.5),
    archetype:c.trait==='technical'?'creator':c.trait==='speed'?'sprinter':c.role==='DF'?'stopper':'finisher'});
  statsFor(state,p);state.selectedId=p.id;state.lockedPlayerId=p.id;state.careerFixture=fixture.id;
  state.message=`${c.name.toUpperCase()} • SUA JORNADA COMEÇA`;return state;
}
export function settlePlayerCareer(c:PlayerCareer,state:MatchState):PlayerCareer{
  const fixture=playerCareerFixture(c),p=state.players.find(p=>p.squadId===c.id);
  if(!fixture||!state.finished||state.careerFixture!==fixture.id||state.careerFixture===c.lastFixture||!p||state.homeTeam.id!==c.clubId||state.awayTeam.id!==fixture.opponent.id)return c;
  const stats=statsFor(state,p),rating=playerRating(stats),won=state.homeScore>state.awayScore;
  const xp=40+Math.round(Math.max(0,rating-6)*30)+stats.goals*30+stats.assists*20+(won?35:state.homeScore===state.awayScore?15:0);
  const rows=simulateLeagueRound(c.rows,c.clubId,fixture.opponent.id,state.homeScore,state.awayScore);
  const finished=!nextLeagueFixture(rows,c.clubId),champion=sortedLeagueRows(rows)[0].teamId===c.clubId;
  return {...c,xp:c.xp+xp,points:c.points+Math.floor((c.xp+xp)/100)-Math.floor(c.xp/100),rows,appearances:c.appearances+1,
    goals:c.goals+stats.goals,assists:c.assists+stats.assists,lastFixture:fixture.id,
    titles:finished&&champion?[...c.titles,{season:c.season,name:'Campeão da liga'}]:c.titles,
    history:[{fixture:fixture.id,score:`${state.homeScore}–${state.awayScore} ${fixture.opponent.short}`,rating,xp},...c.history].slice(0,50)};
}
export function upgradeCareer(c:PlayerCareer,attribute:CareerAttribute|'weakFoot'):PlayerCareer{
  const cost=attribute==='weakFoot'?3:1;
  if(c.points<cost)return c;
  if(attribute==='weakFoot')return c.weakFoot>=5?c:{...c,points:c.points-cost,weakFoot:c.weakFoot+1};
  if(!Object.hasOwn(CAREER_ATTRIBUTES,attribute)||c.attributes[attribute]>=95)return c;
  return {...c,points:c.points-cost,attributes:{...c.attributes,[attribute]:c.attributes[attribute]+1}};
}
export function nextPlayerSeason(c:PlayerCareer):PlayerCareer{
  if(playerCareerFixture(c))return c;
  return {...c,season:c.season+1,rows:createLeagueRows(TEAMS.find(t=>t.id===c.clubId)!.leagueId),lastFixture:null};
}
export function careerMatchStats(state:MatchState):AthleteStats|undefined{
  const p=state.players.find(p=>p.id===state.lockedPlayerId);return p?statsFor(state,p):undefined;
}

export function effectiveCareerAttributes(c:Pick<PlayerCareer,'attributes'|'look'>){
 const height=c.look.height,weight=c.look.weight??(65+(height-165)*.5),clamp=(v:number)=>Math.max(35,Math.min(99,v));
 return {...c.attributes,pace:clamp(c.attributes.pace-(height-180)*.18-(weight-75)*.22),strength:clamp(c.attributes.strength+(weight-75)*.35),endurance:clamp(c.attributes.endurance-Math.max(0,weight-80)*.15)};
}
