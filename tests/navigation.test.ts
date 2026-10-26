import { describe, it, expect } from "vitest";
import { findRoute } from "../src/navigation";
import { buildings, clearGround, inCanal } from "../src/world";
describe("street navigation", () => {
  it("routes around a solid building rather than through its footprint", () => {
    const b = buildings(-1500, -500, "gdansk")[0],
      path = findRoute({ x: b.x - 35, z: b.z }, { x: b.x + 35, z: b.z });
    expect(path.length).toBeGreaterThan(5);
    expect(path.every((p) => clearGround(p.x, p.z, 0.7))).toBe(true);
    expect(path.some((p) => Math.abs(p.z - b.z) > 10)).toBe(true);
  });
  it("uses the physical bridge when crossing the canal", () => {
    const path = findRoute({ x: -1040, z: 40 }, { x: -1040, z: 140 });
    expect(path.length).toBeGreaterThan(0);
    expect(path.every((p) => !inCanal(p.x, p.z))).toBe(true);
    expect(
      path.some((p) => p.z >= 86 && p.z <= 110 && Math.abs(p.x + 1000) <= 6),
    ).toBe(true);
  });
  it("does not invent a route to an inaccessible destination", () => {
    expect(findRoute({ x: -1000, z: 0 }, { x: 0, z: 500 })).toEqual([]);
  });
});
