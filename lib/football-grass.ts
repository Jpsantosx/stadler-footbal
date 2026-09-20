import * as THREE from 'three';
import type {MatchState,Quality} from './football-engine';
/** A bounded patch of real blades follows the action; wear suppresses trampled grass. */
export function createGrassBlades(scene:THREE.Scene){
 const count=24000,geometry=new THREE.PlaneGeometry(.045,.22,1,3);geometry.translate(0,.11,0);
 const wearData=new Uint8Array(50*32*4);wearData.fill(255);const wearMap=new THREE.DataTexture(wearData,50,32);wearMap.needsUpdate=true;
 const uniforms={uGrassTime:{value:0},uGrassCenter:{value:new THREE.Vector2(50,32)},uGrassWear:{value:wearMap}};
 const material=new THREE.MeshStandardMaterial({color:'#45742f',roughness:.95,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);shader.vertexShader='uniform float uGrassTime;uniform vec2 uGrassCenter;uniform sampler2D uGrassWear;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec2 field=instanceMatrix[3].xz+uGrassCenter;
   float wear=texture2D(uGrassWear,field/vec2(100.0,64.0)).r;
   transformed.y*=wear;
   transformed.x+=sin(uGrassTime*1.9+field.x*.6+field.y*.31)*position.y*.18;
   if(field.x<0.2||field.x>99.8||field.y<0.2||field.y>63.8)transformed.y=0.0;`);
 };
 const blades=new THREE.InstancedMesh(geometry,material,count);blades.receiveShadow=true;blades.frustumCulled=false;scene.add(blades);
 const matrix=new THREE.Object3D();let seed=371;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<count;i++){matrix.position.set((rand()-.5)*40,.045,(rand()-.5)*40);matrix.rotation.y=rand()*Math.PI;matrix.scale.set(1,.6+rand()*.7,1);matrix.updateMatrix();blades.setMatrixAt(i,matrix.matrix);blades.setColorAt(i,new THREE.Color().setHSL(.25+rand()*.04,.38,.24+rand()*.14));}
 let lastRevision=-1,lastWear:MatchState['pitchWear']|null=null;
 return {mesh:blades,update(s:MatchState,quality:Quality){
  blades.visible=quality!=='performance';blades.count=quality==='ultra'?count:8000;
  const p=s.players.find(p=>p.id===(s.lockedPlayerId??s.selectedId));const x=p?.x??s.ball.x,y=p?.y??s.ball.y;
  blades.position.set(x,0,y);uniforms.uGrassCenter.value.set(x,y);uniforms.uGrassTime.value=s.elapsed;
  if(lastWear!==s.pitchWear||lastRevision!==s.pitchWear.revision){lastWear=s.pitchWear;lastRevision=s.pitchWear.revision;s.pitchWear.cells.forEach((v,i)=>{wearData[i*4]=Math.round(255*(1-Math.min(.95,v)));});wearMap.needsUpdate=true;}
 },dispose(){wearMap.dispose();}};
}
