import { describe, expect, it, beforeAll } from 'vitest';
import { culturePlaces } from '../src/culture';
import { clearGround, districtSites, centers } from '../src/world';
import { museumWalls, type DistrictProp } from '../src/district-content';
import { streetBankGeometry } from '../src/street-bank';
import { quests } from '../src/quests';
import { RAPIER, Skater, idle, STEP } from '../src/physics';
import { hairGeometry, hairStyles } from '../src/hair';
import { findRoute } from '../src/navigation';
beforeAll(async()=>{await RAPIER.init();});
describe('distributed culture and green spaces',()=>{
  it('spreads accessible museum, garden and stunt destinations through both cities',()=>{
    for(const city of ['gdansk','riyadh'] as const)for(const kind of ['museum','garden','playground'] as const){
      const places=culturePlaces.filter(p=>p.city===city&&p.kind===kind);
      expect(places.length).toBeGreaterThanOrEqual(4);
      for(const p of places)expect(clearGround(p.x,p.z,.7),p.id).toBe(true);
    }
    expect(new Set(culturePlaces.map(p=>p.id)).size).toBe(culturePlaces.length);
  });
  it('keeps all 128 quest arrivals and bank practice approaches open',()=>{
    expect(quests.length).toBe(128);
    for(const q of quests){expect(clearGround(q.anchor.x,q.anchor.z-5,.7),q.id).toBe(true);expect(clearGround(q.anchor.x,q.anchor.z,.7),q.id).toBe(true);}
  });
  it('leaves gallery interiors and their broad doors navigable, while walls block movement',()=>{
    for(const place of culturePlaces.filter(p=>p.kind==='museum')) {
      const p=place.exhibit!;
      for(let z=-5.8;z<5;z+=1)expect(clearGround(p.x,p.z+z,.6)).toBe(true);
      for(const wall of museumWalls(p))expect(clearGround(wall.x,wall.z,.2)).toBe(false);
    }
  });
  it('routes from the public courtyard into every museum through clear ground',()=>{
    for(const p of culturePlaces.filter(p=>p.kind==='museum')){
      const route=findRoute({x:p.site.x,z:p.site.z},{x:p.x,z:p.z});expect(route.length,p.id).toBeGreaterThan(1);
      for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.5);for(let j=0;j<=n;j++)expect(clearGround(a.x+(b.x-a.x)*j/Math.max(n,1),a.z+(b.z-a.z)*j/Math.max(n,1),.65),p.id).toBe(true);}
    }
  });
  it('keeps the original banks and adds a substantial mix of curved ramps and funboxes',()=>{
    const counts={bank:0,quarter:0,funbox:0,green:0};
    for(const city of ['gdansk','riyadh'] as const)for(let x=0;x<8;x++)for(let z=0;z<8;z++)for(const site of districtSites(centers[city]-700+x*200,-700+z*200,city)){
      if(site.green)counts.green++;
      for(const p of site.props)if(p.kind==='bank'||p.kind==='quarter'||p.kind==='funbox')counts[p.kind]++;
    }
    expect(counts.bank).toBeGreaterThan(600);expect(counts.quarter).toBeGreaterThan(20);expect(counts.funbox).toBeGreaterThan(20);expect(counts.green).toBeGreaterThan(100);
  });
});
describe('skate obstacle meshes',()=>{
  for(const kind of ['quarter','funbox'] as const)it(`${kind} has a closed physical top that supports the rider`,()=>{
    const p:DistrictProp={kind,x:0,z:0,w:6,d:7,h:1.8},data=streetBankGeometry(p),world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=STEP;
    world.createCollider(RAPIER.ColliderDesc.cuboid(20,.1,20).setTranslation(0,-.1,0));
    world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices,data.indices));
    // Update the broad phase before probing the newly created mesh.
    world.step();
    const surface=world.castRay(new RAPIER.Ray({x:0,y:5,z:0},{x:0,y:-1,z:0}),10,true)!;
    expect(5-surface.timeOfImpact).toBeGreaterThan(.2);
    const y=kind==='quarter'?.015+(1-Math.sqrt(.75))*(1.8-.015):1.8,s=new Skater(world,0,0);s.body.setTranslation({x:0,y:y+1.1,z:0},true);
    for(let n=0;n<120;n++){s.tick(idle(),[]);world.step();}
    const at=s.body.translation(),ground=world.castRay(new RAPIER.Ray({x:at.x,y:5,z:at.z},{x:0,y:-1,z:0}),10,true,undefined,undefined,s.collider,s.body)!;
    // A quarter pipe is sloped: an idle rider may roll downhill, but must remain
    // supported by its actual surface rather than pass through the mesh.
    expect(at.y-(5-ground.timeOfImpact)).toBeGreaterThan(.7);expect(at.y-(5-ground.timeOfImpact)).toBeLessThan(1);world.free();
  });
});
it('uses finite, distinct hair meshes and a lightweight far-distance cap',()=>{
  const geometries=[...hairStyles.map((_,i)=>hairGeometry(i)),hairGeometry('taqee')];
  for(const g of geometries){expect(g.getAttribute('position').count).toBeGreaterThan(100);expect([...g.getAttribute('position').array].every(Number.isFinite)).toBe(true);}
  expect(hairGeometry(0,true).getAttribute('position').count).toBeLessThan(hairGeometry('taqee').getAttribute('position').count);
});
