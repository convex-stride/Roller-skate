import { describe, it, expect } from "vitest";
import { landmarks, landmarkAt, cityStarts, practiceRails } from "../src/city-profile";
import { clearGround, inWorld, buildings, streets } from "../src/world";
import { findRoute } from "../src/navigation";
it("uses narrow, dense Gdańsk terraces and larger, taller Riyadh blocks", () => {
  const gd = buildings(-1500, -300, "gdansk"), ry = buildings(700, -300, "riyadh");
  const mean = (b: typeof gd, key: "w" | "h") => b.reduce((a, v) => a + v[key], 0) / b.length;
  expect(gd.length).toBeGreaterThan(ry.length * 2);
  expect(mean(ry, "w")).toBeGreaterThan(mean(gd, "w") * 2);
  expect(mean(ry, "h")).toBeGreaterThan(mean(gd, "h") * 2);
});
it("keeps road junction faces disjoint to prevent coplanar flicker", () => {
  for (const city of ["gdansk", "riyadh"] as const)
    for (let ix = 0; ix < 8; ix++)
      for (let iz = 0; iz < 8; iz++) {
        const roads = streets((city === "gdansk" ? -1000 : 1000) - 700 + ix * 200, -700 + iz * 200, city);
        for (let i = 0; i < roads.length; i++)
          for (let j = i + 1; j < roads.length; j++) {
            const a = roads[i], b = roads[j];
            const x = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
            const z = Math.min(a.z + a.d / 2, b.z + b.d / 2) - Math.max(a.z - a.d / 2, b.z - b.d / 2);
            expect(x > 0.00001 && z > 0.00001).toBe(false);
          }
      }
});
describe("city-specific landmarks", () => {
  it("reserves low heritage quarters outside Riyadh's modern central corridor", () => {
    const outer = buildings(1500, -300, "riyadh");
    const skyline = buildings(900, -300, "riyadh");
    expect(outer.length).toBeGreaterThan(0);
    expect(outer.every(b => b.style === "najdi" && b.h < 17)).toBe(true);
    expect(skyline.some(b => b.style === "modern" && b.h > 32)).toBe(true);
    const masmakNeighbors = buildings(1300, 100, "riyadh");
    expect(masmakNeighbors.length).toBeGreaterThan(0);
    expect(masmakNeighbors.every(b => b.style === "najdi" && b.h < 16)).toBe(true);
    for (const b of outer) expect(clearGround(b.x + b.w / 2 + 2, b.z, 0)).toBe(false);
  });
  it("provides ten distinct landmark destinations with legal arrival points", () => {
    expect(new Set(landmarks.map((l) => l.id)).size).toBe(10);
    for (const l of landmarks) {
      expect(inWorld(l.spawn.x, l.spawn.z)).toBe(true);
      expect(clearGround(l.spawn.x, l.spawn.z, 0.7)).toBe(true);
      expect(landmarkAt(l.x, l.z)?.id).toBe(l.id);
    }
  });
  it("starts in different districts with open approaches to the practice rails", () => {
    expect(cityStarts.gdansk.heading).not.toBe(cityStarts.riyadh.heading);
    for (const [i, start] of Object.values(cityStarts).entries()) {
      expect(clearGround(start.x, start.z, 1)).toBe(true);
      const rail = practiceRails[i];
      for (let t = 0; t <= 1; t += 0.05) {
        expect(clearGround(start.x + (rail.x - start.x) * t, start.z + (rail.z - start.z) * t, 0.7)).toBe(true);
      }
    }
  });
  it("connects the new landmark viewpoints to each city's starting district", () => {
    for (const id of ["st-marys", "pif-tower"]) {
      const l = landmarks.find(l => l.id === id)!;
      const route = findRoute(cityStarts[l.city], l.spawn);
      expect(route.length).toBeGreaterThan(1);
      for (let i = 1; i < route.length; i++) {
        const a = route[i - 1], b = route[i], count = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
        for (let n = 0; n <= count; n++) expect(clearGround(a.x + (b.x - a.x) * n / count, a.z + (b.z - a.z) * n / count, .6)).toBe(true);
      }
    }
  });
  it("reserves landmark footprints rather than placing procedural buildings on top", () => {
    for (const city of ["gdansk", "riyadh"] as const)
      for (let x = 0; x < 8; x++)
        for (let z = 0; z < 8; z++)
          for (const b of buildings(
            (city === "gdansk" ? -1000 : 1000) - 700 + x * 200,
            -700 + z * 200,
            city,
          ))
            expect(
              landmarkAt(b.x, b.z, Math.max(b.w, b.d) / 2 + 6),
            ).toBeUndefined();
  });
});
