import { describe, it, expect } from "vitest";
import { sanitizePreferences, defaults } from "../src/settings";
describe("stored preferences validation", () => {
  it("loads safe defaults from absent or corrupt preference data", () => {
    expect(sanitizePreferences(null)).toEqual(defaults);
    expect(sanitizePreferences("broken")).toEqual(defaults);
  });
  it("prevents invalid render, camera, and volume values from breaking the game", () => {
    const p = sanitizePreferences({
      resolution: 0,
      fov: Infinity,
      master: -40,
      effects: 400,
      sensitivity: NaN,
      quality: "ultra",
      shadows: "false",
    });
    expect(p.resolution).toBe(50);
    expect(p.fov).toBe(defaults.fov);
    expect(p.master).toBe(0);
    expect(p.effects).toBe(100);
    expect(p.sensitivity).toBe(defaults.sensitivity);
    expect(p.quality).toBe("auto");
    expect(p.shadows).toBe(true);
  });
  it("retains supported preferences, including disabled HUD and motion", () => {
    const p = sanitizePreferences({
      ...defaults,
      quality: "custom",
      fov: 80,
      audio: true,
      shadows: false,
      invert: true,
      showHud: false,
      reducedMotion: true,
    });
    expect(p.fov).toBe(80);
    expect(p.quality).toBe("custom");
    expect(p.shadows).toBe(false);
    expect(p.showHud).toBe(false);
    expect(p.reducedMotion).toBe(true);
    expect(p.audio).toBe(true);
  });
});
