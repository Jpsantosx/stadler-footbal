import * as THREE from "three";
import { cameraTarget, stepCamera, broadcastCameraPose, DEFAULT_PRESENTATION, type PresentationSettings, type CameraFrame } from "./football-camera";
import { athletePose, createLocomotion, type Locomotion } from "./football-animation";
import { grassDetailMaps, createWearOverlay, createPostProcessing, createTitleStage } from "./football-effects";
import { celebrationPose, celebrationShot } from "./football-presentation";
import {
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
        const mow = Math.floor(x / 171) % 2 ? 9 : 0;
        const i = (y * 2048 + x) * 4;
        pixels.data[i] = 36 + grain + mow;
        pixels.data[i + 1] = 84 + grain + mow;
        pixels.data[i + 2] = 39 + grain * 0.65 + mow;
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

type Athlete = {
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
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, .1, 400);
  let framing: CameraFrame = { x: 50, y: 32, span: 90 };
  let cameraMode = DEFAULT_PRESENTATION.camera;
  let viewportAspect = 16 / 9;
  camera.position.set(50, 96, 103);
  camera.lookAt(50, 0, 30);
  const hemi = new THREE.HemisphereLight("#dce9ff", "#31482c", 2.25);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#fff2d8", 3.1);
  key.position.set(-10, 45, -12);
  key.target.position.set(50, 0, 32);
  key.castShadow = true;
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
  fill.castShadow = true;
  fill.shadow.mapSize.set(2048, 2048);
  Object.assign(fill.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 220 });
  fill.shadow.bias = -0.0003;
  fill.shadow.normalBias = 0.06;
  scene.add(fill, fill.target);
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
      normalMap: detailMaps.normal, normalScale: new THREE.Vector2(0.58, 0.58),
      aoMap: detailMaps.ao, aoMapIntensity: 0.85 }),
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
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 24, 16),
    new THREE.MeshStandardMaterial({ map: ballMap, roughness: 0.55 }),
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
  let previousNetPulse = 0;
  const athletes = new Map<number, Athlete>();
  let matchIdentity: MatchState | null = null;
  let lastTime = 0;
  let previousHomeScore = 0, previousAwayScore = 0, goalNet = 1;
  function athlete(p: Player, team: Team): Athlete {
    const root = new THREE.Group(),
      body = new THREE.Group();
    root.add(body);
    scene.add(root);
    const skin = standard(
      ["#d9a47e", "#ac7551", "#774e35", "#bf8b66"][p.id % 4],
    );
    const shirt = new THREE.MeshStandardMaterial({
      map: kitTexture(team, p),
      roughness: 0.98,
    });
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(.38, .29, .85, 18, 3),
      shirt,
    );
    torso.scale.z = 0.7;
    torso.position.y = 1.75;
    body.add(torso);
    torso.castShadow = true;
    const headGroup = new THREE.Group(); headGroup.position.y = 2.48; body.add(headGroup);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.255, 20, 16), skin);
    head.scale.set(.86, 1.15, .94); headGroup.add(head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.12,.13,.2,12),skin);
    neck.position.y=-.3; headGroup.add(neck);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.258,18,12,0,Math.PI*2,0,Math.PI*.48),
      standard(["#251b17","#3e2a1d","#171719","#60452d"][p.id%4]));
    hair.position.y=.04;hair.scale.set(.9,1.05,.96);headGroup.add(hair);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),skin);
    nose.position.set(0,-.01,.235);nose.scale.set(.55,1,1);headGroup.add(nose);
    for(const side of [-1,1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(.058,8,6),skin);
      ear.position.set(side*.23,0,0);ear.scale.set(.7,1,.55);headGroup.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.023,8,6),standard("#211c1b"));
      eye.position.set(side*.085,.055,.211);headGroup.add(eye);
    }
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.16,.035,8,20), standard(team.secondary));
    collar.rotation.x=Math.PI/2;collar.position.y=2.18;body.add(collar);
    const legs: THREE.Group[] = [],
      knees: THREE.Group[] = [],
      arms: THREE.Group[] = [],
      elbows: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.22, 1.35, 0);
      body.add(leg);
      legs.push(leg);
      const thigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.15, 0.33, 4, 8),
        standard(p.role === "GK" ? "#243d28" : team.shorts),
      );
      thigh.position.y = -0.24;
      leg.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.48;
      leg.add(knee);
      knees.push(knee);
      const shin = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.1, 0.36, 4, 8),
        standard(p.role === "GK" ? "#abc949" : team.socks),
      );
      shin.position.y = -0.22;
      knee.add(shin);
      const boot=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.22,5,12),standard(p.id%3 ? "#dce2d4" : "#eab063"));
      boot.rotation.x=Math.PI/2;boot.position.set(0,-.49,.1);knee.add(boot);
      box(.14,.025,.045,0,-.41,.11,"#344a54",knee);
      const arm = new THREE.Group();
      arm.position.set(side * 0.43, 2.05, 0);
      body.add(arm);
      arms.push(arm);
      const sleeve = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.13, 0.22, 4, 8),
        standard(p.role==="GK" ? (p.side==="home"?"#b0e049":"#e9943e") : team.kitPattern==="white-sleeves" ? team.secondary : team.primary),
      );
      sleeve.position.y = -0.12;
      arm.add(sleeve);
      const elbow = new THREE.Group(); elbow.position.y = -.29; arm.add(elbow); elbows.push(elbow);
      const forearm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.095, 0.3, 4, 8),
        skin,
      );
      forearm.position.set(0, -.19, 0);
      elbow.add(forearm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),skin); hand.position.set(0,-.4,0); hand.scale.set(.75,1,.65); elbow.add(hand);
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
    return { root, body, legs, knees, arms, elbows, head:headGroup, ring, label, motion:createLocomotion(p) };
  }
  function disposeObject(object: THREE.Object3D) {
    const textures = new Set<THREE.Texture>(),
      materials = new Set<THREE.Material>(),
      geometries = new Set<THREE.BufferGeometry>();
    object.traverse((o) => {
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
    materials.forEach((m) => m.dispose());
    geometries.forEach((g) => g.dispose());
  }
  return {
    resize(width, height, dpr) {
      renderer.setPixelRatio(Math.min(dpr, 2));
      renderer.setSize(width, height, false);
      post.resize(width, height, dpr);
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
      updateWear(state.pitchWear);
      titleStage.update(state);
      const ceremony = state.celebration;
      if (state.homeScore!==previousHomeScore) goalNet=attackDirectionFor(state,"home")>0?1:0;
      else if(state.awayScore!==previousAwayScore)goalNet=attackDirectionFor(state,"away")>0?1:0;
      previousHomeScore=state.homeScore;previousAwayScore=state.awayScore;
      if (ceremony) {
        const shot = celebrationShot(ceremony.time);
        // A close broadcast lens keeps the complete podium in frame.
        const ceremonyDistance=Math.max(34,34/(2*viewportAspect*Math.tan(21*Math.PI/180)));
        camera.position.set(50 + (shot.x - 50) * .3, 3 + ceremonyDistance*.3, 32+ceremonyDistance*.954);
        camera.fov = 42; camera.zoom = 1; camera.lookAt(50, 2.7, 32);
      } else {
        const target = cameraTarget(state, presentation.camera, viewportAspect);
        if (cameraMode !== presentation.camera) framing = target;
        else framing = stepCamera(framing, target, dt);
        cameraMode = presentation.camera;
        const position = broadcastCameraPose(framing, viewportAspect);
        camera.position.set(position.x, position.height, state.replayView ? position.lookY*2-position.z : position.z);camera.fov=position.fov;camera.zoom=1;
        camera.lookAt(position.lookX, 0, position.lookY);
      }
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      renderer.shadowMap.enabled = quality !== "performance";
      crowd.visible = quality !== "performance";
      const daylight = presentation.lighting === "day";
      (scene.background as THREE.Color).set(daylight ? "#a5c3cd" : "#101c28");
      if (scene.fog) scene.fog.color.set(daylight ? "#adc5ca" : "#16252e");
      hemi.intensity = daylight ? 2.4 : 1.05;
      key.intensity = daylight ? 3.9 : 3.1; fill.intensity = daylight ? .55 : 1.25;
      key.color.set(daylight ? "#fff2d3" : "#e5efff");
      key.position.set(daylight ? 10 : -10, daylight ? 68 : 45, -12);
      renderer.toneMappingExposure = daylight ? 1.04 : 1.12;
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
      for (const p of state.players) {
        const a = athletes.get(p.id)!;
        const pose = ceremony ? celebrationPose(ceremony, p) : null;
        a.root.visible = ceremony ? !!pose : !p.sentOff;
        a.root.position.set(pose?.x ?? p.x, pose?.height ?? 0, pose?.y ?? p.y);
        const poseFrame=athletePose(p,a.motion,dt);
        a.body.rotation.set(poseFrame.lean,poseFrame.heading,poseFrame.bank);
        a.body.position.y=poseFrame.bob;
        for(let limb=0;limb<2;limb++) {
          a.legs[limb].rotation.x=poseFrame.stride[limb];a.knees[limb].rotation.x=poseFrame.knees[limb];
          a.arms[limb].rotation.set(poseFrame.arms[limb],0,limb ? -.06 : .06);
          a.elbows[limb].rotation.x=poseFrame.elbows[limb];
        }
        const ballHeading=Math.atan2(state.ball.x-p.x,state.ball.y-p.y)-poseFrame.heading;
        a.head.rotation.y=clamp(Math.atan2(Math.sin(ballHeading),Math.cos(ballHeading)),-.48,.48);
        if (p.slideTimer > 0) {
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
            titleStage.trophy.position.set(pose.x, pose.height + 2.5 + pose.lift * 1.3, pose.y + .55);
            titleStage.trophy.rotation.set(0, Math.sin(ceremony!.time)*.05, 0);
          }
        }
      }
      ball.position.set(state.ball.x, state.ball.z + 0.52, state.ball.y);
      ball.rotation.x += state.ball.vy * dt / .52;
      ball.rotation.z -= state.ball.vx * dt / .52;
      ball.rotation.y += state.ball.spin * dt * .08;
      ball.visible = !ceremony;
      const height = Math.max(0, state.ball.z);
      ballContact.position.set(state.ball.x, .075, state.ball.y);
      ballContact.scale.setScalar(1 + Math.min(height, 12) * .08);
      ballContact.material.opacity = .36 / (1 + height * .15);
      ballContact.visible = !ceremony;
      ballLocator.position.set(state.ball.x, .08, state.ball.y);
      ballLocator.visible = !ceremony && height > 1.5;
      ballLocator.material.opacity = Math.min(.65, (height - 1.5) * .2);
      post.render(state, quality, dt);
    },
    dispose() {
      post.dispose();
      key.shadow.dispose(); fill.shadow.dispose();
      disposeObject(scene);
      renderer.dispose();
    },
  };
}
