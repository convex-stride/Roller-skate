import { beforeAll, describe, expect, it } from "vitest";
import { RAPIER, Skater, idle, STEP, type Controls } from "../src/physics";
import { figureMoves, figurePose } from "../src/figure-skating";
import { iceRinks } from "../src/ice-rinks";
beforeAll(async () => { await RAPIER.init(); });
function setup(ice = true) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.createCollider(RAPIER.ColliderDesc.cuboid(2000, .3, 900).setTranslation(0, -.3, 0));
  const r = iceRinks[0], s = new Skater(world, ice ? r.x : 0, ice ? r.z - 18 : 0);
  function tick(seconds: number, c: Controls = idle()) { for (let t = 0; t < seconds - .0001; t += STEP) { s.tick(c, []); world.step(); c = { ...c, tricks: [], jumpPressed: false }; } }
  tick(.7); return { world, s, tick };
}
describe("figure skating moves", () => {
  it.each(figureMoves)("completes $name through real physics, awards once and remains on the ice", move => {
    const { world, s, tick } = setup(); const c = idle(); c.tricks = [move.id]; tick(STEP, c); tick(6);
    expect(s.figure.lastResult?.action, s.figure.message).toBe(move.id); expect(s.figure.completed).toBe(1);
    expect(s.figure.lastResult!.points).toBeGreaterThan(100); expect(s.banked + s.combo).toBeGreaterThan(100);
    expect(s.grounded).toBe(true); expect(s.body.translation().y).toBeGreaterThan(.7);
    tick(3); expect(s.figure.completed).toBe(1); world.free();
  });
  it("rejects figure moves outside ice and cancels a spin cleanly when braking", () => {
    const road = setup(false), input = idle(); input.tricks = ["camel"]; road.tick(1, input); expect(road.s.figure.completed).toBe(0); expect(road.s.figure.action).toBe(null); road.world.free();
    const ice = setup(), c = idle(); c.tricks = ["upright"]; ice.tick(.8, c); const brake = idle(); brake.brake = 1; ice.tick(1, brake);
    expect(ice.s.figure.action).toBe(null); expect(ice.s.figure.completed).toBe(0); expect(Number.isFinite(ice.s.figure.rotation)).toBe(true); ice.world.free();
  });
  it("keeps the hands on their anatomical sides and extends distinct sit and camel poses", () => {
    const sit = figurePose({ pose: "sit", phase: "performing", mix: 1 }), camel = figurePose({ pose: "camel", phase: "performing", mix: 1 });
    expect(sit.bodyY).toBeLessThan(camel.bodyY); expect(camel.feet[1].y).toBeGreaterThan(.8);
    expect(camel.hands[0].x).toBeGreaterThan(0); expect(camel.hands[1].x).toBeLessThan(0);
    expect(camel.feet[1].x).toBeLessThan(0);
    expect(camel.feet[1].z).toBeLessThan(-.8); expect(sit.feet[1].z).toBeGreaterThan(.4);
  });
});

describe("Taqee's mirror duet", () => {
  it.each([0,1,2,3])("physically completes all matching elements with Layan in duet variant %s", async attempt => {
    const { Companion } = await import("../src/companion");
    const { IceGame } = await import("../src/ice-games");
    const { world, s, tick } = setup(); const partner = new Companion(world, s);
    expect(partner.call()).toBe(true); partner.command("pairs");
    const game = new IceGame(iceRinks[0], "duet", 0, 0, attempt);
    function step(c: Controls) {
      s.tick(c, []); partner.tick(null); world.step();
      game.tick({ ...s.body.translation(), onIce: true, grounded: s.grounded, figure: s.figure.lastResult, partner: { ...partner.skater!.body.translation(), active: true, generation: partner.spawnId, figure: partner.skater!.figure.lastResult } }, STEP);
    }
    for (let i = 0; i < 60; i++) step(idle());
    for (const action of game.sequence) {
      const before = game.stage, c = idle(); c.tricks = [action]; step(c);
      for (let i = 0; i < 600 && game.stage === before; i++) step(idle());
      expect(game.stage, JSON.stringify({ player: s.figure.view, partner: partner.state, game: game.view })).toBe(before + 1);
      for (let i = 0; i < 30; i++) step(idle());
    }
    expect(game.status).toBe("won"); world.free();
  });
});

describe("neon ribbon course", () => {
  it("can be completed by steering a real skater through the ordered gates within the time limit", async () => {
    const { IceGame } = await import("../src/ice-games");
    const { rinkSolids, iceAt } = await import("../src/ice-rinks");
    const { world, s } = setup();
    for (const b of rinkSolids(iceRinks[0])) world.createCollider(RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.y, b.z));
    const game = new IceGame(iceRinks[0], "slalom");
    for (let frame = 0; frame < 60 / STEP && game.status === "playing"; frame++) {
      const p = s.body.translation(), goal = game.goal!, c = idle();
      const desired = Math.atan2(goal.x - p.x, goal.z - p.z), error = Math.atan2(Math.sin(desired - s.heading), Math.cos(desired - s.heading));
      c.steer = Math.max(-1, Math.min(1, error * 2));
      c.brake = Math.abs(error) > .65 && s.speed > 2 ? 1 : 0;
      c.throttle = Math.abs(error) < .8 && s.speed < 4 ? .65 : 0;
      s.tick(c, []); world.step();
      game.tick({ ...s.body.translation(), onIce: !!iceAt(s.body.translation().x, s.body.translation().z), grounded: s.grounded, figure: null, partner: null }, STEP);
    }
    expect(game.status, JSON.stringify({ game: game.view, position: s.body.translation() })).toBe("won"); world.free();
  });
});
