import type { GameMode, Side } from "./football-engine.ts";

export type PadAction = "pass" | "shoot" | "through" | "slide" | "steal" | "switch" | "sprint" | "pause";
export type PadSample = { index: number; id: string; connected: boolean; mapping: string;
  axes: readonly number[]; buttons: readonly { pressed: boolean; value: number }[] };
export type PadProfile = { axisX: number; axisY: number; invertX: boolean; invertY: boolean; buttons: Record<PadAction, number> };
export type PadProfiles = Record<string, PadProfile>;
export type PadInput = { x: number; y: number; sprint: boolean; shield?: boolean };
export type PadFamily = "xbox" | "playstation" | "nintendo" | "generic";
export type PadInfo = { side: Side; index: number; id: string; family: PadFamily; usable: boolean; custom: boolean };
export type PadEvent = { side: Side; action: "crossHigh" | "crossLow" | "oneTwo" | "rainbow" | "feint" | "bicycle" | "pass" | "through" | "shootStart" | "shootRelease" | "slide" | "steal" | "switch" | "pause" | "confirm" | "back" | "up" | "down" | "left" | "right" };
export const PAD_ACTIONS: PadAction[] = ["pass", "shoot", "through", "slide", "steal", "switch", "sprint", "pause"];
export const STANDARD_PAD: PadProfile = { axisX: 0, axisY: 1, invertX: false, invertY: false,
  buttons: { pass: 0, shoot: 1, through: 3, slide: 2, steal: 6, switch: 4, sprint: 7, pause: 9 } };
const neutral = (): PadInput => ({ x: 0, y: 0, sprint: false });
const pressed = (pad: PadSample, index: number) => !!pad.buttons[index]?.pressed || (pad.buttons[index]?.value ?? 0) > .55;

export function padFamily(id: string): PadFamily {
  if (/playstation|dualsense|dualshock|sony|054c/i.test(id)) return "playstation";
  if (/^wireless controller$/i.test(id)) return "playstation";
  if (/nintendo|joy.?con|switch|057e|pro controller/i.test(id)) return "nintendo";
  if (/xbox|xinput|microsoft|045e/i.test(id)) return "xbox";
  return "generic";
}
export function padButtonLabel(family: PadFamily, action: PadAction) {
  const labels: Record<PadFamily, Record<PadAction, string>> = {
    xbox: { pass:"A",shoot:"B",through:"Y",slide:"X",steal:"LT",switch:"LB",sprint:"RT",pause:"Menu" },
    playstation: { pass:"✕",shoot:"○",through:"△",slide:"□",steal:"L2",switch:"L1",sprint:"R2",pause:"Options" },
    nintendo: { pass:"B",shoot:"A",through:"X",slide:"Y",steal:"ZL",switch:"L",sprint:"ZR",pause:"+" },
    generic: { pass:"Inferior",shoot:"Direito",through:"Superior",slide:"Esquerdo",steal:"LT / L2",switch:"LB / L1",sprint:"RT / R2",pause:"Start" },
  };
  return labels[family][action];
}

export function padStick(x: number, y: number, sensitivity=1) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0, y: 0 };
  const length = Math.hypot(x, y);
  if (length < .17) return { x: 0, y: 0 };
  const force = Math.pow(Math.min(1, (length - .17) / .83), 1.12 / Math.max(.5, Math.min(1.8, Number.isFinite(sensitivity)?sensitivity:1)));
  return { x: x / length * force, y: y / length * force };
}

export function parsePadProfiles(raw: unknown): PadProfiles {
  const result: PadProfiles = Object.create(null);
  if (!raw || typeof raw !== "object") return result;
  for (const [id, entry] of Object.entries(raw).slice(0, 16)) {
    if (!entry || typeof entry !== "object") continue;
    const p = entry as PadProfile;
    const validIndex = (n: unknown, maximum: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < maximum;
    if (!validIndex(p.axisX, 32) || !validIndex(p.axisY, 32) || p.axisX === p.axisY ||
      !p.buttons || !PAD_ACTIONS.every(a => validIndex(p.buttons[a], 64)) ||
      new Set(PAD_ACTIONS.map(a => p.buttons[a])).size !== PAD_ACTIONS.length) continue;
    result[id] = { axisX:p.axisX, axisY:p.axisY, invertX:!!p.invertX, invertY:!!p.invertY, buttons:{...p.buttons} };
  }
  return result;
}

type Slot = { id: string; index: number; armed: boolean; previous: boolean[]; context: string; repeat: number; direction: string };
export function createGamepadDriver() {
  const slots: Array<Slot | null> = [null, null];
  return { reset() { for (const slot of slots) if (slot) slot.armed=false; },
    poll(pads: readonly (PadSample | null)[], mode: GameMode, context: "playing" | "menu" | "blocked", now: number, profiles: PadProfiles = {}, sensitivity=1) {
      const live=pads.filter((p): p is PadSample => !!p?.connected);
      const disconnected: Side[] = [], events: PadEvent[] = [], infos: PadInfo[] = [];
      const inputs = { home: neutral(), away: neutral() };
      for(let i=0;i<2;i++) {
        const slot=slots[i];
        if(slot && !live.some(p=>p.index===slot.index && p.id===slot.id)) { disconnected.push(i?"away":"home");slots[i]=null; }
      }
      // Reserve existing seats: unplugging J1 never silently turns J2 into J1.
      for(const pad of live) if(!slots.some(s=>s?.index===pad.index)) {
        const seat=slots.findIndex(s=>!s);if(seat<0)break;
        slots[seat]={id:pad.id,index:pad.index,armed:false,previous:[],context:"",repeat:0,direction:""};
      }
      for(let i=0;i<2;i++) {
        const slot=slots[i];if(!slot)continue;
        const pad=live.find(p=>p.index===slot.index)!;
        const side: Side=i?"away":"home";
        const custom=Object.hasOwn(profiles,pad.id);
        const profile=custom ? profiles[pad.id] : STANDARD_PAD;
        const usable=(pad.mapping==="standard" || custom) &&
          profile.axisX<pad.axes.length && profile.axisY<pad.axes.length &&
          PAD_ACTIONS.every(a=>profile.buttons[a]<pad.buttons.length);
        infos.push({side,index:pad.index,id:pad.id,family:padFamily(pad.id),usable,custom});
        const current=pad.buttons.map((_,n)=>pressed(pad,n));
        const stick=padStick((pad.axes[profile.axisX]??0)*(profile.invertX?-1:1),(pad.axes[profile.axisY]??0)*(profile.invertY?-1:1),sensitivity);
        const tag=context+":"+mode;
        if(slot.context!==tag) { slot.context=tag;slot.armed=false;slot.direction=""; }
        if(!usable || context==="blocked") { slot.previous=current;slot.armed=false;continue; }
        if(!slot.armed) {
          slot.armed=!PAD_ACTIONS.some(a=>current[profile.buttons[a]]) && Math.hypot(stick.x,stick.y)<.05;
          slot.previous=current;continue;
        }
        const down=(action: PadAction)=>current[profile.buttons[action]] && !slot.previous[profile.buttons[action]];
        const up=(action: PadAction)=>!current[profile.buttons[action]] && slot.previous[profile.buttons[action]];
        const emit=(action: PadEvent["action"])=>events.push({side,action});
        if(down("pause")) emit("pause");
        if(context==="menu") {
          if(down("pass"))emit("confirm");if(down("shoot"))emit("back");
          // D-pad standard indices are used only when the browser reports a standard mapping.
          const dpad=pad.mapping==="standard";
          const x=stick.x+(dpad?(Number(current[15]??false)-Number(current[14]??false)):0);
          const y=stick.y+(dpad?(Number(current[13]??false)-Number(current[12]??false)):0);
          const direction=Math.abs(y)>.5?(y>0?"down":"up"):Math.abs(x)>.5?(x>0?"right":"left"):"";
          if(direction && (direction!==slot.direction || now>=slot.repeat)) {
            emit(direction as PadEvent["action"]);slot.repeat=now+(direction!==slot.direction?400:160);
          }
          slot.direction=direction;
        } else if(i===0 || mode==="local2p") {
          inputs[side]={...stick,sprint:current[profile.buttons.sprint]??false,shield:current[profile.buttons.steal]??false};
          if(pad.mapping==="standard" && Math.hypot(stick.x,stick.y)<.05) {
            const dpad=padStick(Number(current[15]??false)-Number(current[14]??false),Number(current[13]??false)-Number(current[12]??false));
            inputs[side].x=dpad.x;inputs[side].y=dpad.y;
          }
          for(const action of ["pass","through","slide","steal","switch"] as const) if(down(action)) {
            if(inputs[side].shield && action==='pass')emit('rainbow');
            else if(inputs[side].shield && action==='through')emit('bicycle');
            else if(inputs[side].shield && action==='slide')emit('feint');
            else if(inputs[side].sprint && action==='pass')emit('oneTwo');
            else if(inputs[side].sprint && action==='through')emit('crossHigh');
            else if(inputs[side].sprint && action==='slide')emit('crossLow');
            else emit(action);
          }
          if(down("shoot"))emit("shootStart");if(up("shoot"))emit("shootRelease");
        }
        slot.previous=current;
      }
      return { inputs,events,infos,disconnected };
    },
  };
}

export const CALIBRATION_STEPS = ["Mova o analógico esquerdo para a DIREITA", "Mova o analógico esquerdo para BAIXO",
  "Pressione o botão de PASSE", "Pressione o botão de CHUTE", "Pressione o botão de ENFIADA", "Pressione o botão de CARRINHO",
  "Pressione o botão de BOTE", "Pressione o botão de TROCAR JOGADOR", "Pressione o gatilho de CORRER", "Pressione o botão de PAUSA"];
export type PadCalibration = { index:number; id:string; step:number; neutral:boolean; profile:PadProfile; error:string; baseline:number[] | null };
export function beginPadCalibration(info: PadInfo): PadCalibration {
  return {index:info.index,id:info.id,step:0,neutral:true,profile:{...STANDARD_PAD,buttons:{...STANDARD_PAD.buttons}},error:"",baseline:null};
}
export function advancePadCalibration(session: PadCalibration, pad: PadSample): PadCalibration {
  if(session.id!==pad.id || session.index!==pad.index || session.step>=CALIBRATION_STEPS.length)return session;
  if(!session.baseline)return {...session,baseline:[...pad.axes]};
  const held=pad.buttons.findIndex((_,i)=>pressed(pad,i));
  const axis=pad.axes.findIndex((value,index)=>Math.abs(value-(session.baseline?.[index]??0))>.65 && (session.step!==1 || index!==session.profile.axisX));
  if(session.neutral) {
    if(held<0 && (session.step>1 || !pad.axes.some((n,i)=>Math.abs(n-(session.baseline?.[i]??0))>.3)))return {...session,neutral:false};
    return session;
  }
  if(session.step<2) {
    if(axis<0)return session;
    const profile={...session.profile};
    if(session.step===0) { profile.axisX=axis;profile.invertX=pad.axes[axis]<0; }
    else { profile.axisY=axis;profile.invertY=pad.axes[axis]<0; }
    return {...session,profile,step:session.step+1,neutral:true,error:""};
  }
  if(held<0)return session;
  const action=PAD_ACTIONS[session.step-2];
  if(PAD_ACTIONS.slice(0,session.step-2).some(a=>session.profile.buttons[a]===held))
    return {...session,neutral:true,error:"Esse botão já foi usado. Escolha outro."};
  return {...session,step:session.step+1,neutral:true,error:"",profile:{...session.profile,buttons:{...session.profile.buttons,[action]:held}}};
}

/** Explicit fallback for raw Sony HID layouts; calibration remains available for adapters. */
export function sonyPadPreset(raw=false):PadProfile{return {axisX:0,axisY:1,invertX:false,invertY:false,buttons:raw?{pass:1,shoot:2,through:3,slide:0,steal:6,switch:4,sprint:7,pause:9}:{...STANDARD_PAD.buttons}};}
