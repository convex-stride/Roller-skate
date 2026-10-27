import { beforeAll, describe, it, expect } from "vitest";
import { RAPIER, Skater, idle, STEP } from "../src/physics";
beforeAll(async()=>{await RAPIER.init();});
function setup(axis:"x"|"z"="z", direction=1, speed=1.6) {
 const world=new RAPIER.World({x:0,y:-9.81,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(100,.3,100).setTranslation(0,-.3,0));
 const rail={x:0,z:0,y:.845,length:100,axis};
 world.createCollider(RAPIER.ColliderDesc.cuboid(axis==='x'?50:.045,.045,axis==='z'?50:.045).setTranslation(0,.8,0));
 const s=new Skater(world,0,0);s.heading=axis==='x'?direction*Math.PI/2:direction<0?Math.PI:0;
 s.body.setTranslation({x:0,y:1.7,z:0},true);s.body.setLinvel({x:axis==='x'?direction*speed:0,y:-.2,z:axis==='z'?direction*speed:0},true);world.step();
 const step=(c=idle())=>{s.tick(c,[rail]);world.step();};step();return{world,s,rail,step};
}
describe('rail flow',()=>{
 it.each(['x','z'] as const)('keeps low-speed %s catches moving and responds to Push',axis=>{
  const {world,s,step}=setup(axis);expect(s.grinding).not.toBeNull();const push=idle();push.throttle=1;
  for(let i=0;i<180;i++)step(push);
  expect(s.grinding).not.toBeNull();expect(s.speed).toBeGreaterThan(2);expect(s.grindingDistance).toBeGreaterThan(6);world.free();
 });
 it('preserves a backwards grind direction when it slows down',()=>{
  const {world,s,step}=setup('z',-1);const push=idle();push.throttle=1;for(let i=0;i<240;i++)step(push);
  expect(s.body.translation().z).toBeLessThan(-6);expect(s.body.linvel().z).toBeLessThan(-1);world.free();
 });
 it('releases a physically blocked grind instead of locking the rider in place',()=>{
  const {world,s,step}=setup('z',1,4);world.createCollider(RAPIER.ColliderDesc.cuboid(2,2,.2).setTranslation(0,2,3));
  const push=idle();push.throttle=1;for(let i=0;i<150;i++)step(push);
  expect(s.grinding).toBeNull();expect(s.body.translation().z).toBeLessThan(3);world.free();
 });
 it('allows an intentional slow catch without requiring a fast run-up',()=>{
  const {world,s,rail}=setup('z',1,.3);const push=idle();push.throttle=1;s.tick(push,[rail]);world.step();
  expect(s.grinding).not.toBeNull();expect(s.speed).toBeGreaterThan(1);world.free();
 });
});
