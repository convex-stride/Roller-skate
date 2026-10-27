import { beforeAll, describe, it, expect } from "vitest";
import { RAPIER, Skater, STEP, idle, type Controls } from "../src/physics";
import type { FlipAction } from "../src/input";
import { streetBankGeometry } from "../src/street-bank";
beforeAll(async () => { await RAPIER.init(); });
function setup() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.3, 100).setTranslation(-1000, -0.3, 0));
  const s = new Skater(world, -1000, 0);
  const tick = (controls: Controls, seconds = STEP) => { for (let t = 0; t < seconds - 0.0001; t += STEP) { s.tick(controls, []); world.step(); controls = { ...controls, jumpPressed: false, tricks: [] }; } };
  tick(idle(), 1); return { world, s, tick };
}
describe("aerial flips", () => {
  it.each(["frontflip", "backflip", "leftflip", "rightflip"] as FlipAction[])("takes off, rotates fully and rewards a landed %s", kind => {
    const { world, s, tick } = setup(); const c = idle(); c.tricks = [kind]; tick(c);
    expect(s.jumpCount).toBe(1); expect(s.body.linvel().y).toBeGreaterThan(3);
    let maximum = 0;
    for (let t = 0; t < 1.4; t += STEP) { tick(idle()); maximum = Math.max(maximum, Math.abs(s.airPitch) + Math.abs(s.airRoll)); }
    expect(maximum).toBeGreaterThan(6.2); expect(s.flipLandings).toBe(1); expect(s.lastLandedFlip).toBe(kind);
    expect(s.lastLandingQuality).toBe("perfect"); expect(s.combo).toBeGreaterThanOrEqual(525);
    tick(idle(), 3); expect(s.banked).toBeGreaterThan(500); world.free();
  });
  it("combines a flip, a spin and a grab in a single scored landing", () => {
    const { world, s, tick } = setup(); const c = idle(); c.jump = true; c.jumpPressed = true; c.tricks = ["frontflip", "left", "grab"]; tick(c);
    const held = idle(); held.jump = true; tick(held, 1.3);
    expect(s.flipLandings).toBe(1); expect(s.lastTrick).toMatch(/frontflip/); expect(s.lastTrick).toMatch(/180/); expect(s.lastTrick).toMatch(/Safety grab/);
    expect(s.combo).toBeGreaterThanOrEqual(885); world.free();
  });
  it("rejects an unfinished late flip without awarding the completed-flip counter", () => {
    const { world, s, tick } = setup(); const c = idle(); c.jump = true; c.jumpPressed = true; tick(c);
    const held = idle(); held.jump = true; tick(held, 0.65); held.tricks = ["backflip"]; tick(held); tick(idle(), 0.7);
    expect(s.flipLandings).toBe(0); expect(s.lastLandingQuality).toBe("bail"); expect(s.combo).toBe(0); world.free();
  });
  it("requires extra airtime for a double flip and lands one off an elevated takeoff", () => {
    const { world, s, tick } = setup();
    world.createCollider(RAPIER.ColliderDesc.cuboid(4, 0.2, 4).setTranslation(-1000, 2, 0));
    s.body.setTranslation({ x: -1000, y: 3.05, z: 3.2 }, true); tick(idle(), 0.5);
    s.body.setLinvel({ x: 0, y: 0, z: 6 }, true);
    const c = idle(); c.jump = true; c.jumpPressed = true; c.tricks = ["backflip", "backflip"]; tick(c);
    const held = idle(); held.jump = true; tick(held, 1.7);
    expect(s.flipLandings).toBe(1); expect(s.lastTrick).toMatch(/Double backflip/); expect(s.body.translation().z).toBeGreaterThan(4); world.free();
  });
  it("rides a new street bank and lands a double using its actual collision mesh", () => {
    const { world, s, tick } = setup();
    const bank = streetBankGeometry({ kind: "bank", x: -1000, z: 0, w: 5, d: 8, h: 1.8 });
    world.createCollider(RAPIER.ColliderDesc.trimesh(bank.vertices, bank.indices).setFriction(0.05));
    s.reset(-1000, -9); const push = idle(); push.throttle = 1;
    let elapsed = 0;
    while (s.body.translation().z < 2.8 && elapsed < 10) { tick(push); elapsed += STEP; }
    expect(s.body.translation().z).toBeGreaterThan(2.8); expect(s.body.translation().y).toBeGreaterThan(2.1);
    const takeoff = idle(); takeoff.crouch = true; takeoff.jump = true; takeoff.jumpPressed = true; takeoff.tricks = ["backflip", "backflip"]; tick(takeoff);
    const held = idle(); held.jump = true; tick(held, 2);
    expect(s.flipLandings).toBe(1); expect(s.lastTrick).toMatch(/Double backflip/); expect(s.grounded).toBe(true); world.free();
  });
  it("pops a flip directly out of a real rail grind", () => {
    const { world, s } = setup();
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.06, 0.45, 6).setTranslation(-1000, 0.45, 0));
    const rail = { x: -1000, z: 0, y: 0.9, length: 12, axis: "z" as const };
    s.body.setTranslation({ x: -1000, y: 1.75, z: -3 }, true); s.body.setLinvel({ x: 0, y: -0.1, z: 4 }, true); world.step();
    for (let i = 0; i < 5; i++) { s.tick(idle(), [rail]); world.step(); }
    expect(s.grinding).not.toBe(null);
    const flip = idle(); flip.tricks = ["backflip"]; s.tick(flip, [rail]); world.step();
    expect(s.grinding).toBe(null); expect(s.jumpCount).toBe(1);
    for (let i = 0; i < 100; i++) { s.tick(idle(), [rail]); world.step(); }
    expect(s.flipLandings).toBe(1); expect(s.lastLandedFlip).toBe("backflip"); world.free();
  });
});
