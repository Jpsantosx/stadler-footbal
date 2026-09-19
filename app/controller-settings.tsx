"use client";
import { Gamepad2 } from "lucide-react";
import { CALIBRATION_STEPS, PAD_ACTIONS, padButtonLabel, type PadCalibration, type PadInfo, type PadProfiles } from "@/lib/football-gamepad";

const names = { xbox:"Xbox", playstation:"PlayStation", nintendo:"Nintendo", generic:"Controle" };
const actions = { pass:"Passe", shoot:"Segurar / soltar chute", through:"Enfiada", slide:"Carrinho", steal:"Bote", switch:"Trocar jogador", sprint:"Correr", pause:"Pausa / continuar" };

export default function ControllerSettings({ infos, profiles, calibration, notice, onCalibrate, onCancel, onReset }: {
  infos: PadInfo[]; profiles: PadProfiles; calibration: PadCalibration | null; notice: string;
  onCalibrate:(info:PadInfo)=>void; onCancel:()=>void; onReset:(id:string)=>void;
}) {
  return <section className="controller-settings" aria-label="Controles conectados">
    <h3><Gamepad2 size={19} /> Controles de videogame <span>{infos.length}/2</span></h3>
    <p>Conecte por USB ou Bluetooth no seu dispositivo, abra o jogo e pressione um botão do controle para ativá-lo.</p>
    {notice && <p className="controller-notice" role="status">{notice}</p>}
    {infos.length===0 && <div className="controller-empty">Aguardando controle · Xbox, PlayStation ou Nintendo.<small>O navegador precisa reconhecer o dispositivo. Controles sem mapeamento padrão podem ser configurados abaixo após aparecerem.</small></div>}
    {infos.map(info=><article className="controller-card" key={info.index+info.id}>
      <header><strong>J{info.side==="home"?1:2} · {names[info.family]}</strong><span data-ready={info.usable}>{info.usable?"Conectado":"Configurar"}</span></header>
      <small className="controller-device-name">{info.id}</small>
      {calibration?.id===info.id && calibration.index===info.index ? <div className="controller-calibration" aria-live="polite">
        <span>PASSO {Math.min(10,calibration.step+1)} DE 10</span>
        <strong>{CALIBRATION_STEPS[calibration.step]??"Configuração concluída"}</strong>
        <p>{calibration.error || (calibration.neutral?"Solte os botões e centralize o analógico antes de continuar.":"Aguardando seu comando no controle…")}</p>
        <button type="button" onClick={onCancel}>Cancelar configuração</button>
      </div> : <>
        {info.usable && <div className="controller-mapping"><p>Analógico esquerdo: mover e mirar · Direcional: navegar</p>
          <dl>{PAD_ACTIONS.map(action=><div key={action}><dt>{actions[action]}</dt><dd>{info.custom?"Botão "+(profiles[info.id].buttons[action]+1):padButtonLabel(info.family,action)}</dd></div>)}</dl>
        </div>}
        <div className="controller-actions"><button type="button" onClick={()=>onCalibrate(info)} disabled={!!calibration}>{info.usable?"Remapear botões":"Configurar este controle"}</button>
          {info.custom && <button type="button" onClick={()=>onReset(info.id)} disabled={!!calibration}>Restaurar padrão</button>}</div>
      </>}
    </article>)}
    <p className="controller-footnote">Para jogar com dois controles, escolha <b>2 jogadores</b> no menu. J1 controla seu time e J2 o adversário. Nos menus: direcional navega, botão de passe confirma e botão de chute volta.</p>
  </section>;
}
