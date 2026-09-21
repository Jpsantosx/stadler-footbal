import * as THREE from 'three';
import surface from './assets/athlete-body.json' with { type: 'json' };

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export type AthleteBuild = {
  shoulders: number;
  chest: number;
  waist: number;
  hips: number;
  thigh: number;
  calf: number;
  arm: number;
  head: number;
  depth: number;
};

const DEFAULT_BUILD: AthleteBuild = {
  shoulders: 1,
  chest: 1,
  waist: 1,
  hips: 1,
  thigh: 1,
  calf: 1,
  arm: 1,
  head: 1,
  depth: 1,
};

/** Original welded humanoid surface, shared by the studio and match renderer.
 * Positions, UVs, morphs and skin weights belong to ONE indexed mesh.
 * Limbs are deformed by bones; no separate limb meshes or joint caps exist.
 */
export function createRiggedBody(
  materials: THREE.Material[],
  lowSocks = false,
  tucked = true,
  build: Partial<AthleteBuild> = {},
) {
  const shape: AthleteBuild = { ...DEFAULT_BUILD, ...build };
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(surface.position);
  const uv: number[] = [], indices: number[] = [], weights: number[] = [];
  const morphKeys = ['jaw', 'nose', 'mouth', 'eyes', 'eyeSize'];
  const morphs = morphKeys.map(() => new Float32Array(positions.length));
  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i], z = positions[i + 2];
    const y = positions[i + 1], side = x < 0 ? 0 : 1;
    const originalX = x;

    // Shape the actual mesh instead of scaling the entire athlete uniformly.
    // This keeps the welded surface while giving each position a distinct
    // shoulder/chest/waist/leg silhouette.
    if (y > 2.18) {
      x *= shape.head;
      z *= .94 + (shape.head - 1) * .45 + shape.depth * .06;
    } else if (Math.abs(originalX) > .30 && y > 1.24) {
      const shoulderX = side ? .34 : -.34;
      x = shoulderX + (x - shoulderX) * shape.arm;
      z *= .93 + shape.depth * .07;
    } else if (y < 1.48) {
      const legCenter = side ? .18 : -.18;
      const legScale = y > .78
        ? THREE.MathUtils.lerp(shape.thigh, shape.hips, smooth(1.18, 1.48, y))
        : THREE.MathUtils.lerp(shape.calf, shape.thigh, smooth(.56, .90, y));
      x = legCenter + (x - legCenter) * legScale;
      z *= .94 + shape.depth * .06;
    } else {
      const torsoScale = y > 1.92
        ? THREE.MathUtils.lerp(shape.chest, shape.shoulders, smooth(1.92, 2.15, y))
        : y > 1.62
          ? THREE.MathUtils.lerp(shape.waist, shape.chest, smooth(1.62, 1.92, y))
          : THREE.MathUtils.lerp(shape.hips, shape.waist, smooth(1.42, 1.62, y));
      x *= torsoScale;
      z *= shape.depth;
    }
    positions[i] = x;
    positions[i + 2] = z;

    uv.push((Math.atan2(x / .35, z / .195) / (Math.PI * 2) + 1) % 1, (y - 1.5) / .73);
    let ids = [0, 0, 0, 0], w = [1, 0, 0, 0];
    if (y > 2.18) {
      const head = smooth(2.18, 2.35, y); ids = [0, 1, 0, 0]; w = [1 - head, head, 0, 0];
    } else if (Math.abs(x) > .30 && y > 1.24) {
      const arm = smooth(.30, .44, Math.abs(x));
      const elbow = 1 - smooth(1.68, 1.87, y);
      ids = [0, 6 + side * 2, 7 + side * 2, 0];
      w = [1 - arm, arm * (1 - elbow), arm * elbow, 0];
    } else if (y < .34) {
      const foot = 1 - smooth(.13, .34, y);
      ids = [3 + side * 2, 10 + side, 0, 0];
      w = [1 - foot, foot, 0, 0];
    } else if (y < 1.48) {
      const leg = 1 - smooth(1.23, 1.48, y), knee = 1 - smooth(.69, .91, y);
      ids = [0, 2 + side * 2, 3 + side * 2, 0];
      w = [1 - leg, leg * (1 - knee), leg * knee, 0];
    }
    indices.push(...ids); weights.push(...w);
    if (y > 2.30) {
      const fy = y - 2.51, front = smooth(.035, .17, z);
      const jaw = Math.exp(-Math.pow((fy + .12) / .09, 2));
      morphs[0][i] = x * jaw * .38;
      morphs[1][i + 2] = .05 * front * Math.exp(-Math.pow(x / .045, 2) - Math.pow(fy / .065, 2));
      morphs[2][i] = x * front * Math.exp(-Math.pow((fy + .09) / .03, 2)) * .3;
      morphs[3][i] = x * front * Math.exp(-Math.pow((fy - .035) / .045, 2)) * .25;
      morphs[4][i + 1] = (fy - .035) * front * Math.exp(-Math.pow((fy - .035) / .04, 2)) * .25;
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const groups: number[][] = Array.from({ length: 5 }, () => []);
  for (let i = 0; i < surface.index.length; i += 3) {
    const triangle = surface.index.slice(i, i + 3);
    let x = 0, y = 0;
    for (const v of triangle) { x += Math.abs(positions[v * 3]) / 3; y += positions[v * 3 + 1] / 3; }
    const arm = x > .37 && y > 1.22;
    const material = arm ? (y > 1.94 ? 1 : 0) : y > 2.20 ? 0 : y > (tucked ? 1.55 : 1.46) ? 1 : y > 1.03 ? 2 : y < .20 ? 4 : y < (lowSocks ? .48 : .70) ? 3 : 0;
    groups[material].push(...triangle);
  }
  let offset = 0;
  for (let i = 0; i < groups.length; i++) { geometry.addGroup(offset, groups[i].length, i); offset += groups[i].length; }
  geometry.setIndex(groups.flat());
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = morphs.map((array, i) => { const attr = new THREE.BufferAttribute(array, 3); attr.name = morphKeys[i]; return attr; });

  const hip = new THREE.Bone(); hip.name = 'pelvis';
  const head = new THREE.Bone(); head.name = 'head'; head.position.y = 2.51; hip.add(head);
  const legs: THREE.Bone[] = [], knees: THREE.Bone[] = [], feet: THREE.Bone[] = [], arms: THREE.Bone[] = [], elbows: THREE.Bone[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Bone(), knee = new THREE.Bone(), foot = new THREE.Bone(), arm = new THREE.Bone(), elbow = new THREE.Bone();
    leg.name = `thigh-${side}`; knee.name = `shin-${side}`; foot.name = `foot-${side}`;
    arm.name = `upper-arm-${side}`; elbow.name = `forearm-${side}`;
    leg.position.set(side * .18, 1.42, 0); knee.position.set(side * .015, -.62, 0); foot.position.set(0, -.68, .025);
    arm.position.set(side * .34, 2.09, 0); elbow.position.set(side * .21, -.31, 0);
    hip.add(leg, arm); leg.add(knee); knee.add(foot); arm.add(elbow);
    legs.push(leg); knees.push(knee); feet.push(foot); arms.push(arm); elbows.push(elbow);
  }
  const skeleton = new THREE.Skeleton([
    hip, head, legs[0], knees[0], legs[1], knees[1],
    arms[0], elbows[0], arms[1], elbows[1], feet[0], feet[1],
  ]);
  const mesh = new THREE.SkinnedMesh(geometry, materials); mesh.name = 'continuous-rigged-athlete';
  // Skeleton is a sibling of the mesh: animation transforms never move bind space.
  const root = new THREE.Group(); root.add(hip, mesh); root.updateMatrixWorld(true); mesh.bind(skeleton);
  mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = true;
  return { mesh, root, head, legs, knees, feet, arms, elbows };
}
