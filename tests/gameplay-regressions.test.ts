import { beforeAll, describe, expect, it } from "vitest";
import { RAPIER, Skater, idle, STEP } from "../src/physics";
import { iceRinks } from "../src/ice-rinks";
import { FigureSkating, figurePose } from "../src/figure-skating";
beforeAll(async () => { await RAPIER.init(); });
function setup() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }), rink = iceRinks[0];
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, .3, 100).setTranslation(rink.x, -.3, rink.z));
  const s = new Skater(world, rink.x, rink.z - 18);
  function step(c = idle()) { s.tick(c, []); world.step(); }
  for (let i = 0; i < 40; i++) step();
  return { world, s, step };
}
describe("gameplay regressions", () => {
  it("a manual jump interrupts an assisted jump instead of queuing a second takeoff", () => {
    const { world, s, step } = setup(), figure = idle(); figure.tricks = ["axel"]; step(figure);
    const jump = idle(); jump.jumpPressed = jump.jump = true; step(jump);
    expect(s.figure.action).toBe(null);
    for (let i = 0; i < 180; i++) step();
    expect(s.jumpCount).toBe(1); expect(s.figure.completed).toBe(0); world.free();
  });
  it("does not treat the top of another rider as skateable ground", () => {
    const { world, s, step } = setup(), p = s.body.translation();
    const other = new Skater(world, p.x, p.z); other.body.setTranslation({x:p.x,y:.2,z:p.z}, true);
    s.body.setTranslation({x:p.x,y:1.8,z:p.z},true); s.body.setLinvel({x:0,y:-.1,z:0},true); world.step();
    s.tick(idle(), []); expect(s.grounded).toBe(false); world.free();
  });
  it("does not count landing quality as a separate stunt for variety bonuses", () => {
    const { world, s } = setup(); s.addTrick("Backflip",450); s.addTrick("Perfect landing",75,null);
    expect(s.style.view.unique).toBe(1); expect(s.style.bonus).toBe(0);
    s.addTrick("Safety grab",180); expect(s.style.bonus).toBe(0);
    s.addTrick("180° spin",180); expect(s.style.bonus).toBe(100); world.free();
  });
  it("travelling twizzles finish without unwinding another two turns", () => {
    const f = new FigureSkating(); f.start("twizzle",true,true);
    for(let i=0;i<240;i++) f.step({x:0,z:i*STEP*2,speed:2,ice:true,grounded:true,cancel:false},STEP);
    expect(f.completed).toBe(1); expect(Math.abs(f.rotation)).toBeLessThan(.1);
  });
  it("starting the next move does not instantly replace the previous landing pose", () => {
    const f = new FigureSkating(); f.start("axel",true,true); f.phase="airborne"; f.mix=1; f.land(true,0,false);
    const landing = figurePose(f.view); f.start("camel",true,true); expect(figurePose(f.view)).toEqual(landing);
  });
});
