import * as THREE from 'three';
/** Continuous elliptical anatomical sections, with shared vertices and UVs. */
export function humanSurface(sections:number[][],segments=32){
 const coarse=sections,refined:number[][]=[];
 for(let r=0;r<coarse.length-1;r++)for(let step=0;step<5;step++){
  const t=step/5;refined.push(Array.from({length:4},(_,k)=>{const a=coarse[Math.max(0,r-1)][k]??0,b=coarse[r][k]??0,c=coarse[r+1][k]??0,d=coarse[Math.min(coarse.length-1,r+2)][k]??0;return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}));
 }refined.push(coarse[coarse.length-1]);sections=refined;
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let r=0;r<sections.length;r++){
  const [y,rx,rz,offset=0]=sections[r];for(let j=0;j<=segments;j++){
   const angle=j/segments*Math.PI*2;positions.push(Math.sin(angle)*rx,y,Math.cos(angle)*rz+offset);uv.push(j/segments,r/(sections.length-1));
   if(r&&j){const b=r*(segments+1)+j,a=b-segments-1;indices.push(a-1,a,b-1,b-1,a,b);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function faceMorphGeometry(){
 const g=humanSurface([[-.285,.06,.09,.025],[-.24,.135,.145,.035],[-.17,.18,.18,.025],[-.08,.215,.2,0],[.02,.222,.215,0],[.11,.215,.209,-.006],[.2,.195,.19,-.012],[.275,.13,.135,-.015],[.3,.025,.03,-.015]],40);
 const base=g.getAttribute('position');g.morphTargetsRelative=true;
 g.morphAttributes.position=['jaw','nose','mouth','eyes','eyeSize'].map(key=>{
  const delta=new Float32Array(base.count*3);
  for(let i=0;i<base.count;i++){
   const x=base.getX(i),y=base.getY(i),z=base.getZ(i),front=Math.max(0,z/.22);
   if(key==='jaw')delta[i*3]=x*Math.max(0,1-(y+.22)*5);
   if(key==='nose')delta[i*3+2]=Math.exp(-x*x/0.0015-y*y/.012)*front*.1;
   if(key==='mouth')delta[i*3]=x*Math.exp(-((y+.14)**2)/.002)*front*.6;
   if(key==='eyes')delta[i*3]=x*Math.exp(-((y-.065)**2)/.003)*front*.65;
   if(key==='eyeSize')delta[i*3+1]=(y-.065)*Math.exp(-((y-.065)**2)/.003)*front;
  }
  const target=new THREE.BufferAttribute(delta,3);target.name=key;return target;
 });return g;
}
