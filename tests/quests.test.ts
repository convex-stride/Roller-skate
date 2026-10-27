import { describe, it, expect } from "vitest";
import { quests, QuestRun, questXP, validQuestSnapshot } from "../src/quests";
import { centers, clearGround, onStreet, districtSites, protectedActivityGround } from "../src/world";
import { findRoute } from "../src/navigation";
const player = { x: 0, z: 0, speed: 0, score: 0 };
describe("district activities and quests", () => {
  it("fills non-street space in both cities without covering protected routes", () => {
    let count = 0;
    for (const city of ["gdansk", "riyadh"] as const) for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 8; iz++) {
      for (const site of districtSites(centers[city] - 700 + ix * 200, -700 + iz * 200, city)) {
        count++; expect(onStreet(site.x, site.z, site.size / 2)).toBe(false);
        expect(protectedActivityGround(site.x, site.z, site.size / 2)).toBe(false);
        expect(clearGround(site.x, site.z, 0.7)).toBe(true);
      }
    }
    expect(count).toBeGreaterThan(600);
  });
  it("provides 128 reachable local quests with a mix of jobs in each city", () => {
    expect(quests).toHaveLength(128); expect(new Set(quests.map(q => q.id)).size).toBe(128);
    for (const city of ["gdansk", "riyadh"] as const) {
      const local = quests.filter(q => q.city === city); expect(local).toHaveLength(64); expect(new Set(local.map(q => q.kind)).size).toBe(5);
    }
    for (const q of quests) {
      expect(clearGround(q.anchor.x, q.anchor.z, 1)).toBe(true);
      for (const point of q.objectives) {
        expect(clearGround(point.x, point.z, 1)).toBe(true);
        const route = findRoute(q.anchor, point); expect(route.length).toBeGreaterThan(1);
        for (let i = 1; i < route.length; i++) {
          const a = route[i - 1], b = route[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
          for (let n = 0; n <= steps; n++) expect(clearGround(a.x + (b.x - a.x) * n / steps, a.z + (b.z - a.z) * n / steps, 0.6), `${q.id} route avoids solid props`).toBe(true);
        }
      }
    }
  });
  it("requires delivery hand-offs in order, a slow stop and a final return to the giver", () => {
    const q = quests.find(q => q.kind === "delivery")!, r = new QuestRun(q, 0);
    expect(r.interact({ ...player, ...q.objectives[2] })).toBe("far");
    expect(r.interact({ ...player, ...q.objectives[0], speed: 4 })).toBe("slow");
    for (const point of q.objectives) expect(r.interact({ ...player, ...point })).toBe("collected");
    expect(r.stage).toBe("return"); expect(r.interact({ ...player, ...q.anchor })).toBe("complete"); expect(r.stage).toBe("complete");
  });
  it("supports collecting in any order and resumes progress after saving", () => {
    const q = quests.find(q => q.kind === "collect")!, r = new QuestRun(q, 0);
    r.interact({ ...player, ...q.objectives[2] }); r.interact({ ...player, ...q.objectives[0] });
    const snapshot = JSON.parse(JSON.stringify(r.snapshot())); expect(validQuestSnapshot(snapshot)).toBe(true);
    const restored = new QuestRun(q, 0, snapshot); expect(restored.visited).toEqual([2, 0]);
    restored.interact({ ...player, ...q.objectives[1] }); expect(restored.stage).toBe("return");
  });
  it("counts only newly banked style points nearby and can suspend scoring during other activities", () => {
    const q = quests.find(q => q.kind === "style")!, r = new QuestRun(q, 100);
    r.tick({ ...player, x: q.anchor.x + 100, z: q.anchor.z, score: 600 }, 1); expect(r.stylePoints).toBe(0);
    r.syncScore(1200); r.tick({ ...player, ...q.anchor, score: 1300 }, 1); expect(r.stylePoints).toBe(100);
    r.tick({ ...player, ...q.anchor, score: 1500 }, 1); expect(r.stage).toBe("return");
    expect(questXP([q.id, q.id])).toBe(q.reward);
  });
  it("times out deliveries, leaves untimed jobs open and rejects broken snapshots", () => {
    const timed = new QuestRun(quests.find(q => q.kind === "delivery")!, 0); timed.tick(player, 181); expect(timed.stage).toBe("failed");
    const untimed = new QuestRun(quests.find(q => q.kind === "discover")!, 0); untimed.tick(player, 1000); expect(untimed.stage).toBe("objectives");
    expect(validQuestSnapshot({ ...untimed.snapshot(), visited: [99] })).toBe(false);
    expect(validQuestSnapshot({ ...untimed.snapshot(), stage: "return" })).toBe(false);
    expect(validQuestSnapshot({ ...untimed.snapshot(), stage: "complete" })).toBe(false);
    expect(validQuestSnapshot({ ...untimed.snapshot(), stage: "failed" })).toBe(false);
    expect(validQuestSnapshot({ ...timed.snapshot(), stage: "objectives", visited: [2] })).toBe(false);
  });
  it("requires two new, different, nearby landed flips and restores their progress", () => {
    const q = quests.find(q => q.kind === "flip")!, r = new QuestRun(q, 0);
    r.syncFlip(5);
    r.tick({ ...player, ...q.anchor, flipId: 5, flipKind: "backflip" }, 1); expect(r.flipTypes).toEqual([]);
    r.tick({ ...player, ...q.anchor, flipId: 6, flipKind: "backflip" }, 1);
    r.tick({ ...player, ...q.anchor, flipId: 7, flipKind: "backflip" }, 1); expect(r.flipTypes).toEqual(["backflip"]);
    const restored = new QuestRun(q, 0, r.snapshot()); restored.syncFlip(7);
    restored.tick({ ...player, x: q.anchor.x + 100, z: q.anchor.z, flipId: 8, flipKind: "frontflip" }, 1); expect(restored.stage).toBe("objectives");
    restored.tick({ ...player, ...q.anchor, flipId: 9, flipKind: "frontflip" }, 1); expect(restored.stage).toBe("return");
    expect(validQuestSnapshot(restored.snapshot())).toBe(true); expect(restored.interact({ ...player, ...q.anchor })).toBe("complete");
  });
});
