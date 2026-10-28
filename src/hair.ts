import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export const hairStyles = ['tapered crop','soft curls','low bob','braided nape','swept waves'] as const;
const cache = new Map<string,THREE.BufferGeometry>();
const materials = new Map<number,THREE.MeshStandardMaterial>();
const shades = [0x29201b,0x483024,0x755037,0xb18a56,0x342723,0x50392c];
export function hairMaterial(index:number) {
  const color=shades[index%shades.length];
  if(!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({color,vertexColors:true,roughness:.76}));
  return materials.get(color)!;
}
function tinted(g:THREE.BufferGeometry,value:number) {
  g.deleteAttribute('uv');
  const p=g.getAttribute('position'),c=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const v=value+Math.max(0,p.getY(i))*.4;c.set([v,v*.96,v*.9],i*3);}
  g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;
}
function cap(distant=false) {
  const positions:number[]=[],indices:number[]=[],rows=distant?6:10,cols=distant?12:24;
  for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++) {
    const phi=c/cols*Math.PI*2,front=Math.max(0,Math.cos(phi)),end=2.38-front*1.18,theta=.12+(end-.12)*r/rows;
    positions.push(Math.sin(phi)*Math.sin(theta)*.114,Math.cos(theta)*.137,Math.cos(phi)*Math.sin(theta)*.117);
  }
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return tinted(g,.68);
}
export function hairGeometry(style:number| 'taqee', distant=false) {
  const key=`${style}:${distant}`;if(cache.has(key))return cache.get(key)!;
  const parts:THREE.BufferGeometry[]=[cap(distant)];
  if(!distant) {
    const variant=style==='taqee'?4:style%hairStyles.length;
    const count=variant===1?32:variant===3?18:22;
    for(let i=0;i<count;i++) {
      const a=Math.PI*.48+i/(count-1)*Math.PI*1.04,y=-.035-(variant===2?.035:0)+Math.sin(i*2.1)*.012;
      if(variant===1) {
        const curl=new THREE.SphereGeometry(.019+(i%3)*.001,6,5);curl.scale(1,.8,1);curl.translate(Math.sin(a)*.107,y,Math.cos(a)*.114);parts.push(tinted(curl,.74+(i%4)*.045));
      } else {
        const x=Math.sin(a)*.112,z=Math.cos(a)*.119,length=variant===2?.095:variant===3?.115:.055;
        const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,y+.04,z),new THREE.Vector3(x*1.025,y,z*1.035),new THREE.Vector3(x*.93,y-length,z*.98)]);
        parts.push(tinted(new THREE.TubeGeometry(curve,5,variant===3?.011:.007,4,false),.69+(i%4)*.05));
      }
    }
    // Swept, overlapping fringe locks sit below the helmet lip, above the eyes.
    if(variant===4||variant===0) for(let i=0;i<11;i++) {
      const x=-.086+i*.015;
      const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(x,.074,.087),new THREE.Vector3(x+.035,.069,.115),new THREE.Vector3(x+.02,.044,.12),new THREE.Vector3(x+.012,.028+(i%3)*.004,.111));
      parts.push(tinted(new THREE.TubeGeometry(curve,6,.0065,4,false),.8+(i%3)*.04));
    }
  }
  const flat=parts.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(flat)!;
  new Set([...parts,...flat]).forEach(g=>g.dispose());cache.set(key,merged);return merged;
}
