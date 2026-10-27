import * as THREE from 'three';
import type { Skater } from './physics';
import type { FreeSpawn } from './spawn-points';
import './ride-presentation.css';
export function createRidePresentation(scene:THREE.Scene,mobile:boolean) {
 const hud=document.getElementById('hud')!;
 hud.insertAdjacentHTML('beforeend','<aside id="arrival-banner" aria-live="polite"><small id="arrival-city"></small><strong id="arrival-place"></strong><span>FIND YOUR NEXT LINE</span></aside><aside id="rail-flow" class="hidden" aria-label="Rail grind progress"><div><span id="rail-style"></span><b id="rail-metres"></b></div><div class="rail-track"><i id="rail-fill"></i></div><p id="rail-help"></p></aside>');
 const el=(id:string)=>document.getElementById(id)!;
 const count=mobile?24:48, positions=new Float32Array(count*3), geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 const sparks=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffd796,size:.025,transparent:true,opacity:.75,depthWrite:false}));sparks.frustumCulled=false;sparks.visible=false;scene.add(sparks);
 let arrivalUntil=0;
 return {
  arrive(spawn:Pick<FreeSpawn,'city'|'name'>,practice=false){el('arrival-city').textContent=`${spawn.city==='gdansk'?'GDAŃSK':'RIYADH'} / ${practice?'RAIL PRACTICE':'FREE SKATE'}`;el('arrival-place').textContent=spawn.name;arrivalUntil=performance.now()+3200;el('arrival-banner').classList.add('visible');},
  update(s:Skater,playing:boolean,paused:boolean,reduced:boolean,time:number){
   const active=playing&&!paused&&!!s.grinding;
   document.body.classList.toggle('rail-active',active);el('rail-flow').classList.toggle('hidden',!active);
   el('arrival-banner').classList.toggle('visible',playing&&!paused&&performance.now()<arrivalUntil);
   const r=s.grinding,p=s.body.translation(), info=s.railView;
   if(active&&r&&info){el('rail-style').textContent=s.grindStyle.toUpperCase();el('rail-metres').textContent=`${info.distance.toFixed(1)} m`;el('rail-fill').style.width=`${info.progress*100}%`;el('rail-help').textContent=mobile?`Push to keep speed · JUMP to pop · Brake to exit`:`W / ↑ keep speed · Space pop · S exit · ${info.remaining.toFixed(1)} m left`;}
   sparks.visible=active&&!reduced&&s.speed>.6;
   if(sparks.visible&&r){for(let i=0;i<count;i++){const age=((time*4+i/count)%1),direction=info!.direction;positions[i*3]=p.x-(r.axis==='x'?direction*age*.85:0)+Math.sin(i*2.4)*age*.09;positions[i*3+1]=r.y+.04+Math.sin(age*Math.PI)*.11-age*age*.15;positions[i*3+2]=p.z-(r.axis==='z'?direction*age*.85:0)+Math.cos(i*2.4)*age*.09;}geometry.getAttribute('position').needsUpdate=true;}
  },
 };
}
