import * as THREE from 'three';
import { athleteMaterials,athleteFabricMaterial,hairCards } from './football-materials.ts';
import { createLocomotion,type Locomotion } from './football-animation.ts';
import { createRiggedBody,type AthleteBuild } from './football-rig.ts';
import type { Player,Team,PlayerLook } from './football-engine.ts';
const standard=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.86});
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const hairStyles:PlayerLook['style'][]=['short','fade','curly','short','afro','mohawk','long','dreads'];
const beardStyles:NonNullable<PlayerLook['beard']>[]=['none','stubble','none','goatee','none','mustache','stubble','full'];
const skinPalette=['#e1ad87','#c88963','#a96f4d','#815338','#68422f','#d09b76'];
const hairPalette=['#161313','#2d211b','#4a3023','#181818','#6b4930'];

function athleteVisualLook(p:Player):PlayerLook{
  const variation=((Math.imul(p.id+17,2654435761)>>>0)%1000)/999;
  const roleHeight=p.role==='GK'?190:p.role==='DF'?184:p.role==='MF'?179:181;
  const roleWeight=p.role==='GK'?82:p.role==='DF'?80:p.role==='MF'?72:74;
  const generated:PlayerLook={
    skin:skinPalette[(p.id*7)%skinPalette.length],
    hair:hairPalette[(p.id*5+1)%hairPalette.length],
    style:hairStyles[(p.id*3+1)%hairStyles.length],
    height:clamp(roleHeight+(variation-.5)*12,168,201),
    weight:clamp(roleWeight+(p.strength-70)*.16+((p.id%5)-2)*1.6,60,104),
    celebration:(['wings','jump','point'] as const)[p.id%3],
    eyes:.9+((p.id*11)%7)*.035,
    eyeSize:.9+((p.id*13)%7)*.03,
    nose:.86+((p.id*17)%9)*.035,
    mouth:.88+((p.id*19)%8)*.035,
    jaw:.88+((p.id*23)%9)*.035,
    beard:beardStyles[(p.id*5)%beardStyles.length],
    boots:['#f2f3ef','#15181c','#e8d445','#d3e7ff','#ed6c42'][p.id%5],
    socks:p.id%4===0?'low':'high',
    tucked:p.id%5!==0,
  };
  return {...generated,...p.appearance};
}

function athleteBuild(p:Player,look:PlayerLook):Partial<AthleteBuild>{
  const power=clamp((p.strength-65)/35,-.25,1);
  const pace=clamp((p.pace-68)/32,-.25,1);
  const weight=look.weight??74;
  const mass=clamp((weight-72)/32,-.3,1);
  const roleShoulder=p.role==='GK'?.045:p.role==='DF'?.055:p.role==='FW'?.005:-.01;
  return {
    shoulders:clamp(1+roleShoulder+power*.065+mass*.035,.9,1.16),
    chest:clamp(1+power*.055+mass*.045,.91,1.16),
    waist:clamp(.98+mass*.065-power*.015,.91,1.10),
    hips:clamp(.98+mass*.055,.92,1.10),
    thigh:clamp(.98+power*.05+pace*.025,.92,1.12),
    calf:clamp(.98+pace*.04+power*.025,.92,1.10),
    arm:clamp(.98+power*.065+mass*.02,.91,1.12),
    head:clamp(.96+((p.id%7)-3)*.012,.92,1.04),
    depth:clamp(.98+mass*.055+power*.02,.92,1.11),
  };
}
function canvasTexture(
  size: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  paint(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function kitTexture(team: Team, player: Player) {
  return canvasTexture(512, (ctx) => {
    ctx.scale(2,2);
    const gk = player.role === "GK";
    ctx.fillStyle = gk
      ? player.side === "home"
        ? "#b0e049"
        : "#e9943e"
      : team.primary;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = team.secondary;
    if (!gk) {
      if (team.kitPattern === "vertical")
        for (let x = 0; x < 256; x += 64) ctx.fillRect(x, 0, 32, 256);
      if (team.kitPattern === "horizontal")
        for (let y = 0; y < 256; y += 64) ctx.fillRect(0, y, 256, 32);
      if (team.kitPattern === "center-stripe") ctx.fillRect(92, 0, 72, 256);
      if (team.kitPattern === "chest-band") ctx.fillRect(0, 90, 256, 48);
      if (team.kitPattern === "sash") {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(60, 0);
        ctx.lineTo(256, 196);
        ctx.lineTo(256, 256);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,.07)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 256; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(91,62,34,.18)";
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      ctx.ellipse(
        (i * 67) % 256,
        195 + (i % 5) * 10,
        7 + (i % 4),
        2 + (i % 3),
        0.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = team.primary.toLowerCase().startsWith("#f")
      ? "#16252a"
      : "#fff";
    ctx.font = "bold 108px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,.45)";
    ctx.lineWidth = 3;
    ctx.strokeText(String(player.number), 128, 135);
    ctx.fillText(String(player.number), 128, 135);
  });
}

export type Athlete = {
  face: THREE.Mesh;
  torso: THREE.Mesh;
  restCloth: Float32Array;
  skin: THREE.MeshPhysicalMaterial;
  shirt: THREE.MeshPhysicalMaterial;
  hairCards: THREE.Group;
  identity: string;
  root: THREE.Group;
  body: THREE.Group;
  legs: THREE.Bone[];
  knees: THREE.Bone[];
  arms: THREE.Bone[];
  ring: THREE.Mesh;
  label: THREE.Sprite;
  motion: Locomotion;
  elbows: THREE.Bone[];
  feet: THREE.Bone[];
  head: THREE.Bone;
  detailObjects: THREE.Object3D[];
  essentialObjects: THREE.Object3D[];
  fineObjects: THREE.Object3D[];
};

export function createFootballAthlete(p: Player, team: Team): Athlete {
    const root = new THREE.Group();
    const look=athleteVisualLook(p);
    const build=athleteBuild(p,look);
    const {skin,shirt}=athleteMaterials(look.skin,kitTexture(team,p),p.id);
    const shorts=athleteFabricMaterial(p.role === 'GK' ? '#243d28' : team.shorts,p.id+11,12);
    const socks=athleteFabricMaterial(p.role === 'GK' ? '#abc949' : team.socks,p.id+29,14);
    const rig = createRiggedBody([skin, shirt, shorts, socks, standard(look.boots ?? '#e5e8de')],
      look.socks === 'low', look.tucked !== false, build);
    const {root:body,mesh:torso,head:headGroup,legs,knees,feet,arms,elbows}=rig;
    root.add(body);
    const detailObjects: THREE.Object3D[]=[];
    const essentialObjects: THREE.Object3D[]=[];
    const fineObjects: THREE.Object3D[]=[];
    const head=torso;
    const vertices=torso.geometry.getAttribute('position');
    const crestMap=new THREE.TextureLoader().load(`/crests/${team.id}.png`,undefined,undefined,()=>{crest.visible=false;});crestMap.colorSpace=THREE.SRGBColorSpace;
    const crest=new THREE.Mesh(new THREE.PlaneGeometry(.12,.14),new THREE.MeshStandardMaterial({map:crestMap,transparent:true,alphaTest:.1,roughness:.85,depthWrite:false}));crest.position.set(-.13,1.99,.19);body.add(crest);
    const hairStyle=look.style;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(1,28,18,0,Math.PI*2,0,Math.PI*.5),
      standard(look.hair));
    hair.position.y=hairStyle==='afro'?.075:hairStyle==='long'?.03:.045;
    hair.scale.set(
      hairStyle==='mohawk'?.06:hairStyle==='afro'?.215:hairStyle==='fade'?.169:.171,
      hairStyle==='mohawk'?.27:hairStyle==='afro'?.235:hairStyle==='fade'?.135:.192,
      hairStyle==='afro'?.205:.17
    );
    hair.visible=hairStyle!=='bald'&&hairStyle!=='dreads';headGroup.add(hair);
    const cards=hairCards(look.hair,hairStyle,p.id);cards.scale.set(.85,.82,.85);headGroup.add(cards);
    const mouth=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),standard('#8d5144'));mouth.name='mouth';mouth.scale.set(.045,.009,.008);mouth.position.set(0,-.105,.147);headGroup.add(mouth);detailObjects.push(mouth);essentialObjects.push(mouth);
    const lipLine=new THREE.Mesh(new THREE.BoxGeometry(.065,.003,.006),new THREE.MeshBasicMaterial({color:'#4b2925'}));
    lipLine.position.set(0,-.105,.155);headGroup.add(lipLine);detailObjects.push(lipLine);fineObjects.push(lipLine);
    const beardStyle=look.beard??'none';
    if(beardStyle==='stubble'||beardStyle==='full'){
      const beard=new THREE.Mesh(new THREE.SphereGeometry(1,24,16,0,Math.PI*2,Math.PI*.35,Math.PI*.6),new THREE.MeshStandardMaterial({color:look.hair,roughness:1,transparent:true,opacity:beardStyle==='stubble'?.28:.88}));
      beard.scale.set(.132,.13,.145);beard.position.set(0,-.09,.016);headGroup.add(beard);detailObjects.push(beard);essentialObjects.push(beard);
    } else if(beardStyle==='goatee'){
      const goatee=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),standard(look.hair));
      goatee.scale.set(.04,.055,.02);goatee.position.set(0,-.145,.145);headGroup.add(goatee);detailObjects.push(goatee);fineObjects.push(goatee);
    } else if(beardStyle==='mustache'){
      for(const side of [-1,1]){
        const mustache=new THREE.Mesh(new THREE.BoxGeometry(.045,.012,.012),standard(look.hair));
        mustache.position.set(side*.021,-.082,.158);mustache.rotation.z=side*.12;headGroup.add(mustache);detailObjects.push(mustache);fineObjects.push(mustache);
      }
    }
    const faceSkin=new THREE.MeshStandardMaterial({color:skin.color.clone(),roughness:.72});
    const irisColor=['#4a3427','#2f4b3b','#334e68','#553a2b'][p.id%4];
    const noseTip=new THREE.Mesh(new THREE.SphereGeometry(.022,14,10),faceSkin);
    noseTip.name='nose';noseTip.scale.set(.75,1,.72);noseTip.position.set(0,-.027,.173);headGroup.add(noseTip);detailObjects.push(noseTip);essentialObjects.push(noseTip);
    for(const side of [-1,1]){
      const nostril=new THREE.Mesh(new THREE.SphereGeometry(.0038,8,6),new THREE.MeshBasicMaterial({color:'#3b2420'}));
      nostril.position.set(side*.007,-.032,.188);headGroup.add(nostril);detailObjects.push(nostril);fineObjects.push(nostril);
    }
    for(const side of [-1,1]) {
      const eye = new THREE.Group();eye.name='eye-'+side;eye.position.set(side*.063,.035,.16);headGroup.add(eye);detailObjects.push(eye);essentialObjects.push(eye);
      const sclera=new THREE.Mesh(new THREE.SphereGeometry(.018,14,10),new THREE.MeshStandardMaterial({color:'#ece7df',roughness:.38}));
      sclera.scale.set(1,.72,.62);eye.add(sclera);
      const iris=new THREE.Mesh(new THREE.CircleGeometry(.0075,14),new THREE.MeshStandardMaterial({color:irisColor,roughness:.42}));
      iris.position.z=.012;eye.add(iris);
      const pupil=new THREE.Mesh(new THREE.CircleGeometry(.0035,12),new THREE.MeshBasicMaterial({color:'#090908'}));
      pupil.position.z=.013;eye.add(pupil);fineObjects.push(iris,pupil);
      const brow=new THREE.Mesh(new THREE.BoxGeometry(.058,.009,.009),standard(look.hair));
      brow.position.set(side*.063,.077,.157);brow.rotation.z=-side*.1;headGroup.add(brow);detailObjects.push(brow);fineObjects.push(brow);
      const ear=new THREE.Mesh(new THREE.SphereGeometry(.027,12,8),faceSkin);
      ear.scale.set(.55,1,.5);ear.position.set(side*.158,.015,.012);headGroup.add(ear);detailObjects.push(ear);essentialObjects.push(ear);
      const hand=new THREE.Mesh(new THREE.SphereGeometry(.058,14,10),faceSkin);
      hand.scale.set(.8,1.08,.7);hand.position.set(0,-.39,.015);elbows[side===-1?0:1].add(hand);detailObjects.push(hand);essentialObjects.push(hand);
      for(let finger=0;finger<4;finger++){
        const digit=new THREE.Mesh(new THREE.BoxGeometry(.011,.055,.014),faceSkin);
        digit.position.set((finger-1.5)*.014,-.055,.008+(finger===0||finger===3?-.004:0));
        digit.rotation.z=(finger-1.5)*.025;hand.add(digit);detailObjects.push(digit);fineObjects.push(digit);
      }
      if(look.wristband){
        const band = new THREE.Mesh(new THREE.TorusGeometry(.059,.012,8,20),standard('#f2efe7'));
        band.rotation.x=Math.PI/2;band.position.set(side*.064,-.31,.009);elbows[side===-1?0:1].add(band);detailObjects.push(band);essentialObjects.push(band);
      }
    }
    const collar=new THREE.Mesh(new THREE.TorusGeometry(.145,.014,8,24),new THREE.MeshStandardMaterial({color:p.role==='GK'?'#dce7d3':team.secondary,roughness:.86}));
    collar.rotation.x=Math.PI/2;collar.position.set(0,2.17,.018);body.add(collar);detailObjects.push(collar);essentialObjects.push(collar);
    for(let limb=0;limb<2;limb++){
      const cuff=new THREE.Mesh(new THREE.TorusGeometry(.072,.006,7,18),new THREE.MeshStandardMaterial({color:p.role==='GK'?'#dce7d3':team.secondary,roughness:.9}));
      cuff.rotation.x=Math.PI/2;cuff.position.set(0,-.13,0);arms[limb].add(cuff);detailObjects.push(cuff);fineObjects.push(cuff);
    }
    const bootMat=new THREE.MeshPhysicalMaterial({color:look.boots??'#e5e8de',roughness:.48,clearcoat:.18,clearcoatRoughness:.62});
    const soleMat=new THREE.MeshStandardMaterial({color:'#16191b',roughness:.72});
    for(let limb=0;limb<2;limb++){
      const boot=new THREE.Group();
      const upper=new THREE.Mesh(new THREE.BoxGeometry(.17,.095,.34),bootMat);
      upper.position.set(0,-.035,.085);upper.rotation.x=-.08;boot.add(upper);
      const toe=new THREE.Mesh(new THREE.SphereGeometry(.09,16,10),bootMat);
      toe.scale.set(.92,.52,1.2);toe.position.set(0,-.04,.235);boot.add(toe);
      const heel=new THREE.Mesh(new THREE.BoxGeometry(.175,.105,.08),bootMat);
      heel.position.set(0,-.03,-.10);boot.add(heel);
      const sole=new THREE.Mesh(new THREE.BoxGeometry(.185,.028,.38),soleMat);
      sole.position.set(0,-.09,.085);boot.add(sole);
      for(const x of [-.055,.055])for(const z of [-.02,.09,.20]){
        const stud=new THREE.Mesh(new THREE.CylinderGeometry(.012,.017,.035,7),soleMat);
        stud.position.set(x,-.12,z);boot.add(stud);detailObjects.push(stud);fineObjects.push(stud);
      }
      for(let lace=0;lace<4;lace++){
        const strip=new THREE.Mesh(new THREE.BoxGeometry(.105,.006,.009),new THREE.MeshStandardMaterial({color:'#f1f1ed',roughness:.7}));
        strip.position.set(0,.015,.025+lace*.038);strip.rotation.x=-.12;boot.add(strip);detailObjects.push(strip);fineObjects.push(strip);
      }
      feet[limb].add(boot);detailObjects.push(boot);essentialObjects.push(boot);
    }
    body.traverse(object => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    root.scale.setScalar(1.28);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 0.94, 40),
      new THREE.MeshBasicMaterial({
        color: p.side === "home" ? "#dcffa5" : "#84dfff",
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    root.add(ring);
    const labelMap = canvasTexture(256, (ctx) => {
      ctx.shadowColor = "rgba(0,0,0,.75)";
      ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 24px Arial";
      ctx.fillText(p.name.toUpperCase().slice(0, 19), 128, 129);
    });
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelMap, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    label.scale.set(3, 3, 1);
    label.position.y = 3.15;
    root.add(label);
    const avatar={face:head,torso,restCloth:new Float32Array(vertices.array),skin,shirt,hairCards:cards,identity:p.squadId,root,body,legs,knees,feet,arms,elbows,head:headGroup,ring,label,motion:createLocomotion(p),detailObjects,essentialObjects,fineObjects};
    updateAthleteShape(avatar,look);return avatar;
  }

export function updateAthleteShape(a:Athlete,look?:PlayerLook){
 a.body.scale.set((look?.height??180)/180*(.94+((look?.weight??75)-55)/333),(look?.height??180)/180,(look?.height??180)/180*(.94+((look?.weight??75)-55)/333));
 const nose=a.head.getObjectByName('nose');if(nose)nose.scale.set(.55*(look?.nose??1),1,look?.nose??1);
 for(const side of [-1,1]){const eye=a.head.getObjectByName('eye-'+side);if(eye){eye.position.x=side*.063*(look?.eyes??1);eye.scale.setScalar(look?.eyeSize??1);}}
 const mouth=a.head.getObjectByName('mouth');if(mouth)mouth.scale.x=.045*(look?.mouth??1);
 const keys=['jaw','nose','mouth','eyes','eyeSize'] as const;
 keys.forEach((key,i)=>{if(a.face.morphTargetInfluences)a.face.morphTargetInfluences[a.face.morphTargetDictionary?.[key]??i]=(look?.[key]??1)-1;});
}
export function updateAthleteCloth(a:Athlete,p:Player,time:number){
 // Deform only the shirt hem in bind space; never distort skin, joints or boots.
 const position=a.torso.geometry.getAttribute('position');
 const response=Math.min(1,Math.hypot(p.vx,p.vy)/18);
 for(let i=0;i<position.count;i++){
   const x=a.restCloth[i*3],y=a.restCloth[i*3+1],z=a.restCloth[i*3+2];
   if(y<1.48||y>1.70||Math.abs(x)>.33)continue;
   const envelope=Math.sin((y-1.48)/.22*Math.PI);
   position.setZ(i,z+Math.sin(time*5+x*12)*envelope*response*.006);
 }
 position.needsUpdate=true;
}
export function disposeAthlete(root:THREE.Object3D){
 const textures=new Set<THREE.Texture>(),materials=new Set<THREE.Material>(),geometries=new Set<THREE.BufferGeometry>();
 root.traverse(o=>{if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose();const m=o as THREE.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material]){materials.add(mat);for(const v of Object.values(mat))if(v instanceof THREE.Texture)textures.add(v);}});
 textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
}
