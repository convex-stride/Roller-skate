import { centers, districtSites, type City } from "./world";
import { themeNames, type DistrictSite } from "./district-content";
import type { FlipAction } from "./input";
export type QuestKind = "delivery" | "collect" | "discover" | "style" | "flip";
export type QuestPoint = { x: number; z: number; label?: string; detail?: string };
export type QuestDefinition = { id: string; title: string; city: City; area: string; giver: string; request: string; kind: QuestKind; reward: number; anchor: QuestPoint; objectives: QuestPoint[]; limit: number | null };
export const quests: QuestDefinition[] = [];
const kinds: QuestKind[] = ["delivery", "collect", "discover", "style"];
const legacyCourt = (s: DistrictSite) => !(Math.abs(s.x - centers[s.city]) < 140 + s.size / 2 && Math.abs(s.z) < 210 + s.size / 2);
for (const city of ["gdansk", "riyadh"] as const) {
  const sites: DistrictSite[] = [];
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 8; iz++) sites.push(...districtSites(centers[city] - 700 + ix * 200, -700 + iz * 200, city).filter(legacyCourt));
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
// Keep the original IDs and positions so existing saves remain valid. New jobs
// occupy two other corners of every district, rather than stacking at one board.
for (const original of [...quests]) {
  const city = original.city, parts = original.id.split("-"), ix = Number(parts[2]), iz = Number(parts[3]);
  const cx = centers[city] - 600 + ix * 400, cz = -600 + iz * 400;
  const sites: DistrictSite[] = [];
  for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) sites.push(...districtSites(centers[city] - 700 + x * 200, -700 + z * 200, city).filter(s => legacyCourt(s) && s.size >= 24 && Math.abs(s.x - cx) < 200 && Math.abs(s.z - cz) < 200));
  const used = [original.anchor];
  for (let variant = 0; variant < 2; variant++) {
    const desired = { x: cx + (variant ? 110 : -110), z: cz + (variant ? -110 : 110) };
    const site = sites.filter(s => used.every(p => Math.hypot(s.x - p.x, s.z - p.z) > 65)).sort((a, b) => Math.hypot(a.x - desired.x, a.z - desired.z) - Math.hypot(b.x - desired.x, b.z - desired.z))[0];
    if (!site) throw Error(`Missing additional quest court in ${original.id}`);
    used.push(site);
    const kind = kinds[(kinds.indexOf(original.kind) + variant + 1) % 4];
    const local = sites.filter(s => s.id !== site.id).sort((a, b) => Math.hypot(a.x - site.x, a.z - site.z) - Math.hypot(b.x - site.x, b.z - site.z)).slice(0, 3);
    const giver = (city === "gdansk" ? ["Zofia", "Bartek", "Marta", "Lena", "Kuba", "Ola"] : ["Reem", "Khalid", "Sara", "Amal", "Rakan", "Lina"])[(ix * 4 + iz + variant * 3) % 6];
    const area = themeNames[site.theme];
    const title = kind === "delivery" ? `${site.theme === "festival" ? "Festival setup" : city === "gdansk" ? "Community repair" : "Market breakfast"} run`
      : kind === "collect" ? `${site.theme === "garden" || site.theme === "oasis" ? "Garden volunteers" : "Courtyard crew"}: missing kit`
      : kind === "discover" ? `${city === "gdansk" ? "Baltic backcourts" : "Hidden palm courts"} trail` : `${area}: skate showcase`;
    quests.push({ id: `${original.id}-${variant ? "culture" : "community"}`, title, city, giver, kind, area: `${area} · ${original.area.split(" · ")[1]}`,
      request: `${giver}: Layan, ${kind === "delivery" ? "help get three orders to our neighbours, then return here. You have three minutes." : kind === "collect" ? "our crew left three crates around these courts. Find them in any order, then bring them back." : kind === "discover" ? "let’s map our favourite hidden courts. Inspect three places and bring your notes back." : "show the neighbours your skating! Bank 300 points nearby, then come back to me."}`,
      reward: kind === "delivery" ? 200 : kind === "style" ? 180 : 160, anchor: { x: site.x, z: site.z }, limit: kind === "delivery" ? 180 : null,
      objectives: kind === "style" ? [] : local.map((s, n) => ({ x: s.x, z: s.z, label: kind === "discover" ? themeNames[s.theme] : kind === "delivery" ? `Neighbourhood order ${n + 1}` : ["Tools and spare wheels", "Lanterns and art supplies", "Community event kit"][n], detail: kind === "discover" ? `Field note: ${themeNames[s.theme].toLowerCase()} — ${city === "gdansk" ? "Baltic brick, green planting and local skating" : "warm stone, shaded stops and local gathering places"}.` : undefined })) });
  }
}
for (const city of ["gdansk", "riyadh"] as const) {
  const courts: DistrictSite[] = [];
  for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) courts.push(...districtSites(centers[city] - 700 + x * 200, -700 + z * 200, city).filter(s => s.props.some(p => p.kind === "bank")));
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) {
    const cx = centers[city] - 600 + x * 400, cz = -600 + z * 400;
    const desired = { x: cx + (x === 1 ? 100 : x === 2 ? -100 : 0), z: cz + (z === 1 ? 70 : z === 2 ? -70 : 0) };
    const site = courts.filter(s => Math.abs(s.x - cx) < 200 && Math.abs(s.z - cz) < 200 && quests.every(q => Math.hypot(q.anchor.x - s.x, q.anchor.z - s.z) > 25)).sort((a, b) => Math.hypot(a.x - desired.x, a.z - desired.z) - Math.hypot(b.x - desired.x, b.z - desired.z))[0];
    if (!site) throw Error(`Missing flip court ${city}/${x}/${z}`);
    const giver = city === "gdansk" ? ["Ada", "Filip", "Ewa", "Leon"][(x + z) % 4] : ["Maha", "Zaid", "Joud", "Saad"][(x + z) % 4];
    quests.push({ id: `quest-flip-${city}-${x}-${z}`, city, title: city === "gdansk" ? "Baltic flip showcase" : "Desert airtime showcase", area: `${themeNames[site.theme]} · AIRTIME COURT`, giver, kind: "flip", reward: 240, anchor: { x: site.x, z: site.z }, objectives: [], limit: null,
      request: `${giver}: Layan, land two different flip styles in this court, then return to me. Tap 1–4 (or Backflip / More on phone). Use the bank and hold Jump for extra height. Add spins and grabs for bigger combos!` });
  }
}
export type QuestSnapshot = { id: string; stage: "objectives" | "return" | "complete" | "failed"; visited: number[]; stylePoints: number; elapsed: number; flipTypes?: FlipAction[] };
export function validQuestSnapshot(value: unknown): value is QuestSnapshot {
  const v = value as QuestSnapshot, definition = v && quests.find(q => q.id === v.id);
  return !!definition && ["objectives", "return", "complete", "failed"].includes(v.stage) && Array.isArray(v.visited) && new Set(v.visited).size === v.visited.length &&
    v.visited.every(i => Number.isInteger(i) && i >= 0 && i < definition.objectives.length) &&
    (definition.kind === "collect" || v.visited.every((i, index) => i === index)) &&
    (definition.kind === "style" || definition.kind === "flip" || v.stage !== "objectives" || v.visited.length < definition.objectives.length) &&
    (v.flipTypes === undefined || (Array.isArray(v.flipTypes) && new Set(v.flipTypes).size === v.flipTypes.length && v.flipTypes.every(f => ["frontflip", "backflip", "leftflip", "rightflip"].includes(f)))) &&
    ((v.stage !== "return" && v.stage !== "complete") || (definition.kind === "style" ? v.stylePoints >= 300 : definition.kind === "flip" ? (v.flipTypes?.length ?? 0) >= 2 : v.visited.length === definition.objectives.length)) &&
    (v.stage !== "failed" || (definition.limit !== null && v.elapsed > definition.limit)) &&
    Number.isFinite(v.stylePoints) && v.stylePoints >= 0 && Number.isFinite(v.elapsed) && v.elapsed >= 0;
}
export type QuestPlayer = QuestPoint & { speed: number; score: number; flipId?: number; flipKind?: FlipAction | null };
export class QuestRun {
  stage: QuestSnapshot["stage"] = "objectives"; visited: number[] = []; stylePoints = 0; elapsed = 0;
  private previousScore: number;
  flipTypes: FlipAction[] = [];
  private previousFlip = 0;
  constructor(readonly definition: QuestDefinition, score: number, restored?: QuestSnapshot) {
    this.previousScore = score;
    if (restored && restored.id === definition.id) { this.stage = restored.stage; this.visited = [...restored.visited]; this.stylePoints = restored.stylePoints; this.elapsed = restored.elapsed; this.flipTypes = [...(restored.flipTypes ?? [])]; }
  }
  snapshot(): QuestSnapshot { return { id: this.definition.id, stage: this.stage, visited: [...this.visited], stylePoints: this.stylePoints, elapsed: this.elapsed, flipTypes: [...this.flipTypes] }; }
  syncFlip(id: number) { this.previousFlip = id; }
  syncScore(score: number, flipId?: number) { this.previousScore = score; if (flipId !== undefined) this.previousFlip = flipId; }
  tick(p: QuestPlayer, dt: number) {
    const gained = Math.max(0, p.score - this.previousScore); this.previousScore = p.score;
    const freshFlip = (p.flipId ?? 0) > this.previousFlip; this.previousFlip = p.flipId ?? 0;
    if (this.stage === "complete" || this.stage === "failed") return;
    this.elapsed += dt;
    if (this.definition.limit !== null && this.elapsed > this.definition.limit) { this.stage = "failed"; return; }
    if (this.definition.kind === "style" && this.stage === "objectives" && Math.hypot(p.x - this.definition.anchor.x, p.z - this.definition.anchor.z) < 55) {
      this.stylePoints += gained; if (this.stylePoints >= 300) this.stage = "return";
    }
    if (this.definition.kind === "flip" && this.stage === "objectives" && Math.hypot(p.x - this.definition.anchor.x, p.z - this.definition.anchor.z) < 55 && freshFlip && p.flipKind) {
      if (!this.flipTypes.includes(p.flipKind)) this.flipTypes.push(p.flipKind);
      if (this.flipTypes.length >= 2) this.stage = "return";
    }
  }
  targets() {
    if (this.stage === "return" || this.stage === "failed") return [this.definition.anchor];
    if (this.stage === "complete") return [];
    if (this.definition.kind === "style" || this.definition.kind === "flip") return [this.definition.anchor];
    return this.definition.kind === "collect" ? this.definition.objectives.filter((_, i) => !this.visited.includes(i)) : [this.definition.objectives[this.visited.length]];
  }
  goal(p: QuestPoint) { return [...this.targets()].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0] ?? null; }
  interact(p: QuestPlayer): "slow" | "far" | "waiting" | "collected" | "complete" {
    if (this.stage === "complete" || this.stage === "failed") return "waiting";
    const target = this.goal(p);
    if (!target || Math.hypot(p.x - target.x, p.z - target.z) > 5) return "far";
    if (p.speed > 2.5) return "slow";
    if (this.stage === "return") { this.stage = "complete"; return "complete"; }
    if (this.definition.kind === "style" || this.definition.kind === "flip") return "waiting";
    const index = this.definition.objectives.indexOf(target); this.visited.push(index);
    if (this.visited.length === this.definition.objectives.length) this.stage = "return";
    return "collected";
  }
}
export function questXP(completed: string[]) { return quests.filter(q => completed.includes(q.id)).reduce((sum, q) => sum + q.reward, 0); }
