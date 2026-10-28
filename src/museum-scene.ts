import * as THREE from 'three';
import { artCollection } from './art-collection';
import { museumWalls, type DistrictProp } from './district-content';
import { sign, type StreetKit, surface } from './environment';
const plane = new THREE.PlaneGeometry(1,1);
const frameBox = new THREE.BoxGeometry(1,1,1);
const lampMaterial = new THREE.MeshBasicMaterial({color:0xffe3a8});
export const museumGeometries=[plane,frameBox];
const paint = new Map<string, THREE.MeshBasicMaterial>();
const plaques = new Map<string, THREE.MeshBasicMaterial>();
const loader = new THREE.TextureLoader();
export function buildMuseum(group:THREE.Group,p:DistrictProp,city:'gdansk'|'riyadh',k:StreetKit) {
  const baltic=city==='gdansk', wallColor=baltic?0xc19879:0xd7c49e;
  k.box(group,p.x,.035,p.z,12,.04,12,baltic?0xaeb9b4:0xc5bda4);
  for(const wall of museumWalls(p)) { const m=k.box(group,wall.x,p.h/2,wall.z,wall.w,p.h,wall.d,wallColor,true);m.material=surface(baltic?'brick':'plaster',wallColor); }
  // A skylit roof with broad openings preserves daylight and avoids extra lights.
  for(const side of [-1,1]) {
    k.box(group,p.x+side*4.7,4.08,p.z,2.6,.2,12,baltic?0x637f7c:0xb69f76);
    k.box(group,p.x,4.06,p.z+side*5.8,12,.18,.4,0x766953);
    k.box(group,p.x+side*4,3.85,p.z-6,.22,.55,.38,baltic?0x355f62:0x8e7046);
    k.box(group,p.x+side*4.5,1.2,p.z-6.16,1.8,.3,.5,wallColor);
  }
  sign(group,baltic?'BALTIC ART PAVILION':'NAJDI ART COURTYARD',p.x,3.35,p.z-6.16,8,Math.PI,baltic?'#315a60':'#795b36');
  k.box(group,p.x,3.94,p.z-6,8,.18,.45,baltic?0x355c60:0xbda16d);
  // Five genuine works, in shared textures/materials across all pavilions.
  artCollection.forEach((art,i)=>{
    if(!paint.has(art.id)) {
      const texture=loader.load(art.image); texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
      paint.set(art.id,new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
      const c=canvas.getContext('2d')!;c.fillStyle='#f6f0df';c.fillRect(0,0,512,128);c.fillStyle='#273d41';c.textAlign='center';c.font='bold 27px Arial';c.fillText(art.title,256,43,490);c.font='24px Arial';c.fillText(`${art.artist} · ${art.year}`,256,84,490);
      const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;plaques.set(art.id,new THREE.MeshBasicMaterial({map:t,toneMapped:false}));
    }
    const w=Math.min(3.8,2.25*art.aspect),h=w/art.aspect;
    const x=i<2?p.x+(i===0?-3:3):p.x+(i<4?-5.84:5.84),z=i<2?p.z+5.84:p.z+(i===2?-2.7:i===3?2.7:0),yaw=i<2?Math.PI:i<4?Math.PI/2:-Math.PI/2;
    const frame=new THREE.Group(); frame.position.set(x,2.1,z);frame.rotation.y=yaw;group.add(frame);
    const border=new THREE.Mesh(frameBox,k.material(0x71543d,.55,.15));border.scale.set(w+.16,h+.16,.1);border.position.z=-.035;frame.add(border);
    const image=new THREE.Mesh(plane,paint.get(art.id)!);image.scale.set(w,h,1);image.position.z=.025;frame.add(image);
    const plaque=new THREE.Mesh(plane,plaques.get(art.id)!);plaque.scale.set(2.2,.55,1);plaque.position.set(0,-h/2-.4,.035);frame.add(plaque);
    const lamp=new THREE.Mesh(frameBox,lampMaterial);lamp.scale.set(w*.7,.05,.15);lamp.position.set(0,h/2+.18,.1);frame.add(lamp);
  });
}

let grass:THREE.CanvasTexture|undefined;
const greenMaterials=new Map<string,THREE.MeshStandardMaterial>();
export function parkGrass(city:string) {
  if(!grass) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;
    c.fillStyle='#a8b78a';c.fillRect(0,0,256,256);
    for(let i=0;i<5500;i++){const x=(i*73.37)%256,y=(i*113.91)%256;c.strokeStyle=i%2?'#b9c79b':'#73885c';c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(i)*2,y-2-i%4);c.stroke();}
    grass=new THREE.CanvasTexture(canvas);grass.colorSpace=THREE.SRGBColorSpace;grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(4,4);
  }
  if(!greenMaterials.has(city)) greenMaterials.set(city,new THREE.MeshStandardMaterial({map:grass,color:city==='gdansk'?0x829d69:0x9caf75,roughness:1,polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-1}));
  return greenMaterials.get(city)!;
}
