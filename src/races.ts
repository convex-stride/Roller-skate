export type RacePoint = { x: number; z: number };
export type RaceDefinition = { id: string; name: string; city: "gdansk" | "riyadh"; area: string; start: RacePoint; heading: number; checkpoints: RacePoint[]; laps: number; limit: number };
export const races: RaceDefinition[] = [
  { id: "race-motlawa", name: "Motława Dash", city: "gdansk", area: "Motława Quay", start: { x: -1090, z: 73.6 }, heading: Math.PI / 2,
    checkpoints: [-1070, -1045, -1020, -1008].map(x => ({ x, z: 73.6 })), laps: 1, limit: 60 },
  { id: "race-olaya", name: "Olaya Boulevard Sprint", city: "riyadh", area: "Olaya", start: { x: 1004, z: -72 }, heading: 0,
    checkpoints: [-15, 55, 125, 200].map(z => ({ x: 1004, z })), laps: 1, limit: 90 },
  { id: "race-dockyard", name: "Dockyard Circuit", city: "gdansk", area: "Dockyard Sessions", start: { x: -1266, z: -340 }, heading: 0,
    checkpoints: [{ x: -1266, z: -200 }, { x: -1235, z: -200 }, { x: -1235, z: -340 }, { x: -1266, z: -340 }], laps: 2, limit: 210 },
  { id: "race-garden", name: "Sky Garden Circuit", city: "riyadh", area: "Sky Garden", start: { x: 1444, z: -340 }, heading: 0,
    checkpoints: [{ x: 1444, z: -200 }, { x: 1475, z: -200 }, { x: 1475, z: -340 }, { x: 1444, z: -340 }], laps: 2, limit: 210 },
];
export type RacerProgress = { id: string; name: string; gate: number; position: RacePoint; finish: number | null; place: number | null };
export type RaceSample = RacePoint & { id: string; y: number; grounded: boolean };
export const placeLabel = (place: number) => `${place}${place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th"}`;
export class RaceRun {
  countdown = 3;
  elapsed = 0;
  status: "countdown" | "racing" | "finished" | "timeout" = "countdown";
  entrants: RacerProgress[];
  constructor(readonly definition: RaceDefinition, names = definition.city === "gdansk" ? ["Layan", "Marta", "Kuba", "Ola"] : ["Layan", "Noura", "Omar", "Hana"]) {
    this.entrants = names.map((name, n) => ({ id: n === 0 ? "player" : `rival-${n}`, name, gate: 0, position: { ...definition.start }, finish: null, place: null }));
  }
  get player() { return this.entrants[0]; }
  get totalGates() { return this.definition.checkpoints.length * this.definition.laps; }
  get locked() { return this.status === "countdown"; }
  target(id = "player") {
    const entrant = this.entrants.find(e => e.id === id)!;
    return this.definition.checkpoints[entrant.gate % this.definition.checkpoints.length];
  }
  tick(samples: RaceSample[], dt: number) {
    if (this.status === "timeout") return;
    if (this.status === "countdown") {
      this.countdown = Math.max(0, this.countdown - dt);
      if (this.countdown === 0) this.status = "racing";
      return;
    }
    this.elapsed += dt;
    if (this.elapsed > this.definition.limit && this.player.finish === null) { this.status = "timeout"; return; }
    // Fixed-step samples prevent frame rate from affecting race time or gate order.
    for (const sample of samples) {
      const e = this.entrants.find(e => e.id === sample.id);
      if (!e || e.finish !== null) continue;
      const target = this.target(e.id);
      const previousPosition = e.position;
      e.position = { x: sample.x, z: sample.z };
      const final = e.gate + 1 === this.totalGates;
      const before = this.definition.checkpoints[(e.gate - 1 + this.definition.checkpoints.length) % this.definition.checkpoints.length];
      const dx = target.x - before.x, dz = target.z - before.z, length = Math.max(0.01, Math.hypot(dx, dz));
      const along = ((sample.x - target.x) * dx + (sample.z - target.z) * dz) / length;
      const previousAlong = ((previousPosition.x - target.x) * dx + (previousPosition.z - target.z) * dz) / length;
      const lateral = Math.abs((sample.x - target.x) * dz - (sample.z - target.z) * dx) / length;
      const reached = final ? along >= 0 && along < 4 && lateral < 3.3 : Math.hypot(sample.x - target.x, sample.z - target.z) < 4;
      if (reached && sample.y > 0.5 && sample.y < 3) {
        e.gate++;
        if (e.gate === this.totalGates) {
          const fraction = previousAlong < 0 ? Math.max(0, Math.min(1, -previousAlong / Math.max(0.001, along - previousAlong))) : 1;
          e.finish = this.elapsed - dt + fraction * dt;
        }
      }
    }
    this.entrants.filter(e => e.finish !== null).sort((a, b) => a.finish! - b.finish!).forEach((e, i) => e.place = i + 1);
    if (this.player.finish !== null) this.status = "finished";
  }
  progress(e: RacerProgress) {
    if (e.finish !== null) return this.totalGates;
    const count = this.definition.checkpoints.length;
    const from = e.gate === 0 ? this.definition.start : this.definition.checkpoints[(e.gate - 1) % count];
    const to = this.target(e.id), dx = to.x - from.x, dz = to.z - from.z;
    return e.gate + Math.max(0, Math.min(0.999, ((e.position.x - from.x) * dx + (e.position.z - from.z) * dz) / Math.max(1, dx * dx + dz * dz)));
  }
  standings() {
    return [...this.entrants].sort((a, b) => {
      if (a.place !== null || b.place !== null) return (a.place ?? 99) - (b.place ?? 99);
      return this.progress(b) - this.progress(a);
    });
  }
  get position() { return this.player.place ?? this.standings().findIndex(e => e.id === "player") + 1; }
}
