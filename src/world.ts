import { landmarkAt, inHeritageSquare, heritageShops } from "./city-profile";
import { insideSpot, spots } from "./spots";
import { parkObstacleAt } from "./park-layouts";
import { races } from "./races";
import { makeDistrictSites, districtPropAt, type DistrictSite } from "./district-content";
export const CITY_SIZE = 1600;
export const CHUNK = 200;
export type City = "gdansk" | "riyadh";
export const centers = { gdansk: -1000, riyadh: 1000 };
export const districts = {
  gdansk: [
    "Motława Quay",
    "Shipyard",
    "Old Town",
    "Island Bridges",
    "Coastal Park",
    "Brick Quarter",
  ],
  riyadh: [
    "Skyline Plaza",
    "Sandstone Courts",
    "Wadi Park",
    "Palm Boulevard",
    "Arts Quarter",
    "Ridge Gardens",
  ],
};
export function cityAt(x: number): City {
  return x < 0 ? "gdansk" : "riyadh";
}
export function inWorld(x: number, z: number) {
  return (
    ((Math.abs(x + 1000) <= 800 || Math.abs(x - 1000) <= 800) &&
      Math.abs(z) <= 800) ||
    (Math.abs(x) <= 200 && Math.abs(z) <= 150)
  );
}
export function hash(x: number, z: number, seed = 1) {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}
export type Building = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: number;
  front?: "x" | "z";
  hero?: boolean;
  facing?: number;
  style?: "merchant" | "warehouse" | "modern" | "najdi";
};
export type Street = { x: number; z: number; w: number; d: number };
/** The renderer and navigation use the same street footprints. No overlapping junction faces. */
const streetCache = new Map<string, Street[]>();
export function streets(cx: number, cz: number, city: City): Street[] {
  const key = `${city}:${cx}:${cz}`;
  if (!streetCache.has(key)) streetCache.set(key, makeStreets(cx, cz, city));
  return streetCache.get(key)!;
}
function makeStreets(cx: number, cz: number, city: City): Street[] {
  if (city === "gdansk") {
    const result: Street[] = [{ x: cx, z: cz, w: 200, d: 7 }];
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const z = cz + side * (3.5 + (i + 0.5) * 24.125);
        result.push({ x: cx + Math.sin(z * 0.012) * 5, z, w: 9, d: 24.125 });
      }
    return result;
  }
  // Riyadh's large orthogonal blocks and six-lane arterials have a different scale.
  const result: Street[] = [];
  const left = cx - 100, right = cx + 100, near = cz - 100, far = cz + 100;
  for (const roadX of [200, 600, 1000, 1400, 1800]) {
    const a = Math.max(left, roadX - 14), b = Math.min(right, roadX + 14);
    if (b > a) result.push({ x: (a + b) / 2, z: cz, w: b - a, d: 200 });
  }
  for (const roadZ of [-600, -200, 200, 600]) {
    const a = Math.max(near, roadZ - 12), b = Math.min(far, roadZ + 12);
    if (b <= a) continue;
    // Split cross streets at the vertical arteries so there are no coplanar faces.
    let start = left;
    for (const roadX of [200, 600, 1000, 1400, 1800]) {
      if (roadX + 14 <= left || roadX - 14 >= right) continue;
      const end = Math.max(start, roadX - 14);
      if (end > start) result.push({ x: (start + end) / 2, z: (a + b) / 2, w: end - start, d: b - a });
      start = Math.min(right, roadX + 14);
    }
    if (start < right) result.push({ x: (start + right) / 2, z: (a + b) / 2, w: right - start, d: b - a });
  }
  return result;
}
export function inCanal(x: number, z: number) {
  return x > -1100 && x < -900 && z > 86 && z < 110 && Math.abs(x + 1000) > 6;
}
const buildingCache = new Map<string, Building[]>();
export function buildings(cx: number, cz: number, city: City): Building[] {
  const key = `${city}:${cx}:${cz}`;
  if (buildingCache.has(key)) return buildingCache.get(key)!;
  const colors =
    city === "gdansk"
      ? [0xce886c, 0xd4bd8d, 0x9bada4, 0xdca285, 0xb7c8c1]
      : [0xd1b591, 0xe5d2ad, 0xc5a17b, 0xbca98c, 0xe9d9b9];
  let result: Building[] = [-1, 1].flatMap((a) =>
    (city === "gdansk" ? [-77, -54, -31, 31, 54, 77] : [-52, 52]).map((b, i) => ({
      x: cx + a * (city === "gdansk" ? 22 : 53) + (city === "gdansk" ? Math.sin((cz + b) * 0.012) * 5 : 0),
      z: cz + b,
      w: city === "gdansk" ? 10 + hash(cx, cz, a + i) * 3 : 26 + hash(cx, cz, a + i) * 9,
      d: city === "gdansk" ? 21 : 36,
      h: city === "gdansk" ? 12 + hash(cx, cz, a + i) * 10 : Math.abs(cx - 1000) > 340 ? 7 + hash(cx, cz, a + i) * 9 : 32 + hash(cx, cz, a + i) * 52,
      color: colors[Math.floor(hash(cx, cz, a * b + 5) * colors.length)],
      front: "x" as const,
      facing: -a,
      style: city === "gdansk" ? ("merchant" as const) : Math.abs(cx - 1000) > 340 ? ("najdi" as const) : ("modern" as const),
    })),
  );
  const center = centers[city];
  // Keep the Masmak/Deera quarter low-rise; the glass skyline belongs to Olaya.
  if (city === "riyadh") for (const b of result) {
    if (Math.abs(b.x - 1255) < 220 && Math.abs(b.z - 75) < 240) {
      b.style = "najdi";
      b.h = 7 + hash(b.x, b.z, 31) * 8;
    }
  }
  result = result.filter(
    (b) => Math.abs(b.x - center) > 125 || Math.abs(b.z) > 175,
  );
  for (const side of [-1, 1])
    for (let i = 0; i < (city === "gdansk" ? 11 : 3); i++) {
      if (city === "gdansk" && side < 0 && i > 6) continue; // Open the street onto the quay.
      const x = center + side * (city === "gdansk" ? 24 : 55),
        z = city === "gdansk" ? -72 + i * 14 : -66 + i * 66;
      const ownerX = Math.floor((x - center + 800) / 200) * 200 + center - 700;
      const ownerZ = Math.floor((z + 800) / 200) * 200 - 700;
      if (ownerX === cx && ownerZ === cz)
        result.push({
          x,
          z,
          w: city === "gdansk" ? 10 : 30,
          d: city === "gdansk" ? 12 : 42,
          h:
            city === "gdansk"
              ? 17 + hash(i, side) * 10
              : side > 0 ? 58 + hash(i, side) * 24 : 10 + hash(i, side) * 7,
          color: colors[(i + (side + 1) * 2) % colors.length],
          front: "x",
          facing: -side,
          hero: true,
          style: city === "gdansk" ? "merchant" : side < 0 ? "najdi" : "modern",
        });
    }
  result = result.filter(
    (b) =>
      !(
        city === "gdansk" &&
        b.x + b.w / 2 > -1100 &&
        b.x - b.w / 2 < -900 &&
        b.z + b.d / 2 > 86 &&
        b.z - b.d / 2 < 110
      ),
  );
  result = result.filter(
    (b) => !insideSpot(b.x, b.z, Math.max(b.w, b.d) / 2 + 8) && !landmarkAt(b.x, b.z, Math.max(b.w, b.d) / 2 + 6) &&
      !(city === "riyadh" && inHeritageSquare(b.x, b.z, Math.max(b.w, b.d) / 2 + 6)),
  );
  buildingCache.set(key, result);
  return result;
}
export type Activity = {
  id: string;
  city: City;
  district: string;
  kind: "sprint" | "jam" | "line";
  x: number;
  z: number;
};
const clearanceBuildings = new Map<string, Building[]>();
export function clearGroundBase(x: number, z: number, margin = 2) {
  if (!inWorld(x, z)) return false;
  if (Math.abs(x) < 200) return true;
  const city = cityAt(x),
    ix = Math.floor((x - centers[city] + 800) / 200),
    iz = Math.floor((z + 800) / 200);
  if (inCanal(x, z)) return false;
  if (landmarkAt(x, z, margin)) return false;
  for (const s of spots) {
    if (parkObstacleAt(s, x, z, margin)) return false;
  }
  if (heritageShops.some(b => Math.abs(x - b.x) < b.w / 2 + margin + 4 && Math.abs(z - b.z) < b.d / 2 + margin)) return false;
  const key = `${city}:${ix}:${iz}`;
  if (!clearanceBuildings.has(key)) {
    const nearby: Building[] = [];
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) nearby.push(...buildings(centers[city] - 700 + (ix + dx) * 200, -700 + (iz + dz) * 200, city));
    clearanceBuildings.set(key, nearby);
  }
  return clearanceBuildings.get(key)!.every(
      (b) =>
        Math.abs(x - b.x) > b.w / 2 + margin + (b.style === "najdi" ? 4 : 0) ||
        Math.abs(z - b.z) > b.d / 2 + margin,
    );
}
const neighborhoodCache = new Map<string, { x: number; z: number; city: City }[]>();
function neighboringCells(x: number, z: number) {
  const city = cityAt(x), center = centers[city], ix = Math.floor((x - center + 800) / 200), iz = Math.floor((z + 800) / 200);
  const key = `${city}:${ix}:${iz}`;
  if (neighborhoodCache.has(key)) return neighborhoodCache.get(key)!;
  const cells: { x: number; z: number; city: City }[] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (ix + dx >= 0 && ix + dx < 8 && iz + dz >= 0 && iz + dz < 8) cells.push({ x: center - 700 + (ix + dx) * 200, z: -700 + (iz + dz) * 200, city });
  neighborhoodCache.set(key, cells);
  return cells;
}
export function onStreet(x: number, z: number, margin = 0) {
  if (Math.abs(x) < 200) return true;
  return neighboringCells(x, z).some(c => streets(c.x, c.z, c.city).some(r => Math.abs(x - r.x) < r.w / 2 + margin && Math.abs(z - r.z) < r.d / 2 + margin));
}
function distanceToSegment(x: number, z: number, a: { x: number; z: number }, b: { x: number; z: number }) {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / Math.max(1, dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
export function protectedActivityGround(x: number, z: number, margin: number) {
  if (Math.abs(x) < 200 + margin || insideSpot(x, z, margin + 4) || inHeritageSquare(x, z, margin + 10) || landmarkAt(x, z, margin + 10)) return true;
  const city = cityAt(x);
  if (Math.abs(x - centers[city]) < 75 + margin && Math.abs(z) < 210 + margin) return true;
  if (x < 0 && x > -1120 - margin && x < -880 + margin && z > 62 - margin && z < 134 + margin) return true;
  return races.some(r => [r.start, ...r.checkpoints].slice(1).some((p, i) => distanceToSegment(x, z, [r.start, ...r.checkpoints][i], p) < 8 + margin));
}
const districtCache = new Map<string, DistrictSite[]>();
export function districtSites(cx: number, cz: number, city: City) {
  const key = `${city}:${cx}:${cz}`;
  if (!districtCache.has(key)) districtCache.set(key, makeDistrictSites(cx, cz, city, (x, z, radius) =>
    clearGroundBase(x, z, radius + 1) && !onStreet(x, z, radius + 3) && !protectedActivityGround(x, z, radius)));
  return districtCache.get(key)!;
}
export function clearGround(x: number, z: number, margin = 2) {
  if (!clearGroundBase(x, z, margin)) return false;
  return !neighboringCells(x, z).some(c => districtPropAt(districtSites(c.x, c.z, c.city), x, z, margin));
}
function safePoint(x: number, z: number) {
  if (clearGround(x, z)) return { x, z };
  for (let r = 4; r <= 80; r += 4)
    for (let a = 0; a < 16; a++) {
      const p = {
        x: x + Math.cos((a * Math.PI) / 8) * r,
        z: z + Math.sin((a * Math.PI) / 8) * r,
      };
      if (clearGround(p.x, p.z)) return p;
    }
  throw Error("No reachable ground near world objective");
}
export const activities: Activity[] = [];
export const tokens: { id: string; x: number; z: number; city: City }[] = [];
for (const city of ["gdansk", "riyadh"] as const) {
  districts[city].forEach((district, i) => {
    const x = centers[city] + ((i % 3) - 1) * 480;
    const z = (Math.floor(i / 3) * 2 - 1) * 380;
    (["sprint", "jam", "line"] as const).forEach((kind, k) =>
      activities.push({
        id: `${city}-${i}-${kind}`,
        city,
        district,
        kind,
        ...safePoint(x + (k - 1) * 32, z),
      }),
    );
    for (let j = 0; j < 10; j++)
      tokens.push({
        id: `${city}-${i}-${j}`,
        city,
        ...safePoint(
          x + ((j % 5) - 2) * 54,
          z + (Math.floor(j / 5) * 2 - 1) * 55,
        ),
      });
  });
}
// A first reward is visible on the beginner's initial straight route.
tokens[0] = { ...tokens[0], x: -1000, z: 12 };
tokens[60] = { ...tokens[60], x: 1000, z: 12 };
const routeCache = new Map<string, { x: number; z: number }[]>();
export function routeFor(a: Activity) {
  if (!routeCache.has(a.id))
    routeCache.set(
      a.id,
      [
        { x: a.x, z: a.z - 70 },
        { x: a.x + 100, z: a.z - 100 },
        { x: a.x + 145, z: a.z + 25 },
        { x: a.x + 25, z: a.z + 110 },
        { x: a.x, z: a.z },
      ].map((p) => safePoint(p.x, p.z)),
    );
  return routeCache.get(a.id)!;
}
