import * as THREE from 'three';
import { athleteMaterials,hairCards } from './football-materials.ts';
import { createLocomotion,type Locomotion } from './football-animation.ts';
import { humanSurface, faceMorphGeometry } from './football-human-geometry.ts';
import type { Player,Team,PlayerLook } from './football-engine.ts';
const standard=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.86});
function box(w:number,h:number,d:number,x:number,y:number,z:number,color:string,parent:THREE.Object3D){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),standard(color));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
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
  legs: THREE.Group[];
  knees: THREE.Group[];
  arms: THREE.Group[];
  ring: THREE.Mesh;
  label: THREE.Sprite;
  motion: Locomotion;
  elbows: THREE.Group[];
  head: THREE.Group;
};

export function createFootballAthlete(p: Player, team: Team): Athlete {
    const root = new THREE.Group(),
      body = new THREE.Group();
    root.add(body);

    const {skin,shirt}=athleteMaterials(p.appearance?.skin ?? ["#d9a47e", "#ac7551", "#774e35", "#bf8b66"][p.id%4],kitTexture(team,p),p.id);
    const torso = new THREE.Mesh(
      humanSurface([[-.45,.28,.21],[-.34,.29,.22],[-.15,.29,.23],[.05,.35,.25],[.23,.39,.23],[.33,.36,.19],[.43,.17,.13]],32),
      shirt,
    );
    const vertices=torso.geometry.getAttribute('position');
    for(let i=0;i<vertices.count;i++){const y=vertices.getY(i),x=vertices.getX(i),z=vertices.getZ(i);const crease=1+Math.sin(y*28+x*13)*.015;vertices.setXYZ(i,x*crease,y,z*crease);}torso.geometry.computeVertexNormals();
    torso.scale.z = 1;
    torso.position.y = p.appearance?.tucked===false?1.70:1.75;torso.scale.y=p.appearance?.tucked===false?1.12:1;
    body.add(torso);
    torso.castShadow = true;
    const crestMap=new THREE.TextureLoader().load(`/crests/${team.id}.png`,undefined,undefined,()=>{crest.visible=false;});crestMap.colorSpace=THREE.SRGBColorSpace;
    const crest=new THREE.Mesh(new THREE.PlaneGeometry(.16,.19),new THREE.MeshStandardMaterial({map:crestMap,transparent:true,alphaTest:.1,roughness:.85,depthWrite:false}));crest.position.set(-.16,1.94,.25);body.add(crest);
    const pelvis=new THREE.Mesh(new THREE.SphereGeometry(.3,24,16),standard(team.shorts));pelvis.scale.set(1.04,.6,.75);pelvis.position.y=1.27;body.add(pelvis);
    const headGroup = new THREE.Group(); headGroup.position.y = 2.48; body.add(headGroup);
    const head = new THREE.Mesh(faceMorphGeometry(), skin);
    head.scale.set(1,1,1); headGroup.add(head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.12,.13,.2,12),skin);
    neck.position.y=-.3; headGroup.add(neck);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.258,18,12,0,Math.PI*2,0,Math.PI*.48),
      standard(p.appearance?.hair ?? ["#251b17","#3e2a1d","#171719","#60452d"][p.id%4]));
    hair.position.y=.04;hair.scale.set(p.appearance?.style==='mohawk'?.28:.9,p.appearance?.style==='mohawk'?1.5:1.05,.96);hair.visible=p.appearance?.style!=='bald';headGroup.add(hair);
    const cards=hairCards(p.appearance?.hair??'#251b17',p.appearance?.style??'short',p.id);headGroup.add(cards);

    const mouth=new THREE.Mesh(new THREE.CapsuleGeometry(.012,.075,4,12),standard('#8d5144'));mouth.name='mouth';mouth.rotation.z=Math.PI/2;mouth.position.set(0,-.13,.215);headGroup.add(mouth);
    if(p.appearance?.beard&&p.appearance.beard!=='none'){const beard=new THREE.Mesh(new THREE.SphereGeometry(.18,20,12,0,Math.PI*2,Math.PI*.35,Math.PI*.6),new THREE.MeshStandardMaterial({color:p.appearance.hair,roughness:1,transparent:true,opacity:p.appearance.beard==='stubble'?.38:1}));beard.scale.set(1,.8,.96);beard.position.set(0,-.1,.055);headGroup.add(beard);}
    body.scale.setScalar((p.appearance?.height??180)/180);
    const nose = new THREE.Mesh(humanSurface([[-.06,.017,.018],[0,.027,.055],[.06,.018,.014]],20),skin);
    nose.name='nose';nose.position.set(0,-.01,.235);nose.scale.set(.55*(p.appearance?.nose??1),1,(p.appearance?.nose??1));headGroup.add(nose);
    for(const side of [-1,1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(.058,8,6),skin);
      ear.position.set(side*.23,0,0);ear.scale.set(.7,1,.55);headGroup.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.023,8,6),standard("#211c1b"));
      eye.name='eye-'+side;eye.scale.setScalar(p.appearance?.eyeSize??1);eye.position.set(side*.085*(p.appearance?.eyes??1),.055,.211);headGroup.add(eye);
    }
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.16,.035,8,20), standard(team.secondary));
    collar.rotation.x=Math.PI/2;collar.position.y=2.18;body.add(collar);
    const legs: THREE.Group[] = [],
      knees: THREE.Group[] = [],
      arms: THREE.Group[] = [],
      elbows: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.19, 1.13, 0);
      body.add(leg);
      legs.push(leg);
      const thigh = new THREE.Mesh(
        humanSurface([[-.39,.135,.13],[-.2,.17,.155],[0,.165,.15],[.13,.145,.125]],24),
        standard(p.role === "GK" ? "#243d28" : team.shorts),
      );
      thigh.position.y = -0.15;
      leg.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.48;
      leg.add(knee);
      knees.push(knee);
      const shin = new THREE.Mesh(
        humanSurface([[-.43,.073,.075],[-.25,.095,.1],[-.06,.11,.11],[.06,.092,.09]],24),
        standard(p.role === "GK" ? "#abc949" : team.socks),
      );
      if(p.appearance?.socks==='low'){shin.scale.y=.6;shin.position.y=-.32;const calf=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.19,6,12),skin);calf.position.y=-.07;knee.add(calf);}else shin.position.y = -0.22;
      knee.add(shin);
      const boot=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.22,5,12),standard(p.appearance?.boots??(p.id%3 ? "#dce2d4" : "#eab063")));
      boot.rotation.x=Math.PI/2;boot.position.set(0,-.49,.1);knee.add(boot);
      box(.14,.025,.045,0,-.41,.11,"#344a54",knee);
      const arm = new THREE.Group();
      arm.position.set(side * 0.43, 2.05, 0);
      body.add(arm);
      arms.push(arm);
      const sleeve = new THREE.Mesh(
        humanSurface([[-.24,.11,.105],[-.08,.13,.12],[.1,.135,.12]],24),
        standard(p.role==="GK" ? (p.side==="home"?"#b0e049":"#e9943e") : team.kitPattern==="white-sleeves" ? team.secondary : team.primary),
      );
      sleeve.position.y = -0.12;
      arm.add(sleeve);
      const elbow = new THREE.Group(); elbow.position.y = -.29; arm.add(elbow); elbows.push(elbow);
      const forearm = new THREE.Mesh(
        humanSurface([[-.31,.065,.064],[-.2,.078,.075],[-.04,.095,.09],[.05,.092,.085]],24),
        skin,
      );
      forearm.position.set(0, -.1, 0);
      elbow.add(forearm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),skin); hand.position.set(0,-.4,0); hand.scale.set(.75,1,.65); elbow.add(hand);
      if(p.appearance?.wristband){const band=new THREE.Mesh(new THREE.CylinderGeometry(.098,.098,.09,16),standard('#f2efe7'));band.position.y=-.32;elbow.add(band);}
      if (p.role === "GK") box(.2,.22,.14,0,-.4,.03,"#eceddb",elbow);
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
      ctx.fillStyle = "rgba(8,19,28,.88)";
      ctx.fillRect(0, 86, 256, 70);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 24px Arial";
      ctx.fillText(p.name.toUpperCase().slice(0, 19), 128, 129);
    });
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelMap, depthTest: false }),
    );
    label.scale.set(6, 6, 1);
    label.position.y = 4.6;
    root.add(label);
    const avatar={face:head,torso,restCloth:new Float32Array(vertices.array),skin,shirt,hairCards:cards,identity:p.squadId,root,body,legs,knees,arms,elbows,head:headGroup,ring,label,motion:createLocomotion(p)};
    updateAthleteShape(avatar,p.appearance);return avatar;
  }

export function updateAthleteShape(a:Athlete,look?:PlayerLook){
 a.body.scale.set((look?.height??180)/180*(.94+((look?.weight??75)-55)/333),(look?.height??180)/180,(look?.height??180)/180*(.94+((look?.weight??75)-55)/333));
 const nose=a.head.getObjectByName('nose');if(nose)nose.scale.set(.55*(look?.nose??1),1,look?.nose??1);
 for(const side of [-1,1]){const eye=a.head.getObjectByName('eye-'+side);if(eye){eye.position.x=side*.085*(look?.eyes??1);eye.scale.setScalar(look?.eyeSize??1);}}
 const mouth=a.head.getObjectByName('mouth');if(mouth)mouth.scale.y=look?.mouth??1;
 const keys=['jaw','nose','mouth','eyes','eyeSize'] as const;
 keys.forEach((key,i)=>{if(a.face.morphTargetInfluences)a.face.morphTargetInfluences[a.face.morphTargetDictionary?.[key]??i]=(look?.[key]??1)-1;});
}
export function updateAthleteCloth(a:Athlete,p:Player,time:number){
 const offsets=(a.torso.userData.offsets??=new Float32Array(a.restCloth.length/3)) as Float32Array,velocities=(a.torso.userData.velocities??=new Float32Array(a.restCloth.length/3)) as Float32Array;
 const position=a.torso.geometry.getAttribute('position'),speed=Math.hypot(p.vx,p.vy),response=Math.min(1,speed/18);
 for(let i=0;i<position.count;i++){const x=a.restCloth[i*3],y=a.restCloth[i*3+1],z=a.restCloth[i*3+2],hem=Math.max(0,.4-y);const target=Math.sin(time*5+x*12+y*5)*hem*response*.025;velocities[i]+=(target-offsets[i])*100/60;velocities[i]*=.82;offsets[i]=Math.max(-.04,Math.min(.04,offsets[i]+velocities[i]/60));position.setXYZ(i,x,y,z+offsets[i]);}
 position.needsUpdate=true;
}
export function disposeAthlete(root:THREE.Object3D){
 const textures=new Set<THREE.Texture>(),materials=new Set<THREE.Material>(),geometries=new Set<THREE.BufferGeometry>();
 root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material]){materials.add(mat);for(const v of Object.values(mat))if(v instanceof THREE.Texture)textures.add(v);}});
 textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
}
