import { cityStarts, landmarks } from "./city-profile";
import { centers, clearGround, streets, type City } from "./world";
import { iceVenueAt } from "./ice-rinks";
export type FreeSpawn = { id: string; city: City; x: number; z: number; heading: number; name: string };
const cache = new Map<City, FreeSpawn[]>();
export function freeSpawns(city: City) {
 if(cache.has(city)) return cache.get(city)!;
 const candidates:FreeSpawn[]=[{...cityStarts[city],id:`${city}-arrival`,city},...landmarks.filter(l=>l.city===city).map(l=>({id:`${city}-${l.id}`,city,...l.spawn,heading:Math.atan2(l.x-l.spawn.x,l.z-l.spawn.z),name:l.name}))];
 for(const [ix,iz] of [[0,0],[7,7],[0,7],[7,0],[2,6],[5,1],[1,3],[6,4],[3,1],[4,6]]) {
  const x=centers[city]-700+ix*200,z=-700+iz*200,road=streets(x,z,city).find(r=>r.d>40||r.w>40);
  if(road)candidates.push({id:`${city}-street-${ix}-${iz}`,city,x:road.x,z:road.z,heading:road.d>road.w?0:Math.PI/2,name:city==='gdansk'?'Baltic neighbourhood lines':'Riyadh boulevard lines'});
 }
 const safe=candidates.filter(s=>!iceVenueAt(s.x,s.z)&&[0,2,4,6,8].every(d=>clearGround(s.x+Math.sin(s.heading)*d,s.z+Math.cos(s.heading)*d,.85)));
 cache.set(city,safe);return safe;
}
/** A shuffled bag visits every safe location before repeating; history survives reloads. */
export class SpawnDeck {
 private bags = new Map<City, FreeSpawn[]>();
 private history:Partial<Record<City,string>>={};
 constructor(private random= Math.random, private storage?:Pick<Storage,'getItem'|'setItem'>) {
  try {const v=JSON.parse(storage?.getItem('layans-spawn-history-v1')||'{}');for(const city of ['gdansk','riyadh'] as const) if(typeof v?.[city]==='string')this.history[city]=v[city];}catch{}
 }
 next(city:City) {
  let bag=this.bags.get(city);
  if(!bag?.length){bag=[...freeSpawns(city)];for(let i=bag.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(this.random()*(i+1))));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag.length>1&&bag[bag.length-1].id===this.history[city])[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
   this.bags.set(city,bag);
  }
  const spawn=bag.pop()??{...cityStarts[city],city,id:`${city}-arrival`};this.history[city]=spawn.id;
  try{this.storage?.setItem('layans-spawn-history-v1',JSON.stringify(this.history));}catch{}
  return spawn;
 }
}
