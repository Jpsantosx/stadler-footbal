import { CSM } from "three/addons/csm/CSM.js";
import { Sky } from "three/addons/objects/Sky.js";
import { slidePose } from './football-slide';
import { createFootballAthlete, updateAthleteCloth, type Athlete } from "./football-athlete";
import { proCameraPose } from "./football-camera";
import { TRAINING_GATES } from "./football-training";
import * as THREE from "three";
import { cameraTarget, stepCamera, broadcastCameraPose, DEFAULT_PRESENTATION, type PresentationSettings, type CameraFrame } from "./football-camera";
import { athletePose } from "./football-animation";
import { grassDetailMaps, createWearOverlay, createPostProcessing, createTitleStage } from "./football-effects";
import { celebrationPose, celebrationShot } from "./football-presentation";
import {
  setPieceTrajectory,
  clamp,
  attackDirectionFor,
  type MatchState,
  type Player,
  type Quality,
  type Team,
} from "./football-engine";

// The simulation remains independent of the GPU. Units map directly to the field.
export type StadiumRenderer = {
  render: (state: MatchState, quality: Quality, presentation?: PresentationSettings) => void;
  resize: (width: number, height: number, dpr: number) => void;
  dispose: () => void;
};

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

function pitchTexture() {
  return canvasTexture(2048, (ctx) => {
    const pixels = ctx.createImageData(2048, 2048);
    let seed = 71831;
    for (let y = 0; y < 2048; y++)
      for (let x = 0; x < 2048; x++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const grain = (seed >>> 25) / 6;
        const variation = 1.5 * Math.sin(x / 381 + Math.sin(y / 247)) + Math.sin(y / 563 + x / 891);
        // Extremely subtle mowing direction: readable as turf, never as neon bands.
        const mowing = (((Math.floor(x / 256) + Math.floor(y / 512)) & 1) ? 1 : -1) * .65;
        const i = (y * 2048 + x) * 4;
        pixels.data[i] = 36 + grain + variation + mowing;
        pixels.data[i + 1] = 84 + grain + variation + mowing * 1.4;
        pixels.data[i + 2] = 39 + grain * 0.65 + variation + mowing * .7;
        pixels.data[i + 3] = 255;
      }
    ctx.putImageData(pixels, 0, 0);
    ctx.save();
    ctx.scale(2048 / 100, 2048 / 64);
    for (const x of [4, 96]) {
      const wear = ctx.createRadialGradient(x, 32, 0, x, 32, 6);
      wear.addColorStop(0, "rgba(155,127,66,.35)");
      wear.addColorStop(1, "rgba(155,127,66,0)");
      ctx.fillStyle = wear;
      ctx.fillRect(x - 6, 26, 12, 12);
    }
    ctx.strokeStyle = "rgba(241,246,221,.93)";
    ctx.lineWidth = 0.19;
    ctx.strokeRect(0.2, 0.2, 99.6, 63.6);
    ctx.beginPath();
    ctx.moveTo(50, 0);
    ctx.lineTo(50, 64);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(50, 32, 9.15, 0, Math.PI * 2);
    ctx.stroke();
    for (const right of [false, true]) {
      const x = right ? 83 : 0;
      ctx.strokeRect(x, 15, 17, 34);
      ctx.strokeRect(right ? 94 : 0, 23, 6, 18);
      ctx.beginPath();
      ctx.arc(
        right ? 89 : 11,
        32,
        9.15,
        right ? Math.PI - 0.94 : -0.94,
        right ? Math.PI + 0.94 : 0.94,
      );
      ctx.stroke();
    }
    ctx.fillStyle = "#eef6e3";
    for (const x of [11, 50, 89]) {
      ctx.beginPath();
      ctx.arc(x, 32, 0.27, 0, Math.PI * 2);
      ctx.fill();
    }
    const corners = [
      [0, 0, 0],
      [100, 0, Math.PI / 2],
      [100, 64, Math.PI],
      [0, 64, Math.PI * 1.5],
    ];
    for (const [x, y, a] of corners) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, a, a + Math.PI / 2);
      ctx.stroke();
    }
    ctx.restore();
  });
}

export function createStadiumRenderer(
  canvas: HTMLCanvasElement,
): StadiumRenderer | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#101c28");
  scene.fog = new THREE.Fog("#16252e", 140, 285);
  const sky = new Sky();
  sky.scale.setScalar(360);
  scene.add(sky);
  const skyUniforms = sky.material.uniforms;
  skyUniforms.turbidity.value = 7;
  skyUniforms.rayleigh.value = 1.35;
  skyUniforms.mieCoefficient.value = .006;
  skyUniforms.mieDirectionalG.value = .82;
  const sunPosition = new THREE.Vector3();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, .1, 400);
  let framing: CameraFrame = { x: 50, y: 32, span: 90 };
  let cameraMode = DEFAULT_PRESENTATION.camera;
  let viewportAspect = 16 / 9;
  camera.position.set(50, 96, 103);
  camera.lookAt(50, 0, 30);
  const hemi = new THREE.HemisphereLight("#dce9ff", "#31482c", 2.25);
  scene.add(hemi);
  const csm=new CSM({camera,parent:scene,cascades:3,maxFar:190,mode:'practical',shadowMapSize:2048,shadowBias:-.0001,lightDirection:new THREE.Vector3(.5,-1,.35).normalize(),lightIntensity:1.7,lightMargin:70});csm.fade=true;
  const shadowMaterials=new WeakSet<THREE.Material>();
  const setupShadows=(root:THREE.Object3D)=>root.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.material)return;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){if(!(material instanceof THREE.MeshStandardMaterial)||shadowMaterials.has(material))continue;const custom=material.onBeforeCompile;csm.setupMaterial(material);const shadowHook=material.onBeforeCompile;material.onBeforeCompile=(shader,renderer)=>{shadowHook.call(material,shader,renderer);custom.call(material,shader,renderer);};shadowMaterials.add(material);}});
  const key = new THREE.DirectionalLight("#fff2d8", 3.1);
  key.position.set(-10, 45, -12);
  key.target.position.set(50, 0, 32);
  key.castShadow = false;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {
    left: -90,
    right: 90,
    top: 90,
    bottom: -90,
    near: 1,
    far: 220,
  });
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.05;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight("#adcfff", 1.15);
  fill.position.set(110, 45, 78);
  fill.target.position.set(50, 0, 32);
  fill.castShadow = false;
  fill.shadow.mapSize.set(2048, 2048);
  Object.assign(fill.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 220 });
  fill.shadow.bias = -0.0003;
  fill.shadow.normalBias = 0.06;
  scene.add(fill, fill.target);
  const stadiumLights = [
    [-10, 44, -12], [110, 44, -12], [-10, 44, 78], [110, 44, 78],
  ].map(([x,y,z]) => {
    const light = new THREE.SpotLight("#e6f2ff", 0, 185, Math.PI * .34, .55, 1.25);
    light.position.set(x,y,z);
    light.target.position.set(50,0,32);
    scene.add(light, light.target);
    return light;
  });
  const post = createPostProcessing(renderer, scene, camera);
  const standard = (color: string) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0 });
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: string,
    parent: THREE.Object3D = scene,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      standard(color),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const detailMaps = grassDetailMaps();
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 64),
    new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 0.94,
      normalMap: detailMaps.normal, normalScale: new THREE.Vector2(0.16, 0.16),
      aoMap: detailMaps.ao, aoMapIntensity: 0.16 }),
  );
  const updateWear = createWearOverlay(scene);
  const titleStage = createTitleStage(scene);
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(50, 0.04, 32);
  pitch.receiveShadow = true;
  scene.add(pitch);
  box(145, 0.5, 108, 50, -0.32, 32, "#29482d");
  // Terraced stands with aisles, roof supports and thousands of individual spectators.
  const crowd = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.53, 0.8, 0.5),
    standard("#829899"),
    7600,
  );
  const matrix = new THREE.Object3D();
  let count = 0;
  for (const side of [-1, 1])
    for (let row = 0; row < 13; row++) {
      const z = side < 0 ? -8 - row * 1.7 : 72 + row * 1.7;
      box(
        124,
        0.8,
        1.7,
        50,
        row * 0.85 + 0.4,
        z,
        row % 2 ? "#26343c" : "#303f48",
      );
      for (let seat = 0; seat < 200; seat++) {
        if (seat % 28 < 3) continue;
        matrix.position.set(-11 + seat * 0.61, row * 0.85 + 1.05, z);
        matrix.updateMatrix();
        crowd.setMatrixAt(count, matrix.matrix);
        crowd.setColorAt(
          count,
          new THREE.Color(
            ["#b9b5a4", "#9b5149", "#637e8c", "#34404c", "#c9d2cb"][
              (seat * 13 + row * 7) % 5
            ],
          ),
        );
        count++;
      }
    }
  for (const end of [-1, 1]) for (let row = 0; row < 11; row++) {
    const x = end < 0 ? -9 - row * 1.7 : 109 + row * 1.7;
    box(1.7, .8, 78, x, row * .85 + .4, 32, row % 2 ? "#25313e" : "#35444c");
    for (let seat = 0; seat < 122; seat++) {
      if (seat % 25 < 3) continue;
      matrix.position.set(x, row * .85 + 1.05, -5 + seat * .61); matrix.updateMatrix();
      crowd.setMatrixAt(count, matrix.matrix);
      crowd.setColorAt(count, new THREE.Color(["#bdc7c9", "#a55a52", "#30495a", "#7d96a5"][seat % 4])); count++;
    }
  }
  crowd.count = count;
  scene.add(crowd);
  const crowdHeads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(.18, 8, 6),
    standard("#b98a69"),
    count,
  );
  const headDummy = new THREE.Object3D();
  for (let i=0;i<count;i++) {
    crowd.getMatrixAt(i,headDummy.matrix);
    headDummy.matrix.decompose(headDummy.position,headDummy.quaternion,headDummy.scale);
    headDummy.position.y += .53;
    headDummy.scale.setScalar(.9);
    headDummy.updateMatrix();
    crowdHeads.setMatrixAt(i,headDummy.matrix);
    crowdHeads.setColorAt(i,new THREE.Color(["#e0b18b","#ba835f","#8e5d42","#6d4432","#c99773"][i%5]));
  }
  crowdHeads.count=count;
  scene.add(crowdHeads);
  const crowdTime={value:0},crowdReaction={value:0};
  const animateCrowdMaterial=(material:THREE.Material)=>{
    material.onBeforeCompile=shader=>{
      shader.uniforms.uCrowdTime=crowdTime;shader.uniforms.uCrowdReaction=crowdReaction;
      shader.vertexShader='uniform float uCrowdTime;uniform float uCrowdReaction;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 transformed.y+=max(0.0,sin(uCrowdTime*4.0+instanceMatrix[3].x*1.9+instanceMatrix[3].z))*(0.035+uCrowdReaction*0.22);`);
    };
  };
  animateCrowdMaterial(crowd.material as THREE.Material);
  animateCrowdMaterial(crowdHeads.material as THREE.Material);
  for (const z of [-31, 95]) {
    box(130, 1.1, 10, 50, 15, z, "#1b2833");
    for (let x = -10; x <= 110; x += 20)
      box(0.7, 15, 0.7, x, 7.5, z, "#43545d");
  }
  const boardMap = canvasTexture(1024, (ctx) => {
    ctx.fillStyle = "#152a2b";
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = "#d2f5a4";
    ctx.font = "bold 66px Arial";
    ctx.textAlign = "center";
    ctx.fillText("STADLER FOOTBALL", 512, 520);
  });
  for (const z of [-3, 67])
    for (let x = 0; x < 100; x += 12.5) {
      const board = box(12.3, 1.2, 0.35, x + 6.25, 0.7, z, "#fff");
      board.material = new THREE.MeshStandardMaterial({
        map: boardMap,
        emissive: "#c4dec1",
        emissiveMap: boardMap,
        emissiveIntensity: 0.28,
      });
    }
  // Technical area, benches, tunnel and broadcast hardware remove the empty-prototype feel.
  for (const x of [34, 66]) {
    box(13, .28, 2.4, x, .22, -6.4, "#26343b");
    box(12.4, .55, .75, x, .58, -6.1, "#51646d");
    for (let seat=-5;seat<=5;seat+=2) box(.72,.56,.68,x+seat,.95,-6.05,seat%4?"#243f4d":"#355765");
    const canopy=box(13.2,2.1,.12,x,1.55,-7.15,"#b9d8e0");
    canopy.material=new THREE.MeshPhysicalMaterial({color:"#a9ced8",transparent:true,opacity:.2,roughness:.2,metalness:.08,depthWrite:false});
  }
  box(7.8,3.4,4.8,50,1.7,-11,"#17242c");
  box(6.4,.35,5.1,50,3.48,-10.9,"#52636c");
  for (const x of [18,82]) {
    box(.12,2.6,.12,x,1.3,-4.6,"#8b979d");
    box(1.05,.52,.48,x,2.55,-4.6,"#172229");
    box(.15,.85,.15,x-.42,1.75,-4.6,"#8b979d");
    box(.15,.85,.15,x+.42,1.75,-4.6,"#8b979d");
  }
  const nets: { mesh: THREE.LineSegments; rest: Float32Array }[] = [];
  function rod(a: THREE.Vector3, b: THREE.Vector3, r = 0.11) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8),
      standard("#ebf0ea"),
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    mesh.castShadow = true;
    scene.add(mesh);
  }
  for (const x of [0, 100]) {
    const back = x + (x === 0 ? -3.6 : 3.6),
      v = (px: number, y: number, z: number) => new THREE.Vector3(px, y, z);
    rod(v(x, 0, 24), v(x, 5.15, 24));
    rod(v(x, 0, 40), v(x, 5.15, 40));
    rod(v(x, 5.15, 24), v(x, 5.15, 40));
    rod(v(x, 5.15, 24), v(back, 3.8, 24), 0.06);
    rod(v(x, 5.15, 40), v(back, 3.8, 40), 0.06);
    const lines: number[] = [];
    const line = (a: THREE.Vector3, b: THREE.Vector3) =>
      lines.push(...a.toArray(), ...b.toArray());
    for (let z = 24; z <= 40; z += 0.6) {
      line(v(back, 0, z), v(back, 3.8, z));
      line(v(back, 3.8, z), v(x, 5.15, z));
    }
    for (let y = 0; y <= 3.8; y += 0.45) {
      line(v(back, y, 24), v(back, y, 40));
      line(v(x, (y * 5.15) / 3.8, 24), v(back, y, 24));
      line(v(x, (y * 5.15) / 3.8, 40), v(back, y, 40));
    }
    const mesh = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(lines, 3),
      ),
      new THREE.LineBasicMaterial({
        color: "#e1e9e1",
        transparent: true,
        opacity: 0.42,
      }),
    );
    scene.add(mesh);
    nets.push({ mesh, rest: new Float32Array(lines) });
  }
  for (const x of [0, 100])
    for (const z of [0, 64]) {
      rod(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 2.5, z), 0.035);
      box(0.65, 0.4, 0.035, x + 0.3, 2.3, z, "#d7ed77");
    }
  for (const x of [-10, 110])
    for (const z of [-12, 78]) {
      box(0.6, 45, 0.6, x, 22.5, z, "#778792");
      const lamps = box(6, 1.5, 0.5, x, 45, z, "#fff");
      lamps.material.emissive.set("#e8f5ff");
      lamps.material.emissiveIntensity = 3;
    }
  const ballMap = canvasTexture(512, (ctx) => {
    ctx.fillStyle = "#eef0eb";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#192934";
    for (let y = 0; y < 512; y += 100)
      for (let x = 0; x < 512; x += 100) {
        ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const a = (p * Math.PI * 2) / 5;
          const px = x + (y % 200 ? 50 : 0) + Math.cos(a) * 24,
            py = y + Math.sin(a) * 24;
          if (!p) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
  });
  const ballBump = canvasTexture(512, (ctx) => {
    ctx.fillStyle="#777";ctx.fillRect(0,0,512,512);
    ctx.strokeStyle="#111";ctx.lineWidth=8;
    for(let y=0;y<512;y+=100)for(let x=0;x<512;x+=100){
      ctx.beginPath();
      for(let p=0;p<5;p++){
        const a=p*Math.PI*2/5,px=x+(y%200?50:0)+Math.cos(a)*24,py=y+Math.sin(a)*24;
        if(!p)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();ctx.stroke();
    }
  });
  ballBump.colorSpace=THREE.NoColorSpace;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 48, 32),
    new THREE.MeshPhysicalMaterial({
      map:ballMap,bumpMap:ballBump,bumpScale:.022,roughness:.46,
      clearcoat:.12,clearcoatRoughness:.58,envMapIntensity:.5
    }),
  );
  ball.castShadow = true;
  scene.add(ball);
  const ballContact = new THREE.Mesh(new THREE.CircleGeometry(.75, 32),
    new THREE.MeshBasicMaterial({ color: "#07140c", transparent: true, opacity: .36, depthWrite: false }));
  ballContact.rotation.x = -Math.PI / 2;
  scene.add(ballContact);
  const ballLocator = new THREE.Mesh(new THREE.RingGeometry(.72, .79, 40),
    new THREE.MeshBasicMaterial({ color: "#efffd1", transparent: true, opacity: .65, depthWrite: false }));
  ballLocator.rotation.x = -Math.PI / 2;
  scene.add(ballLocator);
  const trainingMarkers=TRAINING_GATES.map(g=>{const ring=new THREE.Mesh(new THREE.RingGeometry(2.5,3,40),new THREE.MeshBasicMaterial({color:0xa5ff64,side:THREE.DoubleSide,transparent:true,opacity:.8}));ring.rotation.x=-Math.PI/2;ring.position.set(g.x,.04,g.y);scene.add(ring);return ring;});
  const playerContacts=new THREE.InstancedMesh(
    new THREE.CircleGeometry(.6,24),
    new THREE.MeshBasicMaterial({color:"#06120b",transparent:true,opacity:.16,depthWrite:false}),
    32,
  );
  playerContacts.frustumCulled=false;scene.add(playerContacts);
  const contactDummy=new THREE.Object3D();
  let previousNetPulse = 0;
  const guideGeometry=new THREE.BufferGeometry();guideGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(55*3),3));
  const guide=new THREE.Line(guideGeometry,new THREE.LineBasicMaterial({color:'#bfff71',transparent:true,opacity:.85,depthTest:false}));guide.renderOrder=8;scene.add(guide);
  const athletes = new Map<number, Athlete>();
  let matchIdentity: MatchState | null = null;
  let lastTime = 0;
  let previousHomeScore = 0, previousAwayScore = 0, goalNet = 1;
  function athlete(p:Player,team:Team):Athlete{const a=createFootballAthlete(p,team);scene.add(a.root);setupShadows(a.root);return a;}
  function disposeObject(object: THREE.Object3D) {
    const textures = new Set<THREE.Texture>(),
      materials = new Set<THREE.Material>(),
      geometries = new Set<THREE.BufferGeometry>();
    object.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
      const m = o as THREE.Mesh;
      if (m.geometry) geometries.add(m.geometry);
      if (m.material)
        for (const material of Array.isArray(m.material)
          ? m.material
          : [m.material]) {
          materials.add(material);
          for (const value of Object.values(material))
            if (value instanceof THREE.Texture) textures.add(value);
        }
    });
    textures.forEach((t) => t.dispose());
    materials.forEach((m) => {csm.shaders.delete(m);m.dispose();});
    geometries.forEach((g) => g.dispose());
  }
  setupShadows(scene);
  return {
    resize(width, height, dpr) {
      renderer.setPixelRatio(Math.min(dpr, 2));
      renderer.setSize(width, height, false);
      viewportAspect = width / height;
      camera.aspect = viewportAspect;
      camera.updateProjectionMatrix();
    },
    render(state, quality, presentation = DEFAULT_PRESENTATION) {
      if (matchIdentity !== state) {
        athletes.forEach((a) => {
          scene.remove(a.root);
          disposeObject(a.root);
        });
        athletes.clear();
        for (const p of state.players)
          athletes.set(
            p.id,
            athlete(p, p.side === "home" ? state.homeTeam : state.awayTeam),
          );
        matchIdentity = state;
        lastTime = state.elapsed;
        previousHomeScore=state.homeScore;previousAwayScore=state.awayScore;
        framing = cameraTarget(state, presentation.camera, viewportAspect);
      }
      const visualTime = state.elapsed + (state.celebration?.time ?? 0);
      const dt = clamp(visualTime - lastTime, 0, 0.1);
      lastTime = visualTime;
      updateWear(state.pitchWear);crowdTime.value=state.elapsed+(state.celebration?.time??0);crowdReaction.value=state.celebration?1:state.netPulse;
      titleStage.update(state);
      const ceremony = state.celebration;
      if (state.homeScore!==previousHomeScore) goalNet=attackDirectionFor(state,"home")>0?1:0;
      else if(state.awayScore!==previousAwayScore)goalNet=attackDirectionFor(state,"away")>0?1:0;
      previousHomeScore=state.homeScore;previousAwayScore=state.awayScore;
      if (ceremony) {
        const shot = celebrationShot(ceremony.time);
        const portraitPull=viewportAspect<1?1.5:1;
        camera.position.set(shot.x,shot.y,32+(shot.z-32)*portraitPull);
        camera.fov = 42; camera.zoom = 1; camera.lookAt(50, ceremony.time<4.5?1.8:3.5, 33);
      } else if(state.penaltyDuel){
        camera.position.set(77,9,32);camera.fov=48;camera.zoom=1;camera.lookAt(99,1.5,32);
      } else if(state.replayView){
        const orbitSide=Math.sin(state.elapsed*.42)>=0?1:-1;
        const replayTarget=new THREE.Vector3(state.ball.x-10,6.8,state.ball.y+orbitSide*10.5);
        camera.position.lerp(replayTarget,1-Math.exp(-4.5*Math.max(dt,.016)));
        camera.fov=44;camera.zoom=1;camera.lookAt(state.ball.x,1.15,state.ball.y);
      } else if(presentation.camera==='pro'&&state.gameMode!=='local2p'&&!state.replayView&&!state.setPiece){
        const pose=proCameraPose(state);const target=new THREE.Vector3(pose.x,pose.y,pose.z);
        if(cameraMode!=='pro')camera.position.copy(target);else camera.position.lerp(target,1-Math.exp(-7*dt));cameraMode='pro';
        camera.fov=62;camera.zoom=1;camera.lookAt(pose.lookX,1.8,pose.lookZ);
      } else {
        const target = cameraTarget(state, presentation.camera, viewportAspect);
        if (cameraMode !== presentation.camera) framing = target;
        else framing = stepCamera(framing, target, dt);
        cameraMode = presentation.camera;
        const position = broadcastCameraPose(framing, viewportAspect);
        camera.position.set(position.x, position.height, state.replayView ? position.lookY*2-position.z : position.z);camera.fov=position.fov;camera.zoom=1;
        camera.lookAt(position.lookX, 0, position.lookY);
      }
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();csm.updateFrustums();csm.update();
      const highDetail=quality==="high"||quality==="ultra";
      const daylight=presentation.lighting==="day",sunset=presentation.lighting==="sunset";
      const csmIntensity=daylight?2.05:sunset?1.65:1.45;
      csm.lights.forEach(light=>{light.intensity=quality==='performance'?0:csmIntensity;light.castShadow=quality!=='performance';});
      renderer.shadowMap.enabled = quality !== "performance";
      crowd.visible = quality !== "performance";
      crowdHeads.visible = highDetail;
      sky.visible = quality !== "performance";
      const elevation=daylight?52:sunset?8:-15;
      const azimuth=daylight?118:sunset?246:218;
      sunPosition.setFromSphericalCoords(1,THREE.MathUtils.degToRad(90-elevation),THREE.MathUtils.degToRad(azimuth));
      skyUniforms.sunPosition.value.copy(sunPosition);
      skyUniforms.turbidity.value=daylight?6.5:sunset?9.5:4.5;
      skyUniforms.rayleigh.value=daylight?1.45:sunset?2.45:.25;
      skyUniforms.mieCoefficient.value=sunset?.012:.006;
      (scene.background as THREE.Color).set(daylight?"#a8c8d3":sunset?"#d89565":"#0b1521");
      if(scene.fog)scene.fog.color.set(daylight?"#b5ccd1":sunset?"#b77f64":"#17242c");
      hemi.intensity=daylight?2.25:sunset?1.45:1.0;
      key.intensity=quality==='performance'?(daylight?3.7:sunset?3.25:3.0):(daylight?1.45:sunset?1.35:1.05);
      fill.intensity=daylight?.55:sunset?.75:1.2;
      key.color.set(daylight?"#fff3d8":sunset?"#ffb46f":"#e4efff");
      fill.color.set(daylight?"#cbe4ff":sunset?"#7ca7d3":"#99c3ff");
      key.position.set(daylight?10:sunset?-35:-10,daylight?68:sunset?20:45,sunset?16:-12);
      stadiumLights.forEach(light=>{light.intensity=daylight?0:sunset?(highDetail?95:50):(highDetail?310:150);});
      renderer.toneMappingExposure=daylight?1.03:sunset?1.08:1.12;
      if (state.netPulse > 0 || previousNetPulse > 0) for (const [netIndex,net] of nets.entries()) {
        const positions=net.mesh.geometry.getAttribute("position");
        for(let i=0;i<positions.count;i++) {
          const j=i*3, y=net.rest[j+1], z=net.rest[j+2];
          const ripple=(netIndex===goalNet?state.netPulse:0)*Math.sin((z-24)*1.2-state.elapsed*21)*Math.sin(y/5.15*Math.PI)*.55;
          positions.setXYZ(i,net.rest[j]+ripple,y,z);
        }
        positions.needsUpdate=true;
      }
      previousNetPulse = state.netPulse;
      crowd.position.y=0;crowdHeads.position.y=0;
      trainingMarkers.forEach((ring,i)=>{ring.visible=state.training?.kind==='dribble'&&state.training.checkpoint===i;});
      let contactIndex=0;
      for(const p of state.players){
        if(p.sentOff)continue;
        contactDummy.position.set(p.x,.065,p.y);
        contactDummy.rotation.set(-Math.PI/2,0,0);
        const stretch=1+Math.min(1,Math.hypot(p.vx,p.vy)/24)*.22;
        contactDummy.scale.set(.9*stretch,.68,1);
        contactDummy.updateMatrix();
        playerContacts.setMatrixAt(contactIndex++,contactDummy.matrix);
      }
      playerContacts.count=contactIndex;playerContacts.instanceMatrix.needsUpdate=true;playerContacts.visible=!ceremony;
      for (const p of state.players) {
        let a = athletes.get(p.id)!;
        if(a.identity!==p.squadId){scene.remove(a.root);disposeObject(a.root);a=athlete(p,p.side==='home'?state.homeTeam:state.awayTeam);athletes.set(p.id,a);}
        const pose = ceremony ? celebrationPose(ceremony, p) : null;
        a.root.visible = ceremony ? !!pose : !p.sentOff;
        a.root.position.set(pose?.x ?? p.x, pose?.height ?? 0, pose?.y ?? p.y);
        const poseFrame=athletePose(p,a.motion,dt);
        if(highDetail)updateAthleteCloth(a,p,visualTime);
        const sweat=clamp((100-p.stamina)/80,0,1);a.skin.clearcoat=sweat*.8;a.skin.roughness=.8-sweat*.35;
        a.shirt.userData.dirt.value=p.dirt??0;
        a.hairCards.rotation.x=Math.sin(state.elapsed*7+p.id)*Math.hypot(p.vx,p.vy)*.002;
        const detailDistance=camera.position.distanceTo(a.root.position);
        a.hairCards.visible=quality!=='performance'&&detailDistance<92;
        a.body.rotation.set(poseFrame.lean,poseFrame.heading,poseFrame.bank);
        a.body.position.y=poseFrame.bob;
        for(let limb=0;limb<2;limb++) {
          a.legs[limb].rotation.x=poseFrame.stride[limb];a.knees[limb].rotation.x=poseFrame.knees[limb];
          a.arms[limb].rotation.set(poseFrame.arms[limb],0,limb ? -.06 : .06);
          a.elbows[limb].rotation.x=poseFrame.elbows[limb];
        }
        const ballHeading=Math.atan2(state.ball.x-p.x,state.ball.y-p.y)-poseFrame.heading;
        a.head.rotation.y=clamp(Math.atan2(Math.sin(ballHeading),Math.cos(ballHeading)),-.48,.48);
        const slidingPose=slidePose(p);
        if(slidingPose){a.body.rotation.x=slidingPose.lean;a.body.position.y=slidingPose.height;a.legs[1].rotation.x=slidingPose.leg;a.knees[0].rotation.x=slidingPose.bent;a.body.rotation.z+=slidingPose.impact;}
        else if (p.slideTimer > 0) {
          a.body.rotation.x = -1.15;
          a.body.position.y = -0.7;
          a.legs[1].rotation.x = -0.9;
        }
        if (p.keeperDiveTimer > 0) {
          const extension = Math.sin(clamp(p.keeperDiveTimer / 0.56, 0, 1) * Math.PI);
          if (p.keeperSave === "tip") {
            a.body.position.y = extension * 0.7;
            a.arms[0].rotation.x = -2.9; a.arms[1].rotation.x = -2.8;
          } else if (p.keeperSave === "smother") {
            a.body.rotation.x = 1.15; a.body.position.y = -0.75;
            a.arms[0].rotation.x = -1.7; a.arms[1].rotation.x = -1.7;
          } else {
            a.body.rotation.z = p.keeperDiveDirection * (0.5 + extension * 0.8);
            a.body.position.y = extension * 0.28 - 0.42;
            a.arms[0].rotation.x = -2.2; a.arms[1].rotation.x = -2.2;
          }
        }
        if (p.stealTimer > 0) {
          a.legs[1].rotation.x = -0.85; a.body.rotation.x = 0.28;
          a.arms[0].rotation.z = 0.5; a.arms[1].rotation.z = -0.5;
        }
        if (p.stumbleTimer > 0) a.body.rotation.z = 0.25;
        const selected =
          p.id === state.selectedId ||
          (state.gameMode === "local2p" && p.id === state.selectedAwayId);
        a.ring.visible = selected && !ceremony;
        a.label.visible = selected && !ceremony;
        const labelSize = THREE.MathUtils.clamp(camera.position.distanceTo(a.root.position) * .13, 1.2, 7);
        a.label.scale.set(labelSize, labelSize, 1);
        if (pose) {
          a.body.rotation.set(0, 0, 0); a.body.position.y = 0; a.head.rotation.y = 0;
          for(const elbow of a.elbows) elbow.rotation.x = -.1;
          const march = Math.sin((ceremony!.time + p.id) * 9) * (pose.gathered ? 0 : .65);
          a.legs[0].rotation.x = march; a.legs[1].rotation.x = -march;
          a.knees[0].rotation.x = a.knees[1].rotation.x = 0;
          a.arms[0].rotation.x = pose.captain ? -.9 - pose.lift * 1.9 : -pose.lift * 2.6;
          a.arms[1].rotation.x = a.arms[0].rotation.x;
          a.arms[0].rotation.z = pose.captain ? -.3 : .4;
          a.arms[1].rotation.z = -a.arms[0].rotation.z;
          if (pose.captain) {
            a.root.updateMatrixWorld(true);
            const left=a.elbows[0].localToWorld(new THREE.Vector3(0,-.4,0)),right=a.elbows[1].localToWorld(new THREE.Vector3(0,-.4,0));
            titleStage.trophy.position.copy(left.add(right).multiplyScalar(.5));titleStage.trophy.position.y-=.82;
            titleStage.trophy.rotation.set(0, Math.sin(ceremony!.time)*.05, 0);
          }
        }
      }
      const guidePoints=setPieceTrajectory(state);guide.visible=guidePoints.length>0&&!ceremony;
      const guidePositions=guideGeometry.getAttribute('position');guidePoints.forEach((p,i)=>guidePositions.setXYZ(i,p.x,p.z+.25,p.y));guidePositions.needsUpdate=true;guideGeometry.setDrawRange(0,guidePoints.length);guideGeometry.computeBoundingSphere();
      ball.position.set(state.ball.x, state.ball.z + 0.52, state.ball.y);
      ball.rotation.x += state.ball.vy * dt / .52;
      ball.rotation.z -= state.ball.vx * dt / .52;
      ball.rotation.y += state.ball.spin * dt * .08;
      ball.visible = !ceremony;
      const height = Math.max(0, state.ball.z);
      ballContact.position.set(state.ball.x, .075, state.ball.y);
      ballContact.scale.setScalar(1 + Math.min(height, 12) * .08);
      ballContact.material.opacity = .36 / (1 + height * .15);
      ballContact.visible = !ceremony&&quality==='performance';
      ballLocator.position.set(state.ball.x, .08, state.ball.y);
      ballLocator.visible = !ceremony && height > 1.5;
      ballLocator.material.opacity = Math.min(.65, (height - 1.5) * .2);
      post.render();
    },
    dispose() {
      post.dispose();
      csm.lights.forEach(light=>light.shadow.dispose());csm.remove();csm.dispose();
      key.shadow.dispose(); fill.shadow.dispose();
      disposeObject(scene);
      renderer.dispose();
    },
  };
}
