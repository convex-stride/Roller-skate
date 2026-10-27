import { beforeAll, describe, it, expect } from "vitest";
import { races, RaceRun } from "../src/races";
import { RAPIER, Skater, idle, STEP } from "../src/physics";
import { RaceSession } from "../src/race-session";
import { clearGround, inWorld } from "../src/world";
beforeAll(async () => { await RAPIER.init(); });
function go(run: RaceRun) { for (let i = 0; i < 181; i++) run.tick([], STEP); }
const sample = (id: string, x: number, z: number, grounded = true) => ({ id, x, z, y: 0.9, grounded });
describe("street races", () => {
  it("places four race routes on legal ground without cutting through buildings, raised decks or water", () => {
    expect(races).toHaveLength(4);
    for (const race of races) {
      let previous = race.start;
      for (const gate of race.checkpoints) {
        for (let t = 0; t <= 1; t += 0.025) {
          const x = previous.x + (gate.x - previous.x) * t, z = previous.z + (gate.z - previous.z) * t;
          expect(inWorld(x, z)).toBe(true); expect(clearGround(x, z, 0.6)).toBe(true);
        }
        previous = gate;
      }
    }
  });
  it("holds a three-second countdown, ignores early checkpoints and does not consume time while paused", () => {
    const r = new RaceRun(races[0]), first = races[0].checkpoints[0];
    r.tick([sample("player", first.x, first.z)], 1); expect(r.player.gate).toBe(0); expect(r.elapsed).toBe(0);
    const remaining = r.countdown; r.tick([], 0); expect(r.countdown).toBe(remaining);
    r.tick([], 2); expect(r.status).toBe("racing"); expect(r.elapsed).toBe(0);
  });
  it("requires gates in order, counts a jump through the finish, and preserves the finish time", () => {
    const r = new RaceRun(races[0]); go(r);
    const gates = races[0].checkpoints, final = gates.at(-1)!;
    r.tick([sample("player", final.x, final.z)], STEP); expect(r.player.gate).toBe(0);
    for (const g of gates.slice(0, -1)) r.tick([sample("player", g.x, g.z)], 1);
    r.tick([sample("player", final.x, final.z, false)], 1); expect(r.status).toBe("finished");
    const time = r.player.finish; r.tick([], 10); expect(r.player.finish).toBe(time);
  });
  it("counts both circuit laps and ranks progress rather than proximity to the finish", () => {
    const r = new RaceRun(races[2]); go(r);
    r.tick([sample("player", r.definition.start.x, r.definition.start.z)], STEP); expect(r.player.gate).toBe(0);
    for (const g of r.definition.checkpoints) r.tick([sample("rival-1", g.x, g.z)], 1);
    expect(r.entrants[1].gate).toBe(4); expect(r.entrants[1].finish).toBeNull(); expect(r.position).toBe(2);
    for (const g of r.definition.checkpoints) r.tick([sample("rival-1", g.x, g.z)], 1);
    expect(r.entrants[1].place).toBe(1);
  });
  it("times out an unfinished player without awarding a result", () => {
    const r = new RaceRun(races[0]); go(r); r.tick([], 61);
    expect(r.status).toBe("timeout"); expect(r.player.finish).toBeNull();
  });
  it("uses the same finish plane across lanes and resolves a close crossing within the physics step", () => {
    const r = new RaceRun(races[0]); go(r);
    for (const g of r.definition.checkpoints.slice(0, -1)) r.tick([sample("player", g.x, g.z), sample("rival-1", g.x, g.z + 1.8)], STEP);
    const finish = r.definition.checkpoints.at(-1)!;
    r.tick([sample("player", finish.x - 1, finish.z), sample("rival-1", finish.x - 0.5, finish.z + 1.8)], STEP);
    expect(r.player.finish).toBeNull();
    r.tick([sample("player", finish.x + 0.25, finish.z), sample("rival-1", finish.x + 0.5, finish.z + 1.8)], STEP);
    expect(r.entrants[1].place).toBe(1); expect(r.player.place).toBe(2);
    expect(r.entrants[1].finish!).toBeLessThan(r.player.finish!);
  });
  it.each(races)("three physical rivals finish $name and are removed cleanly when leaving", race => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.timestep = STEP;
    world.createCollider(RAPIER.ColliderDesc.cuboid(2000, 0.3, 1000).setTranslation(0, -0.3, 0));
    const player = new Skater(world, race.start.x, race.start.z), session = new RaceSession(world, player, race);
    const start = { ...player.body.translation() };
    for (let i = 0; i < 120; i++) { player.tick(idle(), []); session.beforeStep(); world.step(); session.afterStep(); }
    expect(player.body.translation().x).toBeCloseTo(start.x); expect(player.body.translation().z).toBeCloseTo(start.z);
    for (let i = 0; i < race.limit * 60; i++) {
      player.tick(idle(), []); session.beforeStep(); world.step(); session.afterStep();
      if (session.run.entrants.slice(1).every(r => r.finish !== null)) break;
    }
    expect(session.run.entrants.slice(1).map(r => ({ name: r.name, gate: r.gate, finish: r.finish }))).toEqual(expect.arrayContaining([
      expect.objectContaining({ gate: session.run.totalGates, finish: expect.any(Number) }),
    ]));
    expect(session.run.entrants.slice(1).every(r => r.finish !== null)).toBe(true);
    const before = world.bodies.len(); session.dispose(); expect(world.bodies.len()).toBe(before - 3);
    world.free();
  });
});
