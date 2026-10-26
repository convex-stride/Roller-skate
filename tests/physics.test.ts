import { beforeAll, describe, it, expect } from "vitest";
import { RAPIER, Skater, STEP, idle } from "../src/physics";
import {
  activities,
  tokens,
  buildings,
  centers,
  inWorld,
  routeFor,
  clearGround,
} from "../src/world";
beforeAll(async () => {
  await RAPIER.init();
});
function setup(x = 0, z = 0) {
  const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  w.timestep = STEP;
  w.createCollider(
    RAPIER.ColliderDesc.cuboid(200, 0.3, 200).setTranslation(x, -0.3, z),
  );
  const s = new Skater(w, x, z);
  return { w, s };
}
function run(w: RAPIER.World, s: Skater, n: number, c = idle()) {
  for (let i = 0; i < n; i++) {
    s.tick(c, []);
    w.step();
  }
}
describe("physical skating", () => {
  it("responds to city paving with different rolling losses", () => {
    const stone = setup(-1000),
      smooth = setup(1020);
    run(stone.w, stone.s, 120);
    run(smooth.w, smooth.s, 120);
    for (const a of [stone, smooth])
      a.s.body.setLinvel({ x: 0, y: 0, z: 8 }, true);
    run(stone.w, stone.s, 180);
    run(smooth.w, smooth.s, 180);
    expect(stone.s.surface).toBe("STONE");
    expect(smooth.s.surface).toBe("LIMESTONE");
    expect(smooth.s.speed).toBeGreaterThan(stone.s.speed + 0.08);
    stone.w.free();
    smooth.w.free();
  });
  it("does not restart manuals indefinitely when the button stays held", () => {
    const { w, s } = setup();
    run(w, s, 120);
    const c = idle();
    c.manual = true;
    c.throttle = 1;
    run(w, s, 480, c);
    const banked = s.banked,
      combo = s.combo;
    run(w, s, 180, c);
    expect(s.manualActive).toBe(false);
    expect(s.banked + s.combo).toBe(banked + combo);
    c.manual = false;
    run(w, s, 1, c);
    c.manual = true;
    run(w, s, 20, c);
    expect(s.manualActive).toBe(true);
    w.free();
  });
  it("preserves airborne momentum instead of steering or accelerating in midair", () => {
    const { w, s } = setup();
    s.body.setTranslation({ x: 0, y: 8, z: 0 }, true);
    s.body.setLinvel({ x: 0, y: 0, z: 6 }, true);
    const c = idle();
    c.steer = 1;
    c.throttle = 1;
    run(w, s, 30, c);
    expect(Math.abs(s.body.linvel().x)).toBeLessThan(0.01);
    expect(s.body.linvel().z).toBeLessThan(6);
    expect(s.body.linvel().z).toBeGreaterThan(5.5);
    w.free();
  });
  it("reduces aerodynamic losses in a tuck", () => {
    const a = setup(),
      b = setup();
    run(a.w, a.s, 120);
    run(b.w, b.s, 120);
    a.s.body.setLinvel({ x: 0, y: 0, z: 10 }, true);
    b.s.body.setLinvel({ x: 0, y: 0, z: 10 }, true);
    const tuck = idle();
    tuck.crouch = true;
    run(a.w, a.s, 180);
    run(b.w, b.s, 180, tuck);
    expect(b.s.speed).toBeGreaterThan(a.s.speed + 0.15);
    a.w.free();
    b.w.free();
  });
  it("settles on the ground without falling through", () => {
    const { w, s } = setup();
    run(w, s, 120);
    expect(s.body.translation().y).toBeCloseTo(0.83, 1);
    expect(s.grounded).toBe(true);
    w.free();
  });
  it("accelerates under push force, coasts, and stops with the brake", () => {
    const { w, s } = setup();
    run(w, s, 120);
    const c = idle();
    c.throttle = 1;
    run(w, s, 360, c);
    const pushed = s.speed;
    expect(pushed).toBeGreaterThan(7);
    expect(pushed).toBeLessThan(13);
    run(w, s, 60);
    expect(s.speed).toBeLessThan(pushed);
    expect(s.speed).toBeGreaterThan(4);
    const brake = idle();
    brake.brake = 1;
    run(w, s, 180, brake);
    expect(s.speed).toBeLessThan(0.1);
    w.free();
  });
  it("takes off on the first pressed step and returns under gravity without jumping again while held", () => {
    const { w, s } = setup();
    run(w, s, 120);
    const c = idle();
    c.jump = true;
    c.jumpPressed = true;
    s.tick(c, []);
    w.step();
    const takeoff = s.body.linvel().y;
    expect(takeoff).toBeGreaterThan(4);
    expect(takeoff).toBeLessThan(5.3);
    c.jumpPressed = false;
    run(w, s, 25, c);
    expect(s.body.translation().y).toBeGreaterThan(1.5);
    run(w, s, 150, c);
    expect(s.grounded).toBe(true);
    expect(s.jumpCount).toBe(1);
    w.free();
  });
  it("blocks high-speed travel through a solid wall", () => {
    const { w, s } = setup();
    w.createCollider(
      RAPIER.ColliderDesc.cuboid(20, 5, 0.1).setTranslation(0, 5, 15),
    );
    run(w, s, 120);
    const c = idle();
    c.throttle = 1;
    run(w, s, 600, c);
    expect(s.body.translation().z).toBeLessThan(15);
    w.free();
  });
  it("buffers a jump pressed just before landing and does not double-jump in midair", () => {
    const { w, s } = setup();
    s.body.setTranslation({ x: 0, y: 1.15, z: 0 }, true);
    s.body.setLinvel({ x: 0, y: -3, z: 4 }, true);
    w.step();
    const c = idle(); c.jump = true; c.jumpPressed = true;
    run(w, s, 1, c);
    expect(s.jumpCount).toBe(0);
    c.jumpPressed = false;
    run(w, s, 10, c);
    expect(s.jumpCount).toBe(1);
    expect(s.body.linvel().y).toBeGreaterThan(3);
    c.jumpPressed = true;
    run(w, s, 1, c);
    c.jumpPressed = false;
    run(w, s, 20, c);
    expect(s.jumpCount).toBe(1);
    w.free();
  });
  it("lands a one-tap 180 and grab, preserving momentum and scoring only after touchdown", () => {
    const { w, s } = setup();
    run(w, s, 120);
    s.body.setLinvel({ x: 0, y: 0, z: 7 }, true);
    const c = idle(); c.jump = true; c.jumpPressed = true; c.tricks = ["left", "grab"];
    run(w, s, 1, c);
    c.jumpPressed = false; c.tricks = [];
    run(w, s, 30, c);
    expect(s.airRotation).toBeCloseTo(Math.PI, 2);
    expect(s.combo).toBe(0);
    expect(s.grabPerformed).toBe(true);
    run(w, s, 40, c);
    expect(s.grounded).toBe(true);
    expect(s.switchStance).toBe(true);
    expect(s.combo).toBe(360);
    expect(s.lastTrick).toContain("landed");
    expect(s.speed).toBeGreaterThan(5);
    expect(s.bailTimer).toBe(0);
    w.free();
  });
  it("gives a held jump a higher apex than a short tap", () => {
    const held = setup(), tapped = setup();
    for (const a of [held, tapped]) run(a.w, a.s, 120);
    const c = idle(); c.jump = true; c.jumpPressed = true;
    for (const a of [held, tapped]) run(a.w, a.s, 1, c);
    c.jumpPressed = false;
    let high = 0, low = 0;
    for (let i = 0; i < 70; i++) {
      c.jump = true; run(held.w, held.s, 1, c);
      c.jump = false; run(tapped.w, tapped.s, 1, c);
      high = Math.max(high, held.s.body.translation().y);
      low = Math.max(low, tapped.s.body.translation().y);
    }
    expect(high).toBeGreaterThan(low + 0.3);
    for (const a of [held, tapped]) a.w.free();
  });
  it("extends two spin taps to a 360 and cleanly hops off a held grind", () => {
    const { w, s } = setup();
    run(w, s, 120);
    const c = idle(); c.jump = true; c.jumpPressed = true; c.tricks = ["right", "right"];
    run(w, s, 1, c);
    c.jumpPressed = false; c.tricks = [];
    run(w, s, 47, c);
    expect(s.airRotation).toBeCloseTo(-2 * Math.PI, 2);
    run(w, s, 20, c);
    expect(s.grounded).toBe(true);
    expect(s.lastTrick).toContain("360");
    expect(s.bailTimer).toBe(0);
    const rail = { x: 0, z: 0, length: 20, y: 0.8, axis: "z" as const };
    s.body.setTranslation({ x: 0, y: 1.55, z: 0 }, true);
    s.body.setLinvel({ x: 0, y: -0.5, z: 5 }, true);
    c.grind = true; s.tick(c, [rail]);
    expect(s.grinding).toBe(rail);
    c.jumpPressed = true; s.tick(c, [rail]); w.step();
    expect(s.grinding).toBeNull();
    expect(s.body.linvel().y).toBeGreaterThan(4);
    expect(s.jumpCount).toBe(2);
    w.free();
  });
  it("banks only completed actions and does not award a stationary manual", () => {
    const { w, s } = setup();
    run(w, s, 120);
    const c = idle();
    c.manual = true;
    run(w, s, 300, c);
    expect(s.combo + s.banked).toBe(0);
    s.addTrick("test landing", 100);
    run(w, s, 150);
    expect(s.banked).toBeGreaterThan(0);
    expect(s.combo).toBe(0);
    w.free();
  });
  it("accelerates downhill through real gravity and a rotated contact surface", () => {
    const { w, s } = setup();
    const angle = 0.15;
    w.createCollider(
      RAPIER.ColliderDesc.cuboid(15, 0.2, 30)
        .setTranslation(0, 5, 0)
        .setRotation({
          x: Math.sin(angle / 2),
          y: 0,
          z: 0,
          w: Math.cos(angle / 2),
        }),
    );
    s.body.setTranslation({ x: 0, y: 6.1, z: 0 }, true);
    run(w, s, 180);
    expect(s.body.translation().z).toBeGreaterThan(1);
    expect(s.speed).toBeGreaterThan(1);
    w.free();
  });
  it("keeps an assisted rail catch locked after E is released, then exits with the brake", () => {
    const { w, s } = setup();
    s.body.setTranslation({ x: 0.1, y: 1.55, z: 0 }, true);
    s.body.setLinvel({ x: 0, y: -0.5, z: 5 }, true);
    const rail = { x: 0, z: 0, length: 20, y: 0.8, axis: "z" as const },
      c = idle();
    c.grind = true;
    s.tick(c, [rail]);
    expect(s.grinding).toBe(rail);
    s.tick(c, [rail]);
    w.step();
    expect(Math.abs(s.body.translation().x)).toBeLessThan(0.01);
    c.grind = false;
    s.tick(c, [rail]);
    expect(s.grinding).toBe(rail);
    c.brake = 1;
    s.tick(c, [rail]);
    expect(s.grinding).toBeNull();
    expect(s.railCooldown).toBeGreaterThan(0);
    w.free();
  });
  it.each(["x", "z"] as const)("jumps from physical ground onto a solid %s rail without E, stays supported and pops out", axis => {
    const { w, s } = setup();
    const rail = { x: 0, z: 0, length: 18, y: 0.845, axis };
    w.createCollider(RAPIER.ColliderDesc.cuboid(axis === "x" ? 9 : 0.045, 0.045, axis === "z" ? 9 : 0.045).setTranslation(0, 0.8, 0));
    s.body.setTranslation({ x: axis === "x" ? -13 : 0, y: 1.1, z: axis === "z" ? -13 : 0 }, true);
    s.heading = axis === "x" ? Math.PI / 2 : 0;
    run(w, s, 120);
    s.body.setLinvel({ x: axis === "x" ? 7 : 0, y: 0, z: axis === "z" ? 7 : 0 }, true);
    const c = idle(); c.jump = true; c.jumpPressed = true;
    let caught = false;
    for (let i = 0; i < 65; i++) {
      s.tick(c, [rail]); w.step(); c.jumpPressed = false;
      if (s.grinding) { caught = true; break; }
    }
    expect(caught).toBe(true);
    c.jump = false; c.tricks = ["tweak"];
    for (let i = 0; i < 60; i++) {
      s.tick(c, [rail]); w.step(); c.tricks = [];
      expect(s.grinding).toBe(rail);
      expect(s.body.translation().y).toBeCloseTo(rail.y + 0.835, 1);
    }
    expect(s.grindStyle).toBe("Royale grind");
    expect(s.grindingDistance).toBeGreaterThan(5);
    c.jumpPressed = true; c.jump = true;
    s.tick(c, [rail]); w.step();
    expect(s.grinding).toBeNull();
    expect(s.body.linvel().y).toBeGreaterThan(4);
    expect(s.lastTrick).toContain("Royale grind · pop out");
    expect(s.combo).toBeGreaterThan(100);
    w.free();
  });
  it("does not pull a rider sideways, upwards or across a perpendicular rail", () => {
    const { w, s } = setup();
    const rail = { x: 0, z: 0, length: 12, y: 0.845, axis: "z" as const };
    for (const [x, y, vx, vy, vz] of [[0.8, 1.7, 0, -1, 6], [0, 2.5, 0, -1, 6], [0, 1.7, 0, 3, 6], [0, 1.7, 6, -1, 0]]) {
      s.body.setTranslation({ x, y, z: 0 }, true); s.body.setLinvel({ x: vx, y: vy, z: vz }, true);
      s.tick(idle(), [rail]); expect(s.grinding).toBeNull();
    }
    w.free();
  });
  it("releases at the end of a rail and banks its distance only once", () => {
    const { w, s } = setup();
    const rail = { x: 0, z: 0, length: 4, y: 0.845, axis: "z" as const };
    s.body.setTranslation({ x: 0, y: 1.7, z: -1.5 }, true);
    s.body.setLinvel({ x: 0, y: -1, z: 5 }, true);
    for (let i = 0; i < 60; i++) { s.tick(idle(), [rail]); w.step(); }
    expect(s.grinding).toBeNull();
    expect(s.body.translation().z).toBeGreaterThan(2);
    expect(s.combo).toBeGreaterThan(50);
    const combo = s.combo;
    for (let i = 0; i < 30; i++) { s.tick(idle(), [rail]); w.step(); }
    expect(s.combo).toBe(combo);
    w.free();
  });
  it.each(["star", "stale"] as const)("animates and scores the %s stunt only after landing", action => {
    const { w, s } = setup(); run(w, s, 120);
    const c = idle(); c.jump = true; c.jumpPressed = true; c.tricks = [action];
    run(w, s, 1, c); c.jumpPressed = false; c.tricks = [];
    run(w, s, 12, c);
    expect(s.grabPose).toBe(action); expect(s.grabbing).toBe(true); expect(s.combo).toBe(0);
    run(w, s, 60, c);
    expect(s.grounded).toBe(true); expect(s.combo).toBe(180);
    expect(s.lastTrick).toContain(action === "star" ? "Spread eagle" : "Stalefish");
    w.free();
  });
});
describe("connected world content", () => {
  it("contains both full-scale city regions and a continuous connection", () => {
    expect(inWorld(-1799, 799)).toBe(true);
    expect(inWorld(1799, -799)).toBe(true);
    for (let x = -1000; x <= 1000; x += 10) expect(inWorld(x, 0)).toBe(true);
    expect(inWorld(0, 300)).toBe(false);
  });
  it("leaves over 2 square kilometers per city after building footprints", () => {
    for (const city of ["gdansk", "riyadh"] as const) {
      let blocked = 0;
      for (let x = 0; x < 8; x++)
        for (let z = 0; z < 8; z++)
          for (const b of buildings(
            centers[city] - 700 + x * 200,
            -700 + z * 200,
            city,
          ))
            blocked += b.w * b.d;
      expect(1600 * 1600 - blocked).toBeGreaterThan(2000000);
    }
  });
  it("defines 36 playable events and 120 unique collectibles inside the world", () => {
    expect(activities).toHaveLength(36);
    expect(tokens).toHaveLength(120);
    expect(new Set(tokens.map((t) => t.id)).size).toBe(120);
    for (const a of activities) {
      expect(inWorld(a.x, a.z)).toBe(true);
      for (const p of routeFor(a)) expect(inWorld(p.x, p.z)).toBe(true);
    }
    for (const t of tokens) expect(inWorld(t.x, t.z)).toBe(true);
  });
  it("keeps collectibles, event starts, and gates outside solid buildings", () => {
    for (const t of [...tokens, ...activities])
      expect(clearGround(t.x, t.z)).toBe(true);
    for (const a of activities)
      for (const p of routeFor(a)) expect(clearGround(p.x, p.z)).toBe(true);
  });
});
