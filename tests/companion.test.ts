import { beforeAll, describe, expect, it } from "vitest";
import { RAPIER, Skater, idle, STEP } from "../src/physics";
import { Companion } from "../src/companion";
import { RaceSession } from "../src/race-session";
import { races } from "../src/races";
import { clearGround } from "../src/world";
beforeAll(async () => { await RAPIER.init(); });
function setup() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(2000, 0.3, 900).setTranslation(0, -0.3, 0));
  const player = new Skater(world, -1060, 74), partner = new Companion(world, player);
  for (let i = 0; i < 30; i++) { player.tick(idle(), []); world.step(); }
  return { world, player, partner, tick(seconds: number, push = false) { for (let i = 0; i < seconds / STEP; i++) { const c = idle(); c.throttle = push ? 0.6 : 0; player.tick(c, []); partner.tick(null); world.step(); } } };
}
describe("Taqee companion", () => {
  it("can be called, follows real motion, stays beyond 45 seconds and can be dismissed", () => {
    const { world, player, partner, tick } = setup();
    expect(partner.call()).toBe(true);
    tick(0.5); expect(partner.call()).toBe(true); expect(partner.state.position!.y).toBeLessThan(1.2);
    const start = partner.state.position!; expect(clearGround(start.x, start.z, 0.7)).toBe(true);
    player.heading = Math.PI / 2; tick(5, true); tick(3);
    expect(Math.hypot(partner.state.position!.x - start.x, partner.state.position!.z - start.z)).toBeGreaterThan(3);
    tick(50); expect(partner.active).toBe(true); expect(partner.state.position!.y).toBeGreaterThan(0.6);
    partner.dismiss(); expect(partner.active).toBe(false); world.free();
  });
  it("waits in place, recalls after city travel and joins a practice jump", () => {
    const { world, player, partner, tick } = setup(); partner.call(); partner.command("wait");
    tick(1); const start = partner.state.position!; tick(3, true);
    expect(Math.hypot(partner.state.position!.x - start.x, partner.state.position!.z - start.z)).toBeLessThan(0.5);
    player.reset(1004, -72); tick(1); expect(partner.state.position!.x).toBeLessThan(0);
    expect(partner.call()).toBe(true); expect(partner.state.position!.x).toBeGreaterThan(0);
    partner.command("tricks"); tick(3); expect(partner.state.jumps).toBeGreaterThan(0); world.free();
  });
  it("guides along a real route and waits when Layan falls behind", () => {
    const { world, player, partner } = setup(); partner.call(); const goal = { x: -1010, z: 74, label: "Quay" };
    partner.command("guide", goal);
    for (let i = 0; i < 45 / STEP; i++) { player.tick(idle(), []); partner.tick(goal); world.step(); }
    expect(partner.state.routePoints).toBeGreaterThan(1);
    const p = partner.state.position!, origin = player.body.translation();
    expect(Math.hypot(p.x - origin.x, p.z - origin.z)).toBeLessThan(23);
    expect(p.x).toBeGreaterThan(-1050); world.free();
  });
  it("runs a physical two-person race with Taqee, locks the grid and resumes companionship", () => {
    const { world, player, partner } = setup(); partner.call();
    const race = new RaceSession(world, player, races[0], true);
    expect(race.run.entrants.map(e => e.name)).toEqual(["Layan", "Taqee"]); expect(race.rivals).toHaveLength(1);
    const start = race.rivals[0].skater.body.translation();
    for (let i = 0; i < 5 / STEP; i++) { player.tick(idle(), []); race.beforeStep(); partner.tick(null, true); world.step(); race.afterStep(); }
    expect(race.rivals[0].skater.body.translation().x).toBeGreaterThan(start.x + 1);
    expect(partner.visual(5)).toBe(null); race.dispose(); partner.tick(null);
    expect(partner.active).toBe(true); expect(partner.state.racing).toBe(false); world.free();
  });
  it("continues guiding when a quest advances to another stop", () => {
    const { world, player, partner } = setup(); partner.call();
    const first = { x: -1055, z: 74, label: "First stop" }, next = { x: -1044, z: 74, label: "Next stop" };
    partner.command("guide", first);
    for (let i = 0; i < 12 / STEP; i++) { player.tick(idle(), []); partner.tick(first); world.step(); }
    expect(partner.mode).toBe("guide");
    for (let i = 0; i < 5 / STEP; i++) { player.tick(idle(), []); partner.tick(next); world.step(); }
    expect(partner.route.at(-1)).toMatchObject({ x: next.x, z: next.z });
    expect(partner.mode).toBe("guide"); world.free();
  });
});
