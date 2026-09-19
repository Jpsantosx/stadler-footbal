"use client";
import { useState } from 'react';
import { DEFAULT_CONTROLS, rumble, type ControlPreferences } from '@/lib/football-controls';
export default function AdvancedControls({value,onChange,onEdit,canEdit}:{value:ControlPreferences;onChange:(p:ControlPreferences)=>void;onEdit:()=>void;canEdit:boolean}){
  const [notice,setNotice]=useState('');
  return <section className="advanced-controls">
    <h3>Comandos e jogadas especiais</h3>
    <p>Segure o modificador antes do botão da ação. O chute dispara ao soltar. A força também depende da carga e do equilíbrio.</p>
    <div className="combo-table"><table><thead><tr><th>Jogada</th><th>Teclado J1 / mouse</th><th>Xbox · PS · Nintendo</th></tr></thead><tbody>
      <tr><td>Proteger / drible curto</td><td>Segure H + direção</td><td>LT · L2 · ZL + analógico</td></tr>
      <tr><td>Colocado</td><td>H + Espaço / clique esquerdo</td><td>LT+B · L2+○ · ZL+A</td></tr>
      <tr><td>Cavadinha</td><td>Shift + Espaço / esquerdo</td><td>RT+B · R2+○ · ZR+A</td></tr>
      <tr><td>Superchute</td><td>H + Shift + Espaço / esquerdo</td><td>LT+RT+B · L2+R2+○ · ZL+ZR+A</td></tr>
      <tr><td>Chapéu</td><td>H + F / clique direito · ou G</td><td>LT+A · L2+✕ · ZL+B</td></tr>
      <tr><td>Finta curta</td><td>H + R / botão do meio · ou T</td><td>LT+X · L2+□ · ZL+Y</td></tr>
      <tr><td>Bicicleta</td><td>H + E / H + botão do meio · ou B</td><td>LT+Y · L2+△ · ZL+X</td></tr>
      <tr><td>Cruzamento alto</td><td>N / Jogadas +</td><td>RT+Y · R2+△ · ZR+X</td></tr>
      <tr><td>Cruzamento rasteiro</td><td>M / Jogadas +</td><td>RT+X · R2+□ · ZR+Y</td></tr>
      <tr><td>Tabelinha</td><td>Y / Jogadas +</td><td>RT+A · R2+✕ · ZR+B</td></tr>
      <tr><td>Cabeceio / voleio</td><td>Espaço / esquerdo com bola no ar</td><td>B · ○ · A com bola no ar</td></tr>
    </tbody></table></div>
    <p>Bicicleta: bola solta no ar, perto do atleta. Superchute: carga de pelo menos 55% e 18 de energia. As jogadas podem falhar ou ser defendidas. Mouse funciona sobre o campo; WASD controla a direção.</p>
    <p>J2: Numpad 0 protege; Numpad 0 + L colocado; Enter + L cobertura; ambos + L superchute; Numpad 0 + K chapéu, + U finta, + J bicicleta. Em controles remapeados, as combinações seguem as ações BOTE, CORRER, PASSE e CHUTE.</p>
    <label>Sensibilidade do analógico: {value.sensitivity.toFixed(2)}<input aria-label="Sensibilidade do analógico" type="range" min="0.5" max="1.8" step="0.05" value={value.sensitivity} onChange={e=>onChange({...value,sensitivity:Number(e.target.value)})}/></label>
    <label><input type="checkbox" checked={value.vibration} onChange={e=>onChange({...value,vibration:e.target.checked})}/> Vibração nos controles compatíveis</label>
    <button type="button" onClick={async()=>{try{const pads=Array.from(navigator.getGamepads?.()??[]);const results=await Promise.all(pads.filter(p=>p?.connected).map(p=>rumble(p,value.vibration)));setNotice(results.some(Boolean)?'Pulso enviado. Confirme no controle se sentiu a vibração.':'Sem vibração disponível. Confira a opção, o controle e o navegador.');}catch{setNotice('Não foi possível testar neste navegador.');}}}>Testar vibração</button>
    {notice&&<p role="status">{notice}</p>}
    <label>Tamanho dos controles de toque: {Math.round(value.touchScale*100)}%<input aria-label="Tamanho dos controles de toque" type="range" min="0.85" max="1.25" step="0.05" value={value.touchScale} onChange={e=>onChange({...value,touchScale:Number(e.target.value)})}/></label>
    <button type="button" disabled={!canEdit} onClick={onEdit}>Reposicionar botões no campo</button>
    {!canEdit&&<p>Inicie uma partida para arrastar os controles.</p>}
    <button type="button" onClick={()=>onChange({...value,layout:{},touchScale:DEFAULT_CONTROLS.touchScale})}>Restaurar posição e tamanho</button>
  </section>;
}
