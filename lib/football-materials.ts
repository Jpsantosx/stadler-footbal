import * as THREE from 'three';
function texture(seed:number,kind:'skin'|'cloth'|'hair'){
 const canvas=document.createElement('canvas');const size=kind==='skin'?512:256;canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed>>>24)/255;
  const value=kind==='cloth'?128+Math.sin(x*Math.PI)*18+Math.cos(y*Math.PI/2)*12+noise*18:kind==='skin'?125+noise*45-(noise<.08?35:0):(x%4===0?0:170+Math.sin(x*2.6+y*.05)*60)*(1-y/(size*1.1));
  const i=(y*size+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=kind==='hair'?(x%4===0?0:Math.round(255*(1-y/(size*1.1)))):255;
 }ctx.putImageData(pixels,0,0);const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='cloth'?8:2,kind==='cloth'?8:2);return t;
}
function normalFromHeight(source:THREE.CanvasTexture){
 const canvas=source.image as HTMLCanvasElement,size=canvas.width,data=canvas.getContext('2d')!.getImageData(0,0,size,size).data,pixels=new Uint8Array(size*size*4);
 const at=(x:number,y:number)=>data[(((y+size)%size)*size+(x+size)%size)*4]/255;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=new THREE.Vector3((at(x-1,y)-at(x+1,y))*.5,(at(x,y-1)-at(x,y+1))*.5,1).normalize(),i=(y*size+x)*4;pixels[i]=(n.x*.5+.5)*255;pixels[i+1]=(n.y*.5+.5)*255;pixels[i+2]=(n.z*.5+.5)*255;pixels[i+3]=255;}
 const map=new THREE.DataTexture(pixels,size,size);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.copy(source.repeat);map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;return map;
}
export function athleteMaterials(color:string,kit:THREE.Texture,id:number){
 const pores=texture(id+42,'skin'),weave=texture(id+19,'cloth');
 const skin=new THREE.MeshPhysicalMaterial({color,normalMap:normalFromHeight(pores),normalScale:new THREE.Vector2(.7,.7),roughnessMap:pores,roughness:.8,clearcoat:0,clearcoatRoughness:.18});
 const shirt=new THREE.MeshPhysicalMaterial({map:kit,normalMap:normalFromHeight(weave),normalScale:new THREE.Vector2(.6,.6),roughnessMap:weave,roughness:.93,sheen:.6,sheenRoughness:.85,sheenColor:new THREE.Color('#d9dfed')});
 // Wrapped back-light diffusion approximates thin skin; it is not a scanned skin asset.
 skin.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 #if NUM_DIR_LIGHTS > 0
 float skinBack=pow(clamp(dot(-normal,directionalLights[0].direction)+0.35,0.0,1.0),2.0);
 reflectedLight.directDiffuse+=diffuseColor.rgb*vec3(1.0,0.35,0.22)*directionalLights[0].color*skinBack*0.14;
 #endif`);};
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
 for(let i=0;i<24;i++){
  const angle=i/24*Math.PI*2,card=new THREE.Mesh(new THREE.PlaneGeometry(.13,length,2,4),material);
  card.position.set(Math.sin(angle)*.17,.17-(style==='long'?.13:0),Math.cos(angle)*.17);card.rotation.set(.25,angle,Math.sin(i)*.18);group.add(card);
 }return group;
}
