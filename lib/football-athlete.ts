import * as THREE from 'three';
import { athleteMaterials,hairCards } from './football-materials.ts';
import { createLocomotion,type Locomotion } from './football-animation.ts';
import { createRiggedBody } from './football-rig.ts';
import type { Player,Team,PlayerLook } from './football-engine.ts';
const standard=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.86});
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
  head: THREE.Bone;
};

export function createFootballAthlete(p: Player, team: Team): Athlete {
    const root = new THREE.Group();
    const {skin,shirt}=athleteMaterials(p.appearance?.skin ?? ["#d9a47e", "#ac7551", "#774e35", "#bf8b66"][p.id%4],kitTexture(team,p),p.id);
    const rig = createRiggedBody([skin, shirt, standard(p.role === 'GK' ? '#243d28' : team.shorts),
      standard(p.role === 'GK' ? '#abc949' : team.socks), standard(p.appearance?.boots ?? '#e5e8de')],
      p.appearance?.socks === 'low', p.appearance?.tucked !== false);
    const {root:body,mesh:torso,head:headGroup,legs,knees,arms,elbows}=rig;
    root.add(body);
    const head=torso;
    const vertices=torso.geometry.getAttribute('position');
    const crestMap=new THREE.TextureLoader().load(`/crests/${team.id}.png`,undefined,undefined,()=>{crest.visible=false;});crestMap.colorSpace=THREE.SRGBColorSpace;
    const crest=new THREE.Mesh(new THREE.PlaneGeometry(.12,.14),new THREE.MeshStandardMaterial({map:crestMap,transparent:true,alphaTest:.1,roughness:.85,depthWrite:false}));crest.position.set(-.13,1.99,.19);body.add(crest);
    const hairStyle=p.appearance?.style??'short';
    const hair = new THREE.Mesh(new THREE.SphereGeometry(1,28,18,0,Math.PI*2,0,Math.PI*.5),
      standard(p.appearance?.hair ?? '#251b17'));
    hair.position.y=hairStyle==='afro'?.075:hairStyle==='long'?.03:.045;
    hair.scale.set(
      hairStyle==='mohawk'?.06:hairStyle==='afro'?.215:hairStyle==='fade'?.169:.171,
      hairStyle==='mohawk'?.27:hairStyle==='afro'?.235:hairStyle==='fade'?.135:.192,
      hairStyle==='afro'?.205:.17
    );
    hair.visible=hairStyle!=='bald'&&hairStyle!=='dreads';headGroup.add(hair);
    const cards=hairCards(p.appearance?.hair??'#251b17',hairStyle,p.id);cards.scale.set(.85,.82,.85);headGroup.add(cards);
    const mouth=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),standard('#8d5144'));mouth.name='mouth';mouth.scale.set(.045,.009,.008);mouth.position.set(0,-.105,.147);headGroup.add(mouth);
    const beardStyle=p.appearance?.beard??'none';
    if(beardStyle==='stubble'||beardStyle==='full'){
      const beard=new THREE.Mesh(new THREE.SphereGeometry(1,24,16,0,Math.PI*2,Math.PI*.35,Math.PI*.6),new THREE.MeshStandardMaterial({color:p.appearance?.hair??'#251b17',roughness:1,transparent:true,opacity:beardStyle==='stubble'?.28:.88}));
      beard.scale.set(.132,.13,.145);beard.position.set(0,-.09,.016);headGroup.add(beard);
    } else if(beardStyle==='goatee'){
      const goatee=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),standard(p.appearance?.hair??'#251b17'));
      goatee.scale.set(.04,.055,.02);goatee.position.set(0,-.145,.145);headGroup.add(goatee);
    } else if(beardStyle==='mustache'){
      for(const side of [-1,1]){
        const mustache=new THREE.Mesh(new THREE.BoxGeometry(.045,.012,.012),standard(p.appearance?.hair??'#251b17'));
        mustache.position.set(side*.021,-.082,.158);mustache.rotation.z=side*.12;headGroup.add(mustache);
      }
    }
    const faceSkin=new THREE.MeshStandardMaterial({color:skin.color.clone(),roughness:.72});
    const irisColor=['#4a3427','#2f4b3b','#334e68','#553a2b'][p.id%4];
    const noseTip=new THREE.Mesh(new THREE.SphereGeometry(.022,14,10),faceSkin);
    noseTip.scale.set(.75,1,.72);noseTip.position.set(0,-.027,.173);headGroup.add(noseTip);
    for(const side of [-1,1]) {
      const eye = new THREE.Group();eye.name='eye-'+side;eye.position.set(side*.063,.035,.16);headGroup.add(eye);
      const sclera=new THREE.Mesh(new THREE.SphereGeometry(.018,14,10),new THREE.MeshStandardMaterial({color:'#ece7df',roughness:.38}));
      sclera.scale.set(1,.72,.62);eye.add(sclera);
      const iris=new THREE.Mesh(new THREE.CircleGeometry(.0075,14),new THREE.MeshStandardMaterial({color:irisColor,roughness:.42}));
      iris.position.z=.012;eye.add(iris);
      const pupil=new THREE.Mesh(new THREE.CircleGeometry(.0035,12),new THREE.MeshBasicMaterial({color:'#090908'}));
      pupil.position.z=.013;eye.add(pupil);
      const brow=new THREE.Mesh(new THREE.BoxGeometry(.058,.009,.009),standard(p.appearance?.hair??'#251b17'));
      brow.position.set(side*.063,.077,.157);brow.rotation.z=-side*.1;headGroup.add(brow);
      const ear=new THREE.Mesh(new THREE.SphereGeometry(.027,12,8),faceSkin);
      ear.scale.set(.55,1,.5);ear.position.set(side*.158,.015,.012);headGroup.add(ear);
      if(p.appearance?.wristband){
        const band = new THREE.Mesh(new THREE.TorusGeometry(.059,.012,8,20),standard('#f2efe7'));
        band.rotation.x=Math.PI/2;band.position.set(side*.064,-.31,.009);elbows[side===-1?0:1].add(band);
      }
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
    const avatar={face:head,torso,restCloth:new Float32Array(vertices.array),skin,shirt,hairCards:cards,identity:p.squadId,root,body,legs,knees,arms,elbows,head:headGroup,ring,label,motion:createLocomotion(p)};
    updateAthleteShape(avatar,p.appearance);return avatar;
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
