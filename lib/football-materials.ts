import * as THREE from 'three';
function texture(seed:number,kind:'skin'|'cloth'|'hair'){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed>>>24)/255;
  const value=kind==='cloth'?128+Math.sin(x*Math.PI)*18+Math.cos(y*Math.PI/2)*12+noise*18:kind==='skin'?125+noise*45-(noise<.08?35:0):(x%4===0?0:170+Math.sin(x*2.6+y*.05)*60)*(1-y/150);
  const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=kind==='hair'?(x%4===0?0:Math.round(255*(1-y/150))):255;
 }ctx.putImageData(pixels,0,0);const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='cloth'?8:2,kind==='cloth'?8:2);return t;
}
export function athleteMaterials(color:string,kit:THREE.Texture,id:number){
 const pores=texture(id+42,'skin'),weave=texture(id+19,'cloth');
 const skin=new THREE.MeshPhysicalMaterial({color,bumpMap:pores,bumpScale:.013,roughnessMap:pores,roughness:.8,clearcoat:0,clearcoatRoughness:.18});
 const shirt=new THREE.MeshPhysicalMaterial({map:kit,bumpMap:weave,bumpScale:.019,roughness:.93,sheen:.6,sheenRoughness:.85,sheenColor:new THREE.Color('#d9dfed')});
 shirt.userData.dirt={value:0};
 shirt.onBeforeCompile=shader=>{shader.uniforms.uDirt=shirt.userData.dirt;shader.fragmentShader='uniform float uDirt;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float stain = smoothstep(0.0, 0.7, sin(vMapUv.x*39.0+sin(vMapUv.y*21.0))*sin(vMapUv.y*33.0));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.18,0.14,0.065),stain*uDirt*0.7);`);};
 return {skin,shirt};
}
export function hairCards(color:string,style:string,id:number){
 const group=new THREE.Group();if(style==='bald')return group;
 const map=texture(id+77,'hair');map.repeat.set(1,1);
 const material=new THREE.MeshStandardMaterial({color,alphaMap:map,alphaTest:.25,side:THREE.DoubleSide,roughness:.8});
 const length=style==='long'?.44:style==='curly'?.23:.14;
 for(let i=0;i<12;i++){
  const angle=i/12*Math.PI*2,card=new THREE.Mesh(new THREE.PlaneGeometry(.13,length,2,4),material);
  card.position.set(Math.sin(angle)*.17,.17-(style==='long'?.13:0),Math.cos(angle)*.17);card.rotation.set(.25,angle,Math.sin(i)*.18);group.add(card);
 }return group;
}
