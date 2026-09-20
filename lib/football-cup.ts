import { TEAMS, type Team } from './football-engine.ts';
export type CupTie={a:string;b:string;winner?:string;score?:string};
export type CupBracket={club:string;round:number;rounds:CupTie[][];eliminated:boolean;champion?:string};
export function drawCup(club:Team,pool:Team[],random:()=>number=Math.random):CupBracket{
 const ids=[...new Set(pool.filter(t=>t.id!==club.id).map(t=>t.id))];
 for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
 if(ids.length<15)throw new Error('A copa precisa de 16 clubes.');
 const teams=[club.id,...ids.slice(0,15)];for(let i=teams.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[teams[i],teams[j]]=[teams[j],teams[i]];}
 return {club:club.id,round:0,rounds:[Array.from({length:8},(_,i)=>({a:teams[i*2],b:teams[i*2+1]}))],eliminated:false};
}
export function cupOpponent(c:CupBracket){if(c.eliminated||c.champion)return null;const tie=c.rounds[c.round]?.find(t=>t.a===c.club||t.b===c.club);return tie?TEAMS.find(t=>t.id===(tie.a===c.club?tie.b:tie.a))??null:null;}
export function advanceCup(c:CupBracket,opponent:string,won:boolean,score:string,random:()=>number=Math.random):CupBracket{
 if(cupOpponent(c)?.id!==opponent)return c;
 const next=structuredClone(c),ties=next.rounds[next.round];
 for(const t of ties){if(t.a===c.club||t.b===c.club){t.winner=won?c.club:opponent;t.score=score;}else{const a=TEAMS.find(x=>x.id===t.a)!,b=TEAMS.find(x=>x.id===t.b)!;t.winner=random()<.5+(a.rating-b.rating)*.012?t.a:t.b;t.score='Simulado';}}
 next.eliminated=!won;next.round++;
 if(ties.length===1)next.champion=ties[0].winner;
 else next.rounds.push(Array.from({length:ties.length/2},(_,i)=>({a:ties[i*2].winner!,b:ties[i*2+1].winner!})));
 return next;
}
