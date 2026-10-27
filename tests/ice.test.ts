import { beforeAll, describe, expect, it } from "vitest";
import { iceRinks, iceAt, iceVenueAt, rinkArrival, rinkEntrance, rinkSolids } from "../src/ice-rinks";
import { clearGround, onStreet } from "../src/world";
import { findRoute } from "../src/navigation";
import { surfaceAt } from "../src/city-profile";
import { RAPIER, Skater, idle, STEP } from "../src/physics";
import { Companion } from "../src/companion";
beforeAll(async () => { await RAPIER.init(); });
function setup(x: number, z: number, venue = false) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(2000, .3, 900).setTranslation(0, -.3, 0).setFriction(0));
  if (venue) {
    const r = iceVenueAt(x, z)!;
    world.createCollider(RAPIER.ColliderDesc.cuboid(36, .06, 44).setTranslation(r.x, .02, r.z).setFriction(0));
    for (const s of rinkSolids(r)) world.createCollider(RAPIER.ColliderDesc.cuboid(s.w / 2, s.h / 2, s.d / 2).setTranslation(s.x, s.y, s.z).setFriction(.05));
  }
  const player = new Skater(world, x, z), partner = new Companion(world, player);
  const tick = (seconds: number, c = idle()) => { for (let n = 0; n < seconds / STEP; n++) { player.tick(c, []); partner.tick(null); world.step(); c = { ...c, jumpPressed: false, tricks: [] }; } };
  tick(.7); return { world, player, partner, tick };
}
describe("mall ice arenas", () => {
  it("offers four Gdańsk and two Riyadh venues clear of streets, with accessible entrances", () => {
    expect(iceRinks.filter(r => r.city === "gdansk")).toHaveLength(4);
    expect(iceRinks.filter(r => r.city === "riyadh")).toHaveLength(2);
    expect(new Set(iceRinks.map(r => r.id)).size).toBe(6);
    for (const r of iceRinks) {
      const entry = rinkEntrance(r), arrival = rinkArrival(r);
      expect(clearGround(entry.x, entry.z, .8)).toBe(true); expect(clearGround(arrival.x, arrival.z, .8)).toBe(true);
      for (const dx of [-36, 0, 36]) for (const dz of [-44, 0, 44]) expect(onStreet(r.x + dx, r.z + dz, 1)).toBe(false);
      const route = findRoute(entry, arrival); expect(route.length).toBeGreaterThan(1);
      expect(route.every(p => clearGround(p.x, p.z, .7))).toBe(true);
    }
  });
  it("uses a rounded ice boundary and leaves the mall concourse on regular ground", () => {
    const r = iceRinks[0]; expect(iceAt(r.x, r.z)).toBe(r); expect(iceAt(r.x + 14, r.z + 29)).toBeUndefined();
    expect(iceAt(r.x + 19, r.z)).toBeUndefined(); expect(surfaceAt(r.x, r.z).name).toBe("ICE");
    expect(surfaceAt(r.x + 19, r.z).name).not.toBe("ICE");
  });
  it("keeps Layan on physical ice and stops her at the back boards", () => {
    const r = iceRinks[0], { world, player, tick } = setup(r.x, r.z - 20, true);
    const c = idle(); c.throttle = 1; tick(11, c);
    expect(player.surface).toBe("ICE"); expect(player.grounded).toBe(true);
    expect(player.body.translation().z).toBeLessThan(r.z + 30); expect(player.body.translation().y).toBeGreaterThan(.8);
    world.free();
  });
  it("glides farther on ice while braking still brings the rider to a stop", () => {
    const r = iceRinks[0], ice = setup(r.x, r.z - 20), road = setup(0, 0);
    for (const run of [ice, road]) { run.player.body.setLinvel({ x: 0, y: 0, z: 5 }, true); run.tick(3); }
    expect(ice.player.speed).toBeGreaterThan(road.player.speed + .15);
    const brake = idle(); brake.brake = 1; ice.tick(4, brake); expect(ice.player.speed).toBeLessThan(.3);
    ice.world.free(); road.world.free();
  });
  it("lets Taqee join on ice, track Layan and copy her jump", () => {
    const r = iceRinks[0], { world, player, partner, tick } = setup(r.x, r.z - 20, true);
    expect(partner.call()).toBe(true); partner.command("pairs"); expect(partner.mode).toBe("pairs");
    tick(1); const start = partner.state.position!;
    const c = idle(); c.throttle = .6; tick(4, c); tick(2);
    expect(partner.state.surface).toBe("ICE");
    expect(Math.hypot(partner.state.position!.x - start.x, partner.state.position!.z - start.z)).toBeGreaterThan(3);
    expect(Math.hypot(partner.state.position!.x - player.body.translation().x, partner.state.position!.z - player.body.translation().z)).toBeLessThan(15);
    const jump = idle(); jump.jumpPressed = true; jump.jump = true; tick(.1, jump); expect(partner.state.jumps).toBeGreaterThan(0);
    const entry = rinkEntrance(r); player.reset(entry.x, entry.z); tick(.1); expect(partner.mode).toBe("follow");
    world.free();
  });
});
