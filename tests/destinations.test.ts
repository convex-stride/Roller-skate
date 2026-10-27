import { describe, it, expect } from "vitest";
import { destinations } from "../src/destinations";
import { NavigationMap } from "../src/navigation";
describe("selectable map destinations", () => {
  it("exposes all 128 quests and the parks, races and landmarks as named destinations", () => {
    expect(destinations.filter(d => d.kind === "quest")).toHaveLength(128);
    expect(destinations.filter(d => d.kind === "park")).toHaveLength(14);
    expect(destinations.filter(d => d.kind === "race")).toHaveLength(4);
    expect(new Set(destinations.map(d => d.id)).size).toBe(destinations.length);
    expect(destinations.every(d => !!d.label && Number.isFinite(d.x) && Number.isFinite(d.z))).toBe(true);
  });
  it("maps clicks to the correct city after focusing and resizing the map", () => {
    const map = new NavigationMap();
    const canvas = { width: 900, height: 900, getBoundingClientRect: () => ({ left: 100, top: 200, width: 400, height: 400 }) } as HTMLCanvasElement;
    map.cityFocus = "gdansk"; expect(map.mapPoint(canvas, 300, 400)).toEqual({ x: -1000, z: 0 });
    map.cityFocus = "riyadh"; expect(map.mapPoint(canvas, 300, 400)).toEqual({ x: 1000, z: 0 });
    const scale = map.largeScale(canvas), point = map.mapPoint(canvas, 300 + 100 * scale * 400 / 900, 400 + 200 * scale * 400 / 900);
    expect(point.x).toBeCloseTo(1100); expect(point.z).toBeCloseTo(200);
  });
});
