import { iceRinks, type IceRink } from "./ice-rinks";
import { figureDefinition, type FigureResult } from "./figure-skating";
import type { FigureAction } from "./input";
export type IceGameMode = "spotlight" | "slalom" | "duet";
export const iceGameModes = [
  { id: "spotlight" as const, name: "Spotlight routine", detail: "Complete four figure elements in order. Win a medal for a clean, varied program." },
  { id: "slalom" as const, name: "Neon ribbon run", detail: "Carve through eight glowing gates and leave a neon trail across the ice." },
  { id: "duet" as const, name: "Taqee mirror duet", detail: "Perform matching elements together. Both skaters must finish each move." },
];
export type IceMedal = "gold" | "silver" | "bronze";
export type IceRecord = { score: number; seconds: number; medal: IceMedal };
export type IceRecords = Record<string, IceRecord>;
export const iceRecordKey = (rink: IceRink, mode: IceGameMode) => `${rink.id}:${mode}`;
export function validIceRecords(value: unknown): value is IceRecords {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.entries(value).every(([key, r]) =>
    iceRinks.some(venue => iceGameModes.some(mode => iceRecordKey(venue, mode.id) === key)) && r && typeof r === "object" && Number.isFinite(r.score) && r.score >= 0 && Number.isFinite(r.seconds) && r.seconds > 0 && r.seconds <= 65 && ["gold", "silver", "bronze"].includes(r.medal));
}
export type IceGameSample = { x: number; z: number; onIce: boolean; grounded: boolean; figure: FigureResult | null; partner: { generation?: number; active: boolean; x: number; z: number; figure: FigureResult | null } | null };
export class IceGame {
  status: "playing" | "won" | "failed" = "playing";
  elapsed = 0; stage = 0; score = 0; medal: IceMedal | null = null;
  message = "";
  readonly sequence: FigureAction[];
  readonly gates: { x: number; z: number }[];
  private partnerGeneration = -1;
  private seenPlayer: number; private seenPartner: number;
  private playerMatch: number | null = null; private partnerMatch: number | null = null;
  constructor(readonly rink: IceRink, readonly mode: IceGameMode, initialPlayer = 0, initialPartner = 0) {
    this.seenPlayer = initialPlayer; this.seenPartner = initialPartner;
    const variants: FigureAction[][] = [["upright", "spiral", "axel", "camel"], ["sit", "eagle", "salchow", "upright"], ["camel", "spiral", "toeloop", "sit"]];
    this.sequence = mode === "duet" ? ["upright", "toeloop", "spiral"] : variants[iceRinks.findIndex(r => r.id === rink.id) % variants.length];
    this.gates = Array.from({ length: 8 }, (_, i) => { const a = (i + 1) * Math.PI / 4; return { x: rink.x + Math.sin(a) * 9, z: rink.z - Math.cos(a) * 18 }; });
  }
  get total() { return this.mode === "slalom" ? this.gates.length : this.sequence.length; }
  get targetMove() { return this.status === "playing" && this.mode !== "slalom" ? this.sequence[this.stage] ?? null : null; }
  get goal() { const p = this.status === "playing" && this.mode === "slalom" ? this.gates[this.stage] : null; return p ? { ...p, label: `NEON GATE ${this.stage + 1} / 8` } : null; }
  get title() { return iceGameModes.find(m => m.id === this.mode)!.name; }
  get limit() { return this.mode === "slalom" ? 60 : 65; }
  private advance(points: number) {
    this.score += points; this.stage++; this.playerMatch = this.partnerMatch = null;
    if (this.stage === this.total) {
      this.status = "won";
      const quick = this.mode === "slalom" ? 40 : this.mode === "duet" ? 32 : 40;
      this.medal = this.elapsed <= quick ? "gold" : this.elapsed <= quick + 15 ? "silver" : "bronze";
      this.score += this.medal === "gold" ? 300 : this.medal === "silver" ? 200 : 100;
      this.message = `${this.medal.toUpperCase()} · ${this.title} complete!`;
    }
  }
  tick(s: IceGameSample, dt: number) {
    if (this.status !== "playing") return;
    this.elapsed += dt;
    if (!s.onIce) { this.status = "failed"; this.message = "You left the ice. Restart whenever you’re ready."; return; }
    if (this.elapsed > this.limit) { this.status = "failed"; this.message = "Time’s up. Try a smoother line and a quicker entry."; return; }
    if (this.mode === "slalom") {
      const gate = this.gates[this.stage];
      if (s.grounded && Math.hypot(s.x - gate.x, s.z - gate.z) < 2.8) this.advance(100);
      return;
    }
    const target = this.targetMove!;
    if (s.figure && s.figure.id > this.seenPlayer) {
      this.seenPlayer = s.figure.id;
      if (s.figure.action === target) {
        if (this.mode === "spotlight") { this.advance(s.figure.points + (s.figure.quality === "clean" ? 70 : 0)); return; }
        this.playerMatch = this.elapsed;
      }
    }
    if (this.mode === "duet") {
      if (!s.partner?.active) { this.message = "Call Taqee back to finish your duet."; return; }
      if (s.partner.generation !== undefined && s.partner.generation !== this.partnerGeneration) { this.partnerGeneration = s.partner.generation; this.seenPartner = 0; this.partnerMatch = null; }
      if (s.partner.figure && s.partner.figure.id > this.seenPartner) {
        this.seenPartner = s.partner.figure.id;
        if (s.partner.figure.action === target) this.partnerMatch = this.elapsed;
      }
      if (this.playerMatch !== null && this.partnerMatch !== null) {
        if (Math.abs(this.playerMatch - this.partnerMatch) <= 2.5 && Math.hypot(s.x - s.partner.x, s.z - s.partner.z) < 12) { this.advance(figureDefinition(target).points + 150); if (this.stage < this.total) this.message = "Together! Next element."; }
        else { this.playerMatch = this.partnerMatch = null; this.message = "Try that element together again — stay a little closer."; }
      }
    }
  }
  get view() { return { mode: this.mode, rink: this.rink.id, status: this.status, elapsed: this.elapsed, limit: this.limit, stage: this.stage, total: this.total, score: this.score, medal: this.medal, targetMove: this.targetMove, goal: this.goal, message: this.message, title: this.title }; }
}

export function recordIceWin(records: IceRecords, game: IceGame): IceRecords {
  if (game.status !== "won" || !game.medal) return records;
  const key = iceRecordKey(game.rink, game.mode), old = records[key];
  const rank = { bronze: 0, silver: 1, gold: 2 };
  return { ...records, [key]: { score: Math.max(old?.score ?? 0, game.score), seconds: Math.min(old?.seconds ?? Infinity, Math.max(.01, game.elapsed)), medal: old && rank[old.medal] > rank[game.medal] ? old.medal : game.medal } };
}
