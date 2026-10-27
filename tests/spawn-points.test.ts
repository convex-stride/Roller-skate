import { describe,it,expect } from 'vitest';
import { SpawnDeck,freeSpawns } from '../src/spawn-points';
import { clearGround,cityAt,inWorld } from '../src/world';
describe('free skate starting locations',()=>{
 it.each(['gdansk','riyadh'] as const)('offers safe, varied %s starts with a clear run-out',city=>{
  const pool=freeSpawns(city);expect(pool.length).toBeGreaterThanOrEqual(8);
  for(const s of pool){expect(inWorld(s.x,s.z)).toBe(true);expect(cityAt(s.x)).toBe(city);for(let d=0;d<=8;d+=2)expect(clearGround(s.x+Math.sin(s.heading)*d,s.z+Math.cos(s.heading)*d,.85),s.id).toBe(true);}
 });
 it('visits a full shuffled bag before repeating and avoids the last location after a reload',()=>{
  const data=new Map<string,string>(), storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};
  const deck=new SpawnDeck(()=>.4,storage), count=freeSpawns('gdansk').length, ids=Array.from({length:count},()=>deck.next('gdansk').id);
  expect(new Set(ids).size).toBe(count);expect(deck.next('gdansk').id).not.toBe(ids.at(-1));
  const previous=JSON.parse(data.get('layans-spawn-history-v1')!).gdansk;
  expect(new SpawnDeck(()=>.4,storage).next('gdansk').id).not.toBe(previous);
 });
});
