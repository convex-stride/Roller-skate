import { beforeAll, describe, it, expect } from "vitest";
import { spots, outsideParkFootprints } from "../src/spots";
import { parkLayout, surfaceGeometry } from "../src/park-layouts";
import { RAPIER, Skater, STEP, idle } from "../src/physics";
import { inWorld } from "../src/world";
beforeAll(async () => { await RAPIER.init(); });
describe("neighborhood skate parks", () => {
  it("cuts street faces around a park without overlaps or losing the surrounding street", () => {
    const p = spots.find(s => s.id === "baltic")!, patches = outsideParkFootprints({ x: p.x, z: p.z, w: 200, d: 200 });
    expect(patches.reduce((area, r) => area + r.w * r.d, 0)).toBe(40000 - p.size[0] * p.size[1]);
    for (const r of patches) for (const other of patches) if (other !== r) expect(Math.min(r.x + r.w / 2, other.x + other.w / 2) <= Math.max(r.x - r.w / 2, other.x - other.w / 2) || Math.min(r.z + r.d / 2, other.z + other.d / 2) <= Math.max(r.z - r.d / 2, other.z - other.d / 2)).toBe(true);
  });
  it("spreads seven parks through each city, with four distinct kinds and clear separation", () => {
    for (const city of ["gdansk", "riyadh"] as const) {
      const cityParks = spots.filter(s => s.city === city);
      expect(cityParks).toHaveLength(7); expect(new Set(cityParks.map(s => s.layout)).size).toBe(4);
      expect(Math.max(...cityParks.map(s => s.x)) - Math.min(...cityParks.map(s => s.x))).toBeGreaterThan(950);
      expect(Math.max(...cityParks.map(s => s.z)) - Math.min(...cityParks.map(s => s.z))).toBeGreaterThan(1050);
    }
    for (const s of spots) {
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) expect(inWorld(s.x + dx * s.size[0] / 2, s.z + dz * s.size[1] / 2)).toBe(true);
      for (const other of spots) if (other !== s) expect(Math.abs(s.x - other.x) > (s.size[0] + other.size[0]) / 2 + 8 || Math.abs(s.z - other.z) > (s.size[1] + other.size[1]) / 2 + 8).toBe(true);
    }
  });
  it.each([1, -1])("lets a real skater ride a curved quarter pipe in direction %s", direction => {
    const spot = spots.find(s => s.id === "oliwa")!, surface = parkLayout(spot).surfaces.find(s => Math.sign(s.profile.at(-1)![0]) === direction)!;
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.timestep = STEP;
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.3, 100).setTranslation(0, -0.25, 0));
    const data = surfaceGeometry(surface); world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices, data.indices).setTranslation(0, 0.05, 0));
    const skater = new Skater(world, surface.x, surface.z - direction * 14); skater.heading = direction > 0 ? 0 : Math.PI;
    for (let i = 0; i < 90; i++) { skater.tick(idle(), []); world.step(); }
    skater.body.setLinvel({ x: 0, y: 0, z: direction * 8 }, true);
    const c = idle(); c.throttle = 1; let apex = 0;
    for (let i = 0; i < 210; i++) { skater.tick(c, []); world.step(); apex = Math.max(apex, skater.body.translation().y); }
    expect(apex).toBeGreaterThan(2.2); expect(apex).toBeLessThan(8); expect(skater.body.translation().y).toBeGreaterThan(0.75);
    world.free();
  });
  it("rides successive pump rollers using their actual collision mesh", () => {
    const surface = parkLayout(spots.find(s => s.id === "baltic")!).surfaces[0], data = surfaceGeometry(surface);
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.timestep = STEP;
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.3, 150).setTranslation(0, -0.25, 0));
    world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices, data.indices).setTranslation(0, 0.05, 0));
    const skater = new Skater(world, 0, -67); const c = idle(); c.throttle = 1; let apex = 0;
    for (let i = 0; i < 1100; i++) { skater.tick(c, []); world.step(); apex = Math.max(apex, skater.body.translation().y); }
    expect(skater.body.translation().z).toBeGreaterThan(50); expect(apex).toBeGreaterThan(1.6); expect(skater.body.translation().y).toBeGreaterThan(0.75);
    world.free();
  });
});
