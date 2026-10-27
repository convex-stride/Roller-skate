export type Landmark = {
  id: string;
  name: string;
  city: "gdansk" | "riyadh";
  kind: "crane" | "townhall" | "gate" | "kingdom" | "faisaliyah" | "masmak" | "neptune" | "deera" | "basilica" | "pif";
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  spawn: { x: number; z: number };
  description: string;
};
export const cityStarts = {
  gdansk: { x: -1068, z: 76, heading: Math.PI / 2, name: "Motława Quay · Żuraw waterfront" },
  riyadh: { x: 1255, z: -8, heading: 0, name: "Al Masmak · Deera heritage square" },
};
export const practiceRails = [
  { x: -1045, z: 76, length: 16, axis: "x" as const },
  { x: 1255, z: 16, length: 14, axis: "z" as const },
];
export const heritageShops = [
  { x: 1210, z: 17, w: 12, d: 28 },
  { x: 1300, z: 17, w: 12, d: 28 },
];
// Reserved for the hand-authored heritage square, including its open run-up.
export function inHeritageSquare(x: number, z: number, margin = 0) {
  return Math.abs(x - 1255) < 58 + margin && Math.abs(z - 10) < 42 + margin;
}
// Compressed architectural interpretations, not surveyed building coordinates.
export const landmarks: Landmark[] = [
  {
    id: "st-marys", name: "St. Mary’s Basilica", city: "gdansk", kind: "basilica",
    x: -1120, z: -20, w: 43, d: 66, h: 68,
    spawn: { x: -1000, z: -210 },
    description: "Gdańsk’s monumental brick church: broad square bell tower, stepped gables and tall pointed windows.",
  },
  {
    id: "pif-tower", name: "PIF Tower · KAFD", city: "riyadh", kind: "pif",
    x: 1100, z: -350, w: 42, d: 42, h: 142,
    spawn: { x: 1100, z: -600 },
    description: "The faceted glass tower and angular crown of King Abdullah Financial District, in a compressed skyline setting.",
  },
  {
    id: "neptune", name: "Neptune’s Fountain", city: "gdansk", kind: "neptune",
    x: -1000, z: -38, w: 7, d: 7, h: 6,
    spawn: { x: -1000, z: -52 },
    description: "Long Market's bronze Neptune, trident and ornamented stone basin.",
  },
  {
    id: "deera", name: "Deera Clock Tower", city: "riyadh", kind: "deera",
    x: 1225, z: -16, w: 7, d: 7, h: 22,
    spawn: { x: 1225, z: -56 },
    description: "A pale clock tower beside the traditional market and Masmak square.",
  },
  {
    id: "zuraw",
    name: "Żuraw",
    city: "gdansk",
    kind: "crane",
    x: -1080,
    z: 139,
    w: 24,
    d: 16,
    h: 29,
    spawn: { x: -1000, z: 70 },
    description:
      "Brick harbour gate with the projecting timber medieval crane.",
  },
  {
    id: "townhall",
    name: "Main Town Hall",
    city: "gdansk",
    kind: "townhall",
    x: -1090,
    z: -115,
    w: 29,
    d: 19,
    h: 67,
    spawn: { x: -1000, z: -290 },
    description: "Gothic brick hall, clock tower, and slender copper spire.",
  },
  {
    id: "green-gate",
    name: "Green Gate",
    city: "gdansk",
    kind: "gate",
    x: -1000,
    z: 171,
    w: 47,
    d: 12,
    h: 21,
    spawn: { x: -1000, z: 115 },
    description:
      "A long Renaissance river gate with four ground-floor passages.",
  },
  {
    id: "kingdom",
    name: "Kingdom Centre",
    city: "riyadh",
    kind: "kingdom",
    x: 1000,
    z: 245,
    w: 43,
    d: 29,
    h: 112,
    spawn: { x: 1000, z: -70 },
    description:
      "Tapered modern tower with its distinctive upper opening and skybridge.",
  },
  {
    id: "faisaliyah",
    name: "Al Faisaliyah",
    city: "riyadh",
    kind: "faisaliyah",
    x: 910,
    z: -185,
    w: 34,
    d: 34,
    h: 99,
    spawn: { x: 1000, z: 120 },
    description:
      "Triangular tower with the suspended golden globe near its tip.",
  },
  {
    id: "masmak",
    name: "Masmak",
    city: "riyadh",
    kind: "masmak",
    x: 1255,
    z: 75,
    w: 48,
    d: 40,
    h: 12,
    spawn: { x: 1255, z: 35 },
    description:
      "An earth-toned fortress courtyard framed by four round corner towers.",
  },
];
export function landmarkAt(x: number, z: number, margin = 0) {
  return landmarks.find(
    (l) =>
      Math.abs(x - l.x) < l.w / 2 + margin &&
      Math.abs(z - l.z) < l.d / 2 + margin,
  );
}
export const surfaceAt = (x: number, z: number) => {
  if (inHeritageSquare(x, z)) return { name: "LIMESTONE", rolling: 0.009, grip: 0.8 };
  if (x > -1100 && x < -900 && ((z > 69 && z < 86) || (z > 110 && z < 127)))
    return { name: "STONE", rolling: 0.014, grip: 0.72 };
  if (x > 200 && Math.abs(x - 1000) < 11.5 && z > -83 && z < 83)
    return { name: "ASPHALT", rolling: 0.01, grip: 0.87 };
  if (x < -200 && Math.abs(x + 1000) < 24 && z > -85 && z < 155)
    return { name: "STONE", rolling: 0.014, grip: 0.72 };
  if (x > 200 && Math.abs(x - 1000) < 60 && z > -85 && z < 145)
    return { name: "LIMESTONE", rolling: 0.009, grip: 0.8 };
  return { name: "ASPHALT", rolling: 0.01, grip: 0.87 };
};
