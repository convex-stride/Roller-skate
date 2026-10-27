import { centers, districtSites, type City } from "./world";
import { themeNames, type DistrictSite } from "./district-content";
export type QuestKind = "delivery" | "collect" | "discover" | "style";
export type QuestPoint = { x: number; z: number; label?: string; detail?: string };
export type QuestDefinition = { id: string; title: string; city: City; area: string; giver: string; request: string; kind: QuestKind; reward: number; anchor: QuestPoint; objectives: QuestPoint[]; limit: number | null };
export const quests: QuestDefinition[] = [];
const kinds: QuestKind[] = ["delivery", "collect", "discover", "style"];
for (const city of ["gdansk", "riyadh"] as const) {
  const sites: DistrictSite[] = [];
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 8; iz++) sites.push(...districtSites(centers[city] - 700 + ix * 200, -700 + iz * 200, city));
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 4; iz++) {
    const x = centers[city] - 600 + ix * 400, z = -600 + iz * 400;
    const local = sites.filter(s => s.size >= 24 && Math.abs(s.x - x) < 200 && Math.abs(s.z - z) < 200).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
    if (local.length < 4) throw Error(`Missing activity sites for ${city} district ${ix},${iz}`);
    const site = local[0], kind = kinds[(ix + iz) % 4], number = ix * 4 + iz;
    const giver = (city === "gdansk" ? ["Iga", "Marek", "Klara", "Antek", "Emilia", "Paweł", "Nina", "Olek"] : ["Salma", "Yousef", "Noura", "Tariq", "Hana", "Omar", "Dana", "Faisal"])[number % 8];
    const title = kind === "delivery" ? city === "gdansk" ? "Neighbourhood courier" : "Coffee and market run" : kind === "collect" ? "Recover the supplies" : kind === "discover" ? "Neighbourhood field notes" : "Courtyard skate demo";
    const request = kind === "delivery" ? `${giver}: Three neighbours are waiting for supplies. Take the bundle to each marked drop-off, then come back for the sign-off.`
      : kind === "collect" ? `${giver}: Three supply crates went missing around this district. Recover them in any order and bring them back.`
      : kind === "discover" ? `${giver}: Help us make a neighbourhood guide. Stop at three marked places, inspect the details and bring back your notes.`
      : `${giver}: We’re putting on a local skate session here. Bank 300 trick points in this courtyard, then come back for your reward.`;
    quests.push({ id: `quest-${city}-${ix}-${iz}`, title, city, giver, kind, request,
      area: `${themeNames[site.theme]} · ${["West", "Inner West", "Inner East", "East"][ix]} / ${["South", "Inner South", "Inner North", "North"][iz]}`,
      reward: kind === "delivery" ? 180 : kind === "style" ? 160 : 140,
      anchor: { x: site.x, z: site.z }, objectives: kind === "style" ? [] : local.slice(1, 4).map((s, i) => ({ x: s.x, z: s.z,
        label: kind === "delivery" ? ["Volunteer drop-off", "Neighbour's order", "Community supplies"][i] : kind === "collect" ? ["Tool crate", "Event supplies", "Spare skate parts"][i] : themeNames[s.theme],
        detail: kind !== "discover" ? undefined : s.theme === "workshop" ? "Field note: the workshop has repair benches, stacked cargo and a practice rail."
          : s.theme === "garden" ? "Field note: raised planting beds and benches make a quiet Baltic garden."
          : s.theme === "oasis" ? "Field note: palms and planted beds create a green stopping place in the dry city."
          : s.theme === "souq" ? "Field note: fabric rolls, shaded counters and planting frame this market court."
          : s.theme === "art" ? "Field note: a geometric sculpture, a small stage and a skate rail share this art court."
          : "Field note: a community stage and market stall turn this court into a festival space." })), limit: kind === "delivery" ? 180 : null });
  }
}
export type QuestSnapshot = { id: string; stage: "objectives" | "return" | "complete" | "failed"; visited: number[]; stylePoints: number; elapsed: number };
export function validQuestSnapshot(value: unknown): value is QuestSnapshot {
  const v = value as QuestSnapshot, definition = v && quests.find(q => q.id === v.id);
  return !!definition && ["objectives", "return", "complete", "failed"].includes(v.stage) && Array.isArray(v.visited) && new Set(v.visited).size === v.visited.length &&
    v.visited.every(i => Number.isInteger(i) && i >= 0 && i < definition.objectives.length) &&
    (definition.kind === "collect" || v.visited.every((i, index) => i === index)) &&
    (definition.kind === "style" || v.stage !== "objectives" || v.visited.length < definition.objectives.length) &&
    ((v.stage !== "return" && v.stage !== "complete") || (definition.kind === "style" ? v.stylePoints >= 300 : v.visited.length === definition.objectives.length)) &&
    (v.stage !== "failed" || (definition.limit !== null && v.elapsed > definition.limit)) &&
    Number.isFinite(v.stylePoints) && v.stylePoints >= 0 && Number.isFinite(v.elapsed) && v.elapsed >= 0;
}
export type QuestPlayer = QuestPoint & { speed: number; score: number };
export class QuestRun {
  stage: QuestSnapshot["stage"] = "objectives"; visited: number[] = []; stylePoints = 0; elapsed = 0;
  private previousScore: number;
  constructor(readonly definition: QuestDefinition, score: number, restored?: QuestSnapshot) {
    this.previousScore = score;
    if (restored && restored.id === definition.id) { this.stage = restored.stage; this.visited = [...restored.visited]; this.stylePoints = restored.stylePoints; this.elapsed = restored.elapsed; }
  }
  snapshot(): QuestSnapshot { return { id: this.definition.id, stage: this.stage, visited: [...this.visited], stylePoints: this.stylePoints, elapsed: this.elapsed }; }
  syncScore(score: number) { this.previousScore = score; }
  tick(p: QuestPlayer, dt: number) {
    const gained = Math.max(0, p.score - this.previousScore); this.previousScore = p.score;
    if (this.stage === "complete" || this.stage === "failed") return;
    this.elapsed += dt;
    if (this.definition.limit !== null && this.elapsed > this.definition.limit) { this.stage = "failed"; return; }
    if (this.definition.kind === "style" && this.stage === "objectives" && Math.hypot(p.x - this.definition.anchor.x, p.z - this.definition.anchor.z) < 55) {
      this.stylePoints += gained; if (this.stylePoints >= 300) this.stage = "return";
    }
  }
  targets() {
    if (this.stage === "return" || this.stage === "failed") return [this.definition.anchor];
    if (this.stage === "complete") return [];
    if (this.definition.kind === "style") return [this.definition.anchor];
    return this.definition.kind === "collect" ? this.definition.objectives.filter((_, i) => !this.visited.includes(i)) : [this.definition.objectives[this.visited.length]];
  }
  goal(p: QuestPoint) { return [...this.targets()].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0] ?? null; }
  interact(p: QuestPlayer): "slow" | "far" | "waiting" | "collected" | "complete" {
    if (this.stage === "complete" || this.stage === "failed") return "waiting";
    const target = this.goal(p);
    if (!target || Math.hypot(p.x - target.x, p.z - target.z) > 5) return "far";
    if (p.speed > 2.5) return "slow";
    if (this.stage === "return") { this.stage = "complete"; return "complete"; }
    if (this.definition.kind === "style") return "waiting";
    const index = this.definition.objectives.indexOf(target); this.visited.push(index);
    if (this.visited.length === this.definition.objectives.length) this.stage = "return";
    return "collected";
  }
}
export function questXP(completed: string[]) { return quests.filter(q => completed.includes(q.id)).reduce((sum, q) => sum + q.reward, 0); }
