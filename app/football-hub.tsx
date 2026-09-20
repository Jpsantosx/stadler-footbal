"use client";
import { useState, type CSSProperties } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TEAMS, TACTICS, FORMATIONS, type FormationId, type MatchState, type TacticId, type Side, type TrainingKind } from '@/lib/football-engine';
import { TRAINING_DRILLS } from '@/lib/football-training';
import { effectiveCareerAttributes, CAREER_ATTRIBUTES, SKIN_COLORS, HAIR_COLORS, careerOverall, playerCareerFixture, newPlayerCareer, upgradeCareer, nextPlayerSeason,
  type PlayerCareer, type CareerDraft, type CareerAttribute } from '@/lib/football-player-career';
import { sortedLeagueRows } from '@/lib/football-competition';
import { passAccuracy, playerRating } from '@/lib/football-match-detail';
const roles={FW:'Atacante',MF:'Meia',DF:'Defensor'};
const traits={technical:'Técnico: passe e domínio',speed:'Veloz: arrancadas',aerial:'Jogo aéreo: disputas',power:'Potente: finalização'};
function AthletePreview({draft,color}:{draft:Pick<CareerDraft,'look'|'name'|'number'>;color:string}){
  return <div className="athlete-preview" style={{'--skin':draft.look.skin,'--hair':draft.look.hair,'--kit':color} as CSSProperties}>
    <div className="athlete-portrait" data-hair={draft.look.style}><i className="portrait-head"/><i className="portrait-shirt"><b>{draft.number}</b></i></div>
    <strong>{draft.name||'SEU CRAQUE'}</strong><small>{draft.look.height} cm</small>
  </div>;
}
export function CareerHub({open,onOpenChange,career,onSave,onPlay,saveFailed}:{open:boolean;onOpenChange:(v:boolean)=>void;career:PlayerCareer|null;onSave:(c:PlayerCareer)=>void;onPlay:()=>void;saveFailed:boolean}){
  const [draft,setDraft]=useState<CareerDraft>({name:'',number:10,clubId:TEAMS[0].id,role:'FW',foot:'right',weakFoot:3,trait:'technical',
    look:{skin:SKIN_COLORS[1],hair:HAIR_COLORS[0],style:'short',height:180,celebration:'wings'}});
  const [customizing,setCustomizing]=useState(false);
  const club=TEAMS.find(t=>t.id===(career?.clubId??draft.clubId))!;
  const fixture=career?playerCareerFixture(career):null;
  const row=career?.rows.find(r=>r.teamId===career.clubId);
  const editLook=<div className="hub-form-grid">
    <label>Tom de pele<select value={draft.look.skin} onChange={e=>setDraft({...draft,look:{...draft.look,skin:e.target.value}})}>{SKIN_COLORS.map((c,i)=><option key={c} value={c}>Tom {i+1}</option>)}</select></label>
    <label>Cabelo<select value={draft.look.style} onChange={e=>setDraft({...draft,look:{...draft.look,style:e.target.value as CareerDraft['look']['style']}})}><option value="short">Curto</option><option value="mohawk">Moicano</option><option value="bald">Raspado</option><option value="curly">Cacheado</option><option value="long">Comprido</option></select></label>
    <label>Cor do cabelo<select value={draft.look.hair} onChange={e=>setDraft({...draft,look:{...draft.look,hair:e.target.value}})}>{HAIR_COLORS.map((c,i)=><option key={c} value={c}>{['Preto','Castanho','Loiro','Claro'][i]}</option>)}</select></label>
    <label>Altura · {draft.look.height} cm<input type="range" min="165" max="200" value={draft.look.height} onChange={e=>setDraft({...draft,look:{...draft.look,height:Number(e.target.value)}})}/></label>
    <label>Peso · {draft.look.weight??75} kg<input type="range" min="55" max="105" value={draft.look.weight??75} onChange={e=>setDraft({...draft,look:{...draft.look,weight:Number(e.target.value)}})}/></label>
    {([['eyes','Distância dos olhos'],['eyeSize','Tamanho dos olhos'],['nose','Nariz'],['mouth','Boca'],['jaw','Maxilar']] as const).map(([key,label])=><label key={key}>{label}<input type="range" min=".6" max="1.4" step=".05" value={draft.look[key]??1} onChange={e=>setDraft({...draft,look:{...draft.look,[key]:Number(e.target.value)}})}/></label>)}
    <label>Barba<select value={draft.look.beard??'none'} onChange={e=>setDraft({...draft,look:{...draft.look,beard:e.target.value as 'none'|'stubble'|'full'}})}><option value="none">Sem barba</option><option value="stubble">Por fazer</option><option value="full">Cheia</option></select></label>
    <label>Chuteiras<input type="color" value={draft.look.boots??'#e7e7e7'} onChange={e=>setDraft({...draft,look:{...draft.look,boots:e.target.value}})}/></label>
    <label>Meias<select value={draft.look.socks??'high'} onChange={e=>setDraft({...draft,look:{...draft.look,socks:e.target.value as 'high'|'low'}})}><option value="high">Altas</option><option value="low">Baixas</option></select></label>
    <label><input type="checkbox" checked={draft.look.wristband??false} onChange={e=>setDraft({...draft,look:{...draft.look,wristband:e.target.checked}})}/>Faixas de pulso</label>
    <label><input type="checkbox" checked={draft.look.tucked??true} onChange={e=>setDraft({...draft,look:{...draft.look,tucked:e.target.checked}})}/>Camisa por dentro</label>
    <p className="hub-note">Altura amplia o alcance aéreo. Peso aumenta a força e reduz aceleração. {career&&`Velocidade efetiva: ${Math.round(effectiveCareerAttributes({...career,look:draft.look}).pace)}.`}</p>
    <label>Comemoração<select value={draft.look.celebration} onChange={e=>setDraft({...draft,look:{...draft.look,celebration:e.target.value as CareerDraft['look']['celebration']}})}><option value="wings">Braços abertos</option><option value="jump">Salto de vitória</option><option value="point">Apontar para a torcida</option></select></label>
  </div>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="game-dialog football-hub"><DialogHeader>
    <DialogTitle>Carreira de jogador</DialogTitle><DialogDescription>Seu atleta, sua evolução. Dispute temporadas da liga em partidas de 8 contra 8.</DialogDescription>
  </DialogHeader>{saveFailed&&<p role="alert" className="hub-warning">O navegador não conseguiu salvar. Libere espaço ou permita armazenamento para manter sua carreira.</p>}
  {!career||customizing?<form onSubmit={e=>{e.preventDefault();onSave(career?{...career,name:draft.name.trim()||career.name,number:draft.number,look:draft.look}:newPlayerCareer(draft,crypto.randomUUID()));setCustomizing(false);}}>
    <div className="career-create"><AthletePreview draft={draft} color={club.primary}/><div className="hub-form-grid">
      <label>Nome do atleta<input required maxLength={24} value={draft.name} placeholder="Como a torcida vai te chamar?" onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <label>Número<input type="number" min="1" max="99" required value={draft.number} onChange={e=>setDraft({...draft,number:Number(e.target.value)})}/></label>
      {!career&&<><label>Clube<select value={draft.clubId} onChange={e=>setDraft({...draft,clubId:e.target.value})}>{TEAMS.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>Posição<select value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value as CareerDraft['role']})}>{Object.entries(roles).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label>Pé dominante<select value={draft.foot} onChange={e=>setDraft({...draft,foot:e.target.value as CareerDraft['foot']})}><option value="right">Direito</option><option value="left">Esquerdo</option></select></label>
      <label>Estilo<select value={draft.trait} onChange={e=>setDraft({...draft,trait:e.target.value as CareerDraft['trait']})}>{Object.entries(traits).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></>}
    </div></div>{editLook}<button className="play-button" type="submit">{career?'SALVAR VISUAL':'CRIAR MEU JOGADOR'}</button>
    {career&&<button type="button" className="text-button" onClick={()=>setCustomizing(false)}>Cancelar</button>}
  </form>:<>
    <div className="career-summary"><AthletePreview draft={career} color={club.primary}/><div><span className="hub-kicker">TEMPORADA {career.season} · {club.name}</span><h2>{career.name} <b className="overall-pill">{careerOverall(career)} OVR</b></h2>
      <p>{roles[career.role]} · Pé {career.foot==='left'?'esquerdo':'direito'} · Pé fraco {career.weakFoot}/5</p><p>{traits[career.trait]}</p>
      <div className="hub-metrics"><span><b>{career.appearances}</b> jogos</span><span><b>{career.goals}</b> gols</span><span><b>{career.assists}</b> assistências</span><span><b>{career.titles.length}</b> títulos</span></div>
      <label className="xp-progress">{career.xp} XP · {career.points} pontos disponíveis<progress max={100} value={career.xp%100}/><small>Cada 100 XP libera um ponto de evolução.</small></label>
    </div></div>
    <div className="next-fixture"><div><small>{fixture?`RODADA ${(row?.played??0)+1}`:'TEMPORADA ENCERRADA'}</small><strong>{fixture?`${club.short} × ${fixture.opponent.name}`:`${sortedLeagueRows(career.rows).findIndex(r=>r.teamId===career.clubId)+1}º lugar na liga`}</strong></div>
      <button className="play-button" onClick={()=>fixture?onPlay():onSave(nextPlayerSeason(career))}>{fixture?'JOGAR PARTIDA':'INICIAR NOVA TEMPORADA'}</button></div>
    <p className="hub-note">Você controla apenas seu atleta. F / passe pede a bola; Q também chama o passe. Encontre espaço para seus companheiros conseguirem te acionar. A evolução é salva neste navegador.</p>
    {career.history[0]&&<p className="career-reward">Último jogo: {career.history[0].score} · Nota {career.history[0].rating.toFixed(1)} · +{career.history[0].xp} XP</p>}
    <div className="hub-attributes">{Object.entries(CAREER_ATTRIBUTES).map(([id,name])=><div key={id}><span>{name}</span><strong>{career.attributes[id as CareerAttribute]}</strong><button disabled={career.points<1||career.attributes[id as CareerAttribute]>=95} onClick={()=>onSave(upgradeCareer(career,id as CareerAttribute))} aria-label={`Melhorar ${name}`}>+1</button></div>)}
    <div><span>Pé fraco · 3 pontos</span><strong>{career.weakFoot}/5</strong><button disabled={career.points<3||career.weakFoot>=5} onClick={()=>onSave(upgradeCareer(career,'weakFoot'))}>+1</button></div></div>
    <details><summary>Classificação da liga</summary><div className="hub-table-wrap"><table><thead><tr><th>Pos.</th><th>Clube</th><th>J</th><th>Pts</th><th>Saldo</th></tr></thead><tbody>{sortedLeagueRows(career.rows).map((r,i)=><tr key={r.teamId} data-mine={r.teamId===career.clubId}><td>{i+1}</td><td>{TEAMS.find(t=>t.id===r.teamId)?.name}</td><td>{r.played}</td><td>{r.points}</td><td>{r.goalsFor-r.goalsAgainst}</td></tr>)}</tbody></table></div></details>
    <details><summary>Sala de troféus · {career.titles.length}</summary>{career.titles.length?career.titles.map(t=><p key={t.season}>🏆 Temporada {t.season} · {t.name}</p>):<p>Conquiste a primeira liga. O título é concedido ao líder após todas as rodadas de ida e volta.</p>}</details>
    <button className="secondary-button" onClick={()=>{setDraft({name:career.name,number:career.number,clubId:career.clubId,role:career.role,foot:career.foot,weakFoot:career.weakFoot,trait:career.trait,look:{...career.look}});setCustomizing(true);}}>PERSONALIZAR ATLETA</button>
  </>}
  </DialogContent></Dialog>;
}
export function TrainingHub({open,onOpenChange,onPlay}:{open:boolean;onOpenChange:(v:boolean)=>void;onPlay:(kind:TrainingKind)=>void}){
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="game-dialog football-hub"><DialogHeader><DialogTitle>Centro de treino</DialogTitle><DialogDescription>Repetições sem cronômetro de partida, com orientação do momento de executar.</DialogDescription></DialogHeader><div className="training-grid">{TRAINING_DRILLS.map((d,i)=><button key={d.id} onClick={()=>onPlay(d.id)}><span>0{i+1}</span><strong>{d.name}</strong><p>{d.description}</p><b>COMEÇAR →</b></button>)}</div><p className="hub-note">Acertos de treino ficam nesta sessão. A experiência da carreira vem das partidas oficiais.</p></DialogContent></Dialog>;
}
export function MatchCentre({state,onClose,onTactics,onSub,onFormation}:{state:MatchState;onFormation:(side:Side,formation:FormationId)=>void;onClose:()=>void;onTactics:(side:Side,tactic:TacticId,pressure:number,width:number)=>void;onSub:(side:Side,id:number,index:number)=>boolean}){
  const [side,setSide]=useState<Side>('home'),[athlete,setAthlete]=useState(''),[outgoing,setOutgoing]=useState(0),[incoming,setIncoming]=useState(0),[notice,setNotice]=useState('');
  const rows=Object.values(state.detail?.athletes??{}).sort((a,b)=>playerRating(b)-playerRating(a)||b.goals-a.goals);
  const selected=rows.find(r=>r.key===athlete)??rows.find(r=>r.side===side)??rows[0];
  const totals=(side:Side)=>rows.filter(r=>r.side===side).reduce((a,r)=>({passes:a.passes+r.passes,completed:a.completed+r.completed}),{passes:0,completed:0});
  const active=state.players.filter(p=>p.side===side&&!p.sentOff),out=active.find(p=>p.id===outgoing)??active.find(p=>p.role!=='GK');
  const bench=state.benches?.[side]??[],candidate=bench[incoming];
  const tactic=side==='home'?state.homeTactic:state.awayTactic,live=state.liveTactics?.[side]??{pressure:1,width:1};
  return <Dialog open onOpenChange={v=>{if(!v)onClose();}}><DialogContent className="game-dialog football-hub"><DialogHeader><DialogTitle>Central da partida</DialogTitle><DialogDescription>Análise dos lances, movimentação e decisões táticas.</DialogDescription></DialogHeader>
    {!state.preMatch&&<><div className="hub-metrics"><span>{state.homeTeam.short} <b>{passAccuracy(totals('home'))}%</b> passes certos</span><span>{state.awayTeam.short} <b>{passAccuracy(totals('away'))}%</b> passes certos</span></div>
    <label>Mapa de calor<select value={selected?.key??''} onChange={e=>setAthlete(e.target.value)}>{rows.map(r=><option key={r.key} value={r.key}>{r.name} · {r.side==='home'?state.homeTeam.short:state.awayTeam.short}</option>)}</select></label>
    {selected&&<><svg className="heatmap" viewBox="0 0 100 64" role="img" aria-label={`Mapa de calor de ${selected.name}. Quanto mais amarelo, mais tempo na região.`}><rect width="100" height="64" fill="#164c35"/>{selected.heat.map((v,i)=><rect key={i} x={i%10*10} y={Math.floor(i/10)*64/6} width="10" height={64/6} fill="#ffd450" opacity={v/Math.max(1,...selected.heat)*.9}/>)}<g stroke="white" opacity=".7" strokeWidth=".4" fill="none"><rect x="1" y="1" width="98" height="62"/><path d="M50 1V63 M1 17H17V47H1 M99 17H83V47H99"/><circle cx="50" cy="32" r="9"/></g></svg><p className="hub-note">{Math.round(selected.distance)} m percorridos · {Math.round(selected.seconds)} s em campo · Mapa na orientação fixa do estádio.</p></>}
    <div className="hub-table-wrap"><table><caption>Melhores jogadores · nota pelo desempenho registrado</caption><thead><tr><th>Atleta</th><th>Nota</th><th>Gols</th><th>Ass.</th><th>Chutes</th><th>Passes</th><th>Defesas</th><th>Duelos</th></tr></thead><tbody>{rows.map(r=><tr key={r.key}><td>{r.name}</td><td>{playerRating(r).toFixed(1)}</td><td>{r.goals}</td><td>{r.assists}</td><td>{r.shots}</td><td>{r.completed}/{r.passes}</td><td>{r.saves}</td><td>{r.duels}</td></tr>)}</tbody></table></div>
    </>}
    {!state.finished&&!state.training&&<details open><summary>Táticas e substituições</summary><div className="hub-form-grid">
      <label>Equipe<select value={side} onChange={e=>{setSide(e.target.value as Side);setOutgoing(0);setIncoming(0);}}><option value="home">{state.homeTeam.name}</option>{state.gameMode==='local2p'&&<option value="away">{state.awayTeam.name}</option>}</select></label>
      <label>Formação<select value={side==='home'?state.homeFormation:state.awayFormation} onChange={e=>onFormation(side,e.target.value as FormationId)}>{Object.values(FORMATIONS).map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
      <label>Postura<select value={tactic} onChange={e=>onTactics(side,e.target.value as TacticId,live.pressure,live.width)}>{Object.values(TACTICS).map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
      <label>Pressão · {Math.round(live.pressure*100)}%<input type="range" min="65" max="140" value={Math.round(live.pressure*100)} onChange={e=>onTactics(side,tactic,Number(e.target.value)/100,live.width)}/></label>
      <label>Largura · {Math.round(live.width*100)}%<input type="range" min="70" max="130" value={Math.round(live.width*100)} onChange={e=>onTactics(side,tactic,live.pressure,Number(e.target.value)/100)}/></label>
      <label>Sai<select value={out?.id??0} onChange={e=>setOutgoing(Number(e.target.value))}>{active.map(p=><option key={p.id} value={p.id}>{p.name} · {p.overall} OVR · {Math.round(p.stamina)}% energia{p.id===state.lockedPlayerId?' · seu atleta':''}</option>)}</select></label>
      <label>Entra<select value={incoming} onChange={e=>setIncoming(Number(e.target.value))}>{bench.map((p,i)=><option key={p[7]??p[0]} value={i}>{p[0]} · {p[2]} OVR · {p[3]}</option>)}</select></label>
    </div>
    {out&&<p className="hub-note">{out.name}: pé {out.preferredFoot==='left'?'esquerdo':'direito'} · pé fraco {out.weakFoot}/5 · {traits[out.trait??'technical']}. Perfis dos elencos são estimativas de jogo.</p>}
    <button className="secondary-button" disabled={!candidate||!out||(!state.preMatch&&(state.substitutions?.[side]??0)>=5)||out.id===state.lockedPlayerId||(candidate[3]==='GK')!==(out.role==='GK')} onClick={()=>{if(out)setNotice(onSub(side,out.id,incoming)?'Substituição realizada. O reserva entra com energia completa.':'Esta substituição não está disponível.');setIncoming(0);}}>{state.preMatch?'ALTERAR TITULAR':`SUBSTITUIR · ${state.substitutions?.[side]??0}/5`}</button>
    <p className="hub-note">Mais pressão aumenta o desgaste. Goleiros substituem goleiros; seu atleta permanece em campo na carreira.</p><p role="status">{notice}</p></details>}
  </DialogContent></Dialog>;
}
