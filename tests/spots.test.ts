import { describe, it, expect } from "vitest";
import { courses, SpotRun, spots, insideSpot } from "../src/spots";
import { buildings, inWorld, clearGround } from "../src/world";
const sample = { x: 0, y: 0.83, z: 0, grounded: true, jumps: 0, score: 0 };
describe("authored stunt sessions", () => {
  it("reserves fourteen park footprints and keeps all eighteen session starts open", () => {
    expect(spots).toHaveLength(14); expect(courses).toHaveLength(18);
    for (const c of courses) { expect(inWorld(c.start.x, c.start.z)).toBe(true); expect(clearGround(c.start.x, c.start.z, 1)).toBe(true); }
    for (const s of spots) for (let x = -700; x <= 700; x += 200) for (let z = -700; z <= 700; z += 200) {
      for (const b of buildings((s.city === "gdansk" ? -1000 : 1000) + x, z, s.city)) expect(insideSpot(b.x, b.z, Math.max(b.w, b.d) / 2 + 7)).toBe(false);
    }
  });
  it("requires ordered rooftop gates at the correct height, a jump and a grounded finish", () => {
    const c = courses[0], r = new SpotRun(c, 0, 0);
    r.tick({ ...sample, ...c.gates[2] }, 1); expect(r.gate).toBe(0);
    r.tick({ ...sample, ...c.gates[0] }, 1); expect(r.gate).toBe(1);
    r.tick({ ...sample, ...c.gates[1], y: 0.83 }, 1); expect(r.gate).toBe(1);
    r.tick({ ...sample, ...c.gates[1] }, 1); r.tick({ ...sample, ...c.gates[2] }, 1);
    r.tick({ ...sample, ...c.gates[3] }, 1); expect(r.status).toBe("riding");
    r.tick({ ...sample, ...c.gates[3], jumps: 1, grounded: false }, 1); expect(r.status).toBe("riding");
    r.tick({ ...sample, ...c.gates[3], jumps: 1 }, 1); expect(r.medal).toBe("GOLD");
    const time = r.elapsed; r.tick(sample, 10); expect(r.elapsed).toBe(time);
  });
  it("ends a timed-out route and starts retries without stale progress", () => {
    const r = new SpotRun(courses[1], 3, 200); r.tick(sample, 81);
    expect(r.status).toBe("failed"); expect(r.medal).toBeNull();
    expect(new SpotRun(courses[1], 4, 200).gate).toBe(0);
  });
  it.each([[299, null], [300, "BRONZE"], [600, "SILVER"], [1200, "GOLD"]])("awards the trick session at %s new banked points", (points, medal) => {
    const r = new SpotRun(courses[2], 0, 500);
    r.tick({ ...sample, score: 500 + Number(points) }, 44); expect(r.status).toBe("riding");
    r.tick({ ...sample, score: 500 + Number(points) }, 1); expect(r.medal).toBe(medal);
  });
});
