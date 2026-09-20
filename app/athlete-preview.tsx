"use client";
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createFootballAthlete,updateAthleteShape,disposeAthlete,type Athlete} from '@/lib/football-athlete';
import {createMatch,TEAMS,type PlayerLook} from '@/lib/football-engine';
export default function AthletePreview3D({look,clubId,name,number}:{look:PlayerLook;clubId:string;name:string;number:number}){
 const canvasRef=useRef<HTMLCanvasElement>(null),modelRef=useRef<Athlete|null>(null),lookRef=useRef(look);
 const [unavailable,setUnavailable]=useState(false);
 useEffect(()=>{lookRef.current=look;if(modelRef.current)updateAthleteShape(modelRef.current,look);},[look]);
 // Only topology/material changes rebuild; sliders update the existing morph targets.
 const appearanceKey=[look.skin,look.hair,look.style,look.beard,look.boots,look.wristband,look.socks,look.tucked].join('|');
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});}catch{const timer=setTimeout(()=>setUnavailable(true),0);return()=>clearTimeout(timer);}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#15232d');
  const camera=new THREE.PerspectiveCamera(31,1,.1,30);camera.position.set(2.4,2.2,8.8);camera.lookAt(0,1.85,0);
  scene.add(new THREE.HemisphereLight('#ecf3ff','#493b32',2.3));
  const key=new THREE.DirectionalLight('#ffe9d2',3.4);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
  const rim=new THREE.DirectionalLight('#a8caff',2.1);rim.position.set(3,4,-3);scene.add(rim);
  const team=TEAMS.find(t=>t.id===clubId)??TEAMS[0],state=createMatch(team,TEAMS.find(t=>t.id!==team.id)!,'normal');
  const player=state.players.find(p=>p.side==='home'&&p.role==='FW')!;player.appearance={...lookRef.current};player.name='Seu atleta';player.number=number;
  const a=createFootballAthlete(player,team);a.root.position.set(0,0,0);a.ring.visible=a.label.visible=false;modelRef.current=a;scene.add(a.root);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(2.8,64),new THREE.MeshStandardMaterial({color:'#263945',roughness:.8}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const resize=()=>{const r=canvas.getBoundingClientRect();if(r.width&&r.height){renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}};
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();let frame=0,last=0;
  const render=(now:number)=>{if(!document.hidden&&now-last>33){a.head.rotation.y=Math.sin(now*.0004)*.06;renderer.render(scene,camera);last=now;}frame=requestAnimationFrame(render);};frame=requestAnimationFrame(render);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();modelRef.current=null;disposeAthlete(scene);key.shadow.dispose();renderer.dispose();};
 },[appearanceKey,clubId,number]);
 return <div className="athlete-preview-3d"><canvas ref={canvasRef} aria-label={`Modelo 3D de ${name||'seu atleta'}`}/>{unavailable&&<p role="status">Preview 3D indisponível neste navegador. A personalização continua salva para a partida.</p>}<strong>{name||'SEU CRAQUE'}</strong><small>{look.height} cm · {look.weight??75} kg</small></div>;
}
