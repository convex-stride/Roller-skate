export type Spot = { id: string; city: "gdansk" | "riyadh"; name: string; x: number; z: number; height: number; gap: number; color: number };
export const spots: Spot[] = [
  { id: "dock", city: "gdansk", name: "DOCKYARD SESSIONS", x: -1250, z: -270, height: 1.8, gap: 3, color: 0xed8856 },
  { id: "garden", city: "riyadh", name: "SKY GARDEN", x: 1460, z: -270, height: 3, gap: 5, color: 0x8bd8c6 },
];
export function insideSpot(x: number, z: number, margin = 0) {
  return spots.some(s => Math.abs(x - s.x) < 66 + margin && Math.abs(z - s.z) < 103 + margin);
}
export type Course = { id: string; spot: Spot; name: string; kind: "gap" | "slalom" | "jam"; description: string; gold: number; limit: number; start: { x: number; z: number }; gates: { x: number; y: number; z: number; label: string }[] };
export const courses: Course[] = spots.flatMap(spot => (["gap", "slalom", "jam"] as const).map(kind => ({
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
