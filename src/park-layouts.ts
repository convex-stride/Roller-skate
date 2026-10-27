import type { Spot } from "./spots";
export type ParkBox = { x: number; z: number; y: number; w: number; h: number; d: number; rotation?: number };
export type ParkSurface = { x: number; z: number; w: number; profile: [number, number][]; name: string };
export type ParkRail = { x: number; z: number; length: number; axis: "x" | "z" };
const layoutCache = new Map<string, { boxes: ParkBox[]; surfaces: ParkSurface[]; rails: ParkRail[] }>();
export function parkLayout(spot: Spot) {
  const cached = layoutCache.get(spot.id); if (cached) return cached;
  const boxes: ParkBox[] = [], surfaces: ParkSurface[] = [], rails: ParkRail[] = [];
  const bank = (x: number, z: number, height: number, length: number, width: number, direction = 1) => {
    boxes.push({ x, z, y: height / 2 - 0.06, w: width, h: 0.12, d: Math.hypot(height, length), rotation: -Math.atan(height / length) * direction });
  };
  const quarter = (x: number, z: number, radius: number, w: number, direction: number) => {
    const profile: [number, number][] = [];
    for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; profile.push([direction * radius * Math.sin(a), radius * (1 - Math.cos(a))]); }
    surfaces.push({ x, z, w, profile, name: "quarter pipe" });
    boxes.push({ x, z: z + direction * (radius + 1.8), y: radius / 2, w, h: radius, d: 3.6 });
  };
  if (spot.layout === "street") {
    bank(-15, -31, spot.height, 14, 10);
    boxes.push({ x: -15, z: -19, y: spot.height / 2, w: 10, h: spot.height, d: 10 });
    bank(-15, -7, spot.height, 14, 10, -1);
    boxes.push({ x: 0, z: 17, y: 0.22, w: 12, h: 0.44, d: 3 });
    boxes.push({ x: -24, z: 26, y: 0.3, w: 2, h: 0.6, d: 18 });
    for (let i = 0; i < 5; i++) boxes.push({ x: 21, z: 17 + i * 1.1, y: (i + 1) * 0.12 / 2, w: 9, h: (i + 1) * 0.12, d: 1.1 });
    bank(21, 33, 0.6, 18, 9, -1);
    rails.push({ x: 0, z: -22, length: 20, axis: "z" }, { x: 7, z: 17, length: 17, axis: "z" }, { x: 20, z: -17, length: 16, axis: "x" });
    quarter(0, 44, 1.4, 17, 1);
  } else if (spot.layout === "pump") {
    const profile: [number, number][] = [];
    for (let i = 0; i <= 120; i++) { const z = -60 + i; profile.push([z, spot.height * 0.5 * (1 - Math.cos((z + 60) / 20 * Math.PI * 2))]); }
    surfaces.push({ x: 0, z: 0, w: 12, profile, name: "pump rollers" });
    const sideProfile: [number, number][] = [];
    for (let i = 0; i <= 80; i++) { const z = -40 + i; sideProfile.push([z, spot.height * 0.35 * (1 - Math.cos((z + 40) / 20 * Math.PI * 2))]); }
    surfaces.push({ x: 27, z: 0, w: 8, profile: sideProfile, name: "mini rollers" });
    quarter(-25, -30, 1.6, 12, -1); quarter(-25, 30, 1.6, 12, 1);
    rails.push({ x: -25, z: 0, length: 20, axis: "z" });
  } else if (spot.layout === "vert") {
    quarter(0, -32, spot.height, 22, -1); quarter(0, 32, spot.height, 22, 1);
    quarter(-25, 24, 1.4, 12, 1); quarter(25, -24, 1.4, 12, -1);
    boxes.push({ x: -25, z: -15, y: 0.25, w: 2, h: 0.5, d: 17 });
    rails.push({ x: 25, z: 17, length: 20, axis: "z" });
  }
  const layout = { boxes, surfaces, rails }; layoutCache.set(spot.id, layout); return layout;
}
/** Shared triangulation is used by rendering, Rapier and the riding checks. */
export function surfaceGeometry(surface: ParkSurface) {
  const vertices: number[] = [], indices: number[] = [];
  const forward = surface.profile.at(-1)![0] > surface.profile[0][0];
  for (const [z, y] of surface.profile) vertices.push(surface.x - surface.w / 2, y, surface.z + z, surface.x + surface.w / 2, y, surface.z + z);
  for (let i = 0; i < surface.profile.length - 1; i++) {
    const n = i * 2;
    if (forward) indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    else indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}
export function parkObstacleAt(spot: Spot, x: number, z: number, margin: number) {
  const localX = x - spot.x, localZ = z - spot.z;
  if (Math.abs(localX) > spot.size[0] / 2 + margin || Math.abs(localZ) > spot.size[1] / 2 + margin) return false;
  if (spot.layout === "gap") return (Math.abs(localX) < 5 + margin && localZ > -50 - margin && localZ < 66 + margin) || (Math.abs(Math.abs(localX) - 55) < 4 + margin && Math.abs(localZ) < 96 + margin);
  const layout = parkLayout(spot);
  if (layout.boxes.some(b => Math.abs(localX - b.x) < b.w / 2 + margin && Math.abs(localZ - b.z) < b.d / 2 + margin)) return true;
  return layout.surfaces.some(s => Math.abs(localX - s.x) < s.w / 2 + margin && localZ > s.z + Math.min(s.profile[0][0], s.profile.at(-1)![0]) - margin && localZ < s.z + Math.max(s.profile[0][0], s.profile.at(-1)![0]) + margin);
}
