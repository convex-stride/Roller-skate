export type Spot = { id: string; city: "gdansk" | "riyadh"; name: string; x: number; z: number; height: number; gap: number; color: number; layout: "gap" | "street" | "pump" | "vert"; size: [number, number] };
export const spots: Spot[] = [
  { id: "dock", city: "gdansk", name: "DOCKYARD SESSIONS", x: -1250, z: -270, height: 1.8, gap: 3, color: 0xed8856, layout: "gap", size: [128, 202] },
  { id: "garden", city: "riyadh", name: "SKY GARDEN", x: 1460, z: -270, height: 3, gap: 5, color: 0x8bd8c6, layout: "gap", size: [128, 202] },
  { id: "baltic", city: "gdansk", name: "BALTIC FLOW", x: -1560, z: -570, height: 1.2, gap: 0, color: 0x7cc6d4, layout: "pump", size: [104, 164] },
  { id: "stocznia", city: "gdansk", name: "STOCZNIA STREET", x: -1570, z: 50, height: 1.4, gap: 0, color: 0xe4a464, layout: "street", size: [92, 136] },
  { id: "oliwa", city: "gdansk", name: "OLIWA VERT", x: -1460, z: 550, height: 2.6, gap: 0, color: 0xb1bf83, layout: "vert", size: [88, 140] },
  { id: "brickline", city: "gdansk", name: "BRICKLINE COURTS", x: -1080, z: 500, height: 1.2, gap: 0, color: 0xc98976, layout: "street", size: [92, 136] },
  { id: "island", city: "gdansk", name: "ISLAND TRANSFER", x: -620, z: 500, height: 2, gap: 4, color: 0x91b3ca, layout: "gap", size: [128, 202] },
  { id: "canal", city: "gdansk", name: "CANAL POCKET", x: -560, z: -520, height: 0.9, gap: 0, color: 0x96c3ad, layout: "pump", size: [104, 164] },
  { id: "wadi", city: "riyadh", name: "WADI FLOW", x: 440, z: -550, height: 1.2, gap: 0, color: 0x8dbcb1, layout: "pump", size: [104, 164] },
  { id: "najdi", city: "riyadh", name: "NAJDI LINES", x: 450, z: 30, height: 1.2, gap: 0, color: 0xd2a573, layout: "street", size: [92, 136] },
  { id: "palm", city: "riyadh", name: "PALM HALFPIPE", x: 500, z: 550, height: 2.6, gap: 0, color: 0x8bbaa7, layout: "vert", size: [88, 140] },
  { id: "dune", city: "riyadh", name: "DUNE TRANSFER", x: 1020, z: 520, height: 2.2, gap: 4, color: 0xe4ba80, layout: "gap", size: [128, 202] },
  { id: "olaya-park", city: "riyadh", name: "OLAYA PLAZA", x: 1510, z: 500, height: 1.4, gap: 0, color: 0xa7c4d0, layout: "street", size: [92, 136] },
  { id: "desert", city: "riyadh", name: "DESERT WAVE", x: 1500, z: -600, height: 1.1, gap: 0, color: 0xe2a67b, layout: "pump", size: [104, 164] },
];
export function insideSpot(x: number, z: number, margin = 0) {
  return spots.some(s => Math.abs(x - s.x) < s.size[0] / 2 + 2 + margin && Math.abs(z - s.z) < s.size[1] / 2 + 2 + margin);
}
/** Cut underlying street/tile faces at park edges to prevent paving flicker. */
export function outsideParkFootprints(rect: { x: number; z: number; w: number; d: number }) {
  let result = [rect];
  for (const park of spots) {
    const next: typeof result = [];
    for (const r of result) {
      const left = r.x - r.w / 2, right = r.x + r.w / 2, near = r.z - r.d / 2, far = r.z + r.d / 2;
      const a = Math.max(left, park.x - park.size[0] / 2), b = Math.min(right, park.x + park.size[0] / 2);
      const c = Math.max(near, park.z - park.size[1] / 2), d = Math.min(far, park.z + park.size[1] / 2);
      if (a >= b || c >= d) { next.push(r); continue; }
      if (c > near) next.push({ x: r.x, z: (near + c) / 2, w: r.w, d: c - near });
      if (d < far) next.push({ x: r.x, z: (d + far) / 2, w: r.w, d: far - d });
      if (a > left) next.push({ x: (left + a) / 2, z: (c + d) / 2, w: a - left, d: d - c });
      if (b < right) next.push({ x: (b + right) / 2, z: (c + d) / 2, w: right - b, d: d - c });
    }
    result = next;
  }
  return result;
}
export type Course = { id: string; spot: Spot; name: string; kind: "gap" | "slalom" | "jam"; description: string; gold: number; limit: number; start: { x: number; z: number }; gates: { x: number; y: number; z: number; label: string }[] };
const originalSpots = spots.slice(0, 2);
export const courses: Course[] = originalSpots.flatMap(spot => (["gap", "slalom", "jam"] as const).map(kind => ({
  id: `${spot.id}-${kind}`, spot, kind,
  name: kind === "gap" ? (spot.id === "dock" ? "Container hop" : "Rooftop leap") : kind === "slalom" ? (spot.id === "dock" ? "Cargo weave" : "Palm slalom") : "45-second trick party",
  description: kind === "gap" ? "Climb the ramp. Jump at the striped edge. Land on the next roof." : kind === "slalom" ? "Carve through the gates and watch the moving maintenance cart." : "Land spins, grabs and grinds. Bank 300 points before time runs out.",
  gold: kind === "gap" ? 27 : kind === "slalom" ? 29 : 1200,
  limit: kind === "jam" ? 45 : 80,
  start: { x: spot.x + (kind === "slalom" ? 28 : kind === "jam" ? -27 : 0), z: spot.z - 78 },
  gates: kind === "jam" ? [] : (kind === "gap" ? [
    [0, 0.83, -51, "BUILD SPEED"], [0, spot.height + 0.83, -10, "ROOF · JUMP AT THE STRIPE"],
    [0, spot.height + 0.83, 22, "LAND ON THE NEXT ROOF"], [0, 0.83, 78, "FINISH"],
  ] : [[28, 0.83, -49, "CARVE RIGHT"], [34, 0.83, -20, "CARVE LEFT"], [22, 0.83, 9, "WATCH THE CART"], [33, 0.83, 43, "LAST TURN"], [28, 0.83, 78, "FINISH"]]).map(([x, y, z, label]) => ({ x: spot.x + Number(x), y: Number(y), z: spot.z + Number(z), label: String(label) })),
})));
for (const spot of spots.slice(2)) courses.push({
  id: `${spot.id}-jam`, spot, kind: "jam", name: `${spot.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} session`,
  description: spot.layout === "pump" ? "Work the rollers, jump the crests, and bank 300 points in 45 seconds."
    : spot.layout === "vert" ? "Ride the curved quarter pipes, add air tricks, and bank 300 points in 45 seconds."
    : spot.layout === "street" ? "Link banks, manuals and rail tricks. Bank 300 points in 45 seconds."
    : "Clear the roof gap and link the grind lines. Bank 300 points in 45 seconds.",
  gold: 1200, limit: 45, start: { x: spot.x, z: spot.z + (spot.layout === "vert" ? -17 : -spot.size[1] / 2 + 15) }, gates: [],
});
export type RunSample = { x: number; y: number; z: number; grounded: boolean; jumps: number; score: number };
export class SpotRun {
  elapsed = 0; gate = 0; status: "riding" | "finished" | "failed" = "riding";
  medal: "GOLD" | "SILVER" | "BRONZE" | null = null;
  constructor(readonly course: Course, readonly initialJumps: number, readonly initialScore: number) {}
  isRunning() { return this.status === "riding"; }
  tick(s: RunSample, dt: number) {
    if (this.status !== "riding") return;
    this.elapsed += dt;
    const c = this.course, score = s.score - this.initialScore;
    if (c.kind === "jam") {
      if (this.elapsed >= c.limit) {
        this.status = score >= 300 ? "finished" : "failed";
        if (this.status === "finished") this.medal = score >= c.gold ? "GOLD" : score >= 600 ? "SILVER" : "BRONZE";
      }
      return;
    }
    if (this.elapsed >= c.limit) { this.status = "failed"; return; }
    const g = c.gates[this.gate];
    if (Math.hypot(s.x - g.x, s.z - g.z) < 4 && Math.abs(s.y - g.y) < 1.1 &&
        (this.gate < c.gates.length - 1 || (s.grounded && (c.kind !== "gap" || s.jumps > this.initialJumps)))) {
      this.gate++;
      if (this.gate === c.gates.length) {
        this.status = "finished";
        this.medal = this.elapsed <= c.gold ? "GOLD" : this.elapsed <= c.gold * 1.6 ? "SILVER" : "BRONZE";
      }
    }
  }
}
