import { describe, it, expect } from "vitest";
import { CrowdDirector, type CrowdPlayer } from "../src/crowd";
import { clearGround, inCanal } from "../src/world";
const player: CrowdPlayer = { x: -1068, z: 76, speed: 0, heading: Math.PI / 2, score: 0 };
describe("city residents", () => {
  it("populates both arrival areas with skaters, pedestrians and social groups", () => {
    const d = new CrowdDirector();
    for (const p of [player, { ...player, x: 1255, z: -8 }]) {
      const local = d.update(p, 0.1);
      expect(local.length).toBeGreaterThan(30);
      expect(new Set(local.map(p => p.role)).size).toBeGreaterThanOrEqual(4);
      expect(local.some(p => p.role === "skater")).toBe(true);
    }
  });
  it("advances routes, varies routines and keeps residents out of buildings and the canal", () => {
    const d = new CrowdDirector();
    let local = d.update(player, 0.1);
    const start = new Map(d.people.map(p => [p.id, { x: p.x, z: p.z }]));
    for (let i = 0; i < 120; i++) local = d.update(player, 0.1);
    expect(local.filter(p => p.traveled > 4).length).toBeGreaterThan(15);
    expect(local.some(p => p.action === "talk" || p.action === "phone")).toBe(true);
    for (const p of local) {
      expect(clearGround(p.x, p.z, 0.35)).toBe(true); expect(inCanal(p.x, p.z)).toBe(false);
      expect(Math.hypot(p.x - start.get(p.id)!.x, p.z - start.get(p.id)!.z)).toBeLessThan(p.traveled + 180);
    }
  });
  it("yields to a close rider and cheers a landed trick without repeating the reaction every tick", () => {
    const d = new CrowdDirector(), actor = d.people.find(p => p.role === "walker")!;
    d.update({ ...player, x: actor.x + 0.5, z: actor.z, speed: 4 }, 0.1);
    expect(d.yields).toBeGreaterThan(0);
    d.update({ ...player, score: 180 }, 0.1);
    const reactions = d.reactions;
    expect(reactions).toBeGreaterThan(0);
    d.update({ ...player, score: 180 }, 0.1); expect(d.reactions).toBe(reactions);
    const cheering = d.people.find(p => p.action === "cheer")!;
    d.update({ ...player, x: cheering.x + 0.5, z: cheering.z, score: 180 }, 0.1);
    expect(cheering.action).toBe("yield");
  });
  it("invites an actual nearby skater, follows the player, and ends the ride on city travel", () => {
    const d = new CrowdDirector(); d.update(player, 0.1);
    expect(d.invite(player)).toContain("joined");
    const follower = d.follower!; expect(follower.role).toBe("skater");
    for (let i = 0; i < 30; i++) d.update({ ...player, x: player.x + i * 0.12, speed: 1.2 }, 0.1);
    expect(d.follower).toBe(follower); expect(follower.following).toBe(true);
    expect(follower.traveled).toBeGreaterThan(1);
    d.update({ ...player, x: 1255, z: -8 }, 0.1);
    expect(d.follower).toBeNull(); expect(follower.following).toBe(false);
  });
  it("respects the mobile population budget and rejects blocked physical movement", () => {
    const d = new CrowdDirector(44);
    const initial = d.update(player, 0);
    const positions = new Map(initial.map(p => [p.id, [p.x, p.z]]));
    const blocked = d.update(player, 0.1, () => null);
    expect(blocked.length).toBeLessThanOrEqual(44);
    for (const p of blocked) if (positions.has(p.id)) expect([p.x, p.z]).toEqual(positions.get(p.id));
  });
});
