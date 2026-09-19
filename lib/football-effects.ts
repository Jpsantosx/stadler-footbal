import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { MatchState, Quality } from "./football-engine";
import { WEAR_COLS, type PitchWear } from "./football-pitch";
import { celebrationParticle, fireworkParticle } from "./football-presentation";

export function grassDetailMaps() {
  const size = 512, heights = new Float32Array(size * size);
  let seed = 7731;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    heights[y * size + x] = Math.pow((seed >>> 16) / 65535, 2) * 0.55 +
      Math.pow(Math.abs(Math.sin(x * 1.91 + Math.sin(y * 0.08) * 2)), 8) * 0.45;
  }
  const normal = new Uint8Array(size * size * 4), ao = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => heights[((y + size) % size) * size + (x + size) % size];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const n = new THREE.Vector3((at(x - 1, y) - at(x + 1, y)) * 1.4, (at(x, y - 1) - at(x, y + 1)) * 1.4, 1).normalize();
    normal.set([(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255, 255], i);
    const occlusion = 175 + at(x, y) * 80;
    ao.set([occlusion, occlusion, occlusion, 255], i);
  }
  const make = (pixels: Uint8Array) => {
    const map = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(20, 13);
    map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true; map.anisotropy = 8; map.needsUpdate = true;
    return map; // Non-color data must stay in linear space.
  };
  return { normal: make(normal), ao: make(ao) };
}

export function createWearOverlay(scene: THREE.Scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 1536; canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(100, 64), new THREE.MeshStandardMaterial({
    map, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1,
  }));
  overlay.rotation.x = -Math.PI / 2; overlay.position.set(50, 0.055, 32); overlay.receiveShadow = true;
  scene.add(overlay);
  let last: PitchWear | null = null, revision = -1;
  return (wear: PitchWear) => {
    if (last === wear && revision === wear.revision) return;
    last = wear; revision = wear.revision;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(canvas.width / 100, canvas.height / 64);
    wear.cells.forEach((value, index) => {
      if (value < 0.003) return;
      const x = index % WEAR_COLS * 2 + 1, y = Math.floor(index / WEAR_COLS) * 2 + 1;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 2.3);
      g.addColorStop(0, `rgba(90,67,34,${Math.min(0.72, value)})`); g.addColorStop(1, "rgba(65,50,27,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 2.3, y - 2.3, 4.6, 4.6);
    });
    for (const mark of wear.marks) {
      ctx.lineCap = "round"; ctx.lineWidth = 0.43; ctx.strokeStyle = `rgba(104,78,40,${mark.strength})`;
      ctx.beginPath(); ctx.moveTo(mark.x, mark.y); ctx.lineTo(mark.x + mark.dx, mark.y + mark.dy); ctx.stroke();
      ctx.lineWidth = 0.11; ctx.strokeStyle = "rgba(44,33,20,.6)"; ctx.stroke();
    }
    ctx.restore(); map.needsUpdate = true;
  };
}

export function createPostProcessing(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  const composer = new EffectComposer(renderer);
  const render = new RenderPass(scene, camera);
  const bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0.0016, maxblur: 0.009 });
  bokeh.materialBokeh.defines.PERSPECTIVE_CAMERA = 1;
  const dofUniforms = bokeh.uniforms as Record<string, THREE.IUniform>;
  const bloom = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.25, 0.45, 1.8);
  const centers = Array.from({ length: 17 }, () => new THREE.Vector4(-10, -10, 0, 0));
  const velocities = Array.from({ length: 17 }, () => new THREE.Vector2());
  const blur = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, centers: { value: centers }, velocities: { value: velocities }, aspect: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec4 centers[17]; uniform vec2 velocities[17]; uniform float aspect;
      varying vec2 vUv;
      void main(){float weight=0.0; vec2 motion=vec2(0.0);
        for(int i=0;i<17;i++){vec2 d=(vUv-centers[i].xy)*vec2(aspect,1.0);
          float mask=(1.0-smoothstep(centers[i].z*0.35, max(0.00001,centers[i].z),length(d)))*centers[i].w;
          if(mask>weight){weight=mask;motion=velocities[i];}}
        vec4 base=texture2D(tDiffuse,vUv);vec4 sum=base;
        for(int j=1;j<5;j++){sum+=texture2D(tDiffuse,clamp(vUv-motion*(float(j)/4.0),vec2(0.0),vec2(1.0)));}
        gl_FragColor=mix(base,sum/5.0,weight*0.55);
      }`,
  });
  const output = new OutputPass();
  composer.addPass(render); composer.addPass(blur); composer.addPass(bokeh); composer.addPass(bloom); composer.addPass(output);
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  return {
    resize(width: number, height: number, dpr: number) {
      composer.setPixelRatio(Math.min(dpr, 2)); composer.setSize(width, height);
      dofUniforms.aspect.value = width / height; blur.uniforms.aspect.value = width / height;
    },
    render(state: MatchState, quality: Quality, dt: number) {
      const cinematic = !!state.celebration;
      bloom.enabled = quality !== "performance"; bloom.strength = cinematic ? 0.36 : 0.22;
      bokeh.enabled = cinematic && quality !== "performance";
      if (bokeh.enabled) {
        a.set(50, 3.3, 34).applyMatrix4(camera.matrixWorldInverse);
        dofUniforms.focus.value = -a.z;
      }
      blur.enabled = !cinematic && !state.paused && quality === "ultra";
      for (const c of centers) c.set(-10, -10, 0, 0);
      if (blur.enabled) {
        const objects = [...state.players.filter(p => !p.sentOff).map(p => ({ x:p.x, y:p.y, z:1.5, vx:p.vx, vy:p.vy, ball:false })), { ...state.ball, ball:true }];
        objects.slice(0, 17).forEach((p, i) => {
          const speed = Math.hypot(p.vx,p.vy), threshold = p.ball ? 30 : 14;
          if (speed < threshold) return;
          a.set(p.x,p.z,p.y).project(camera); b.set(p.x-p.vx/100,p.z,p.y-p.vy/100).project(camera);
          centers[i].set(a.x*.5+.5,a.y*.5+.5,p.ball ? .014 : .021, Math.min(1,(speed-threshold)/15));
          velocities[i].set((a.x-b.x)*.5,(a.y-b.y)*.5).clampLength(0, .012);
        });
      }
      composer.render(dt);
    },
    dispose() { for (const pass of composer.passes) pass.dispose(); composer.dispose(); },
  };
}

export function createTitleStage(scene: THREE.Scene) {
  const root = new THREE.Group(); scene.add(root); root.visible = false;
  const base = new THREE.Mesh(new THREE.BoxGeometry(25, 0.7, 9), new THREE.MeshStandardMaterial({ color: "#101d29", roughness: 0.48 }));
  base.position.set(50, 0.35, 32); base.receiveShadow = true; root.add(base);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(25.1, 0.12, 9.1), new THREE.MeshStandardMaterial({ color: "#b3e9b2", emissive: "#2b422c", emissiveIntensity: .6 }));
  ribbon.position.set(50, .67, 32); root.add(ribbon);
  const trophy = new THREE.Group(); root.add(trophy);
  const gold = new THREE.MeshStandardMaterial({ color: "#efc65a", roughness: .16, metalness: .88, emissive: "#b77713", emissiveIntensity: .35 });
  const cup = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.15,0), new THREE.Vector2(.18,.45),new THREE.Vector2(.58,.65),new THREE.Vector2(.7,1.1),new THREE.Vector2(.72,1.25)], 32),gold);
  trophy.add(cup); cup.castShadow = true;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.37,.43,.2,24),gold); foot.position.y=-.02; trophy.add(foot);
  for (const side of [-1,1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.35,.07,10,32),gold);
    handle.position.set(side*.68,.82,0); handle.scale.y=1.3; trophy.add(handle);
  }
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(.15,.32),new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:.65}),640);
  root.add(confetti); confetti.frustumCulled=false;
  const fireworks = new THREE.InstancedMesh(new THREE.SphereGeometry(.1,6,4),new THREE.MeshBasicMaterial({color:"#fff5c0",toneMapped:false}),288);
  root.add(fireworks); fireworks.frustumCulled=false;
  const flashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(.5,.5),new THREE.MeshBasicMaterial({color:new THREE.Color(4,4,5),toneMapped:false,side:THREE.DoubleSide}),48);
  root.add(flashes); flashes.frustumCulled=false;
  const light = new THREE.PointLight("#ffd885",0,32,2); light.position.set(50,8,35); root.add(light);
  const transform = new THREE.Object3D();
  let identity: MatchState | null = null;
  return { trophy, update(state: MatchState) {
    const c=state.celebration; root.visible=!!c; if(!c) return;
    const team=c.winner==="home"?state.homeTeam:state.awayTeam;
    if(identity!==state) {
      identity=state;
      for(let i=0;i<640;i++) confetti.setColorAt(i,new THREE.Color([team.primary,team.secondary,"#f2e6b8"][i%3]));
      if(confetti.instanceColor) confetti.instanceColor.needsUpdate=true;
      ribbon.material.color.set(team.primary);
    }
    const t=c.time; light.intensity=t>6.4 ? 70+Math.sin(t*4)*12 : 35;
    for(let i=0;i<640;i++) {
      const p=celebrationParticle(i,t);
      transform.position.set(p?.x??0,p?.z??-20,p?.y??0);
      transform.rotation.set(p?.rotation??0,(p?.rotation??0)*.7,i);
      transform.scale.setScalar(p?.alpha??0); transform.updateMatrix();confetti.setMatrixAt(i,transform.matrix);
    }
    confetti.instanceMatrix.needsUpdate=true;
    for(let i=0;i<288;i++) {
      const p=fireworkParticle(i,t);
      transform.position.set(p?.x??0,p?.z??-20,p?.y??0); transform.scale.setScalar(p? p.alpha*1.6:0);
      transform.updateMatrix();fireworks.setMatrixAt(i,transform.matrix);
    }
    fireworks.instanceMatrix.needsUpdate=true;
    for(let i=0;i<48;i++) {
      const flash=t>5 && Math.sin(t*13+i*83)>0.985;
      transform.position.set(-8+(i*19)%116,3+(i%9),i%2?-13:79);
      transform.rotation.set(0,0,0);transform.scale.setScalar(flash?1:0);transform.updateMatrix();flashes.setMatrixAt(i,transform.matrix);
    }
    flashes.instanceMatrix.needsUpdate=true;
  } };
}
