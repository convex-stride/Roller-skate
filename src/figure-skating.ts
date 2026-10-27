import type { FigureAction } from "./input";
export type FigureDefinition = { id: FigureAction; name: string; kind: "spin" | "glide" | "jump"; key: string; points: number; duration: number; turns: number; tip: string };
export const figureMoves: FigureDefinition[] = [
  { id: "upright", name: "Upright spin", kind: "spin", key: "5", points: 240, duration: 3, turns: 3, tip: "Stand tall, draw the free leg in and rotate on one blade." },
  { id: "sit", name: "Sit spin", kind: "spin", key: "6", points: 300, duration: 3.2, turns: 2, tip: "Lower into a deep knee bend with the free leg extended." },
  { id: "camel", name: "Camel spin", kind: "spin", key: "7", points: 340, duration: 3.5, turns: 2, tip: "Lean forward and extend the free leg behind at hip height." },
  { id: "spiral", name: "Spiral", kind: "glide", key: "8", points: 250, duration: 3, turns: 0, tip: "Glide on one blade with the free leg raised behind." },
  { id: "eagle", name: "Spread eagle", kind: "glide", key: "9", points: 220, duration: 3, turns: 0, tip: "Open both feet and arms while travelling sideways." },
  { id: "axel", name: "Single Axel", kind: "jump", key: "0", points: 460, duration: 0, turns: 1.5, tip: "An assisted forward takeoff, one-and-a-half turns, then a backward landing." },
  { id: "salchow", name: "Single Salchow", kind: "jump", key: "L", points: 350, duration: 0, turns: 1, tip: "An assisted backward inside-edge entry and one-turn jump." },
  { id: "toeloop", name: "Single toe loop", kind: "jump", key: "K", points: 330, duration: 0, turns: 1, tip: "A backward entry with a toe-pick preparation and one turn." },
];
export const figureDefinition = (id: FigureAction) => figureMoves.find(m => m.id === id)!;
export type FigureResult = { id: number; action: FigureAction; name: string; points: number; quality: "clean" | "landed" };
export type FigureSample = { x: number; z: number; speed: number; ice: boolean; grounded: boolean; cancel: boolean };

/** Assisted move timing and judging. Translation, gravity and contacts remain in Rapier. */
export class FigureSkating {
  action: FigureAction | null = null;
  pose: FigureAction | null = null;
  phase: "entry" | "performing" | "airborne" | "landing" = "entry";
  elapsed = 0; mix = 0; rotation = 0; sequence = 0; completed = 0;
  lastResult: FigureResult | null = null;
  message = "Choose a figure move on the ice.";
  private poseHold = 0;
  private origin = { x: 0, z: 0 };
  start(id: FigureAction, ice: boolean, grounded: boolean) {
    if (!ice || !grounded) { this.message = "Start figure moves with both blades on the ice."; return false; }
    if (this.action) { this.message = "Finish the current move, or brake to cancel it."; return false; }
    this.action = this.pose = id; this.phase = "entry"; this.elapsed = 0; this.rotation = 0; this.sequence++;
    this.message = `${figureDefinition(id).name} · preparing`; return true;
  }
  cancel(message = "Move cancelled · try again when ready.") {
    this.action = null; this.elapsed = 0; this.rotation = Math.atan2(Math.sin(this.rotation), Math.cos(this.rotation)); this.poseHold = 0; this.message = message;
  }
  reset() { this.cancel(); this.pose = null; this.mix = 0; this.rotation = 0; }
  private award(quality: FigureResult["quality"]) {
    const move = figureDefinition(this.action!);
    this.completed++; this.lastResult = { id: this.completed, action: move.id, name: move.name, points: Math.round(move.points * (quality === "clean" ? 1 : .75)), quality };
    this.message = `${move.name} · ${quality}`; this.phase = move.kind === "jump" ? "landing" : "performing";
    this.poseHold = move.kind === "jump" ? .45 : 0; this.action = null; this.rotation = move.id === "eagle" ? Math.PI / 2 * this.mix : 0;
  }
  land(clean: boolean, rotationError: number, bailed: boolean) {
    if (!this.action || figureDefinition(this.action).kind !== "jump" || this.phase !== "airborne") return;
    if (bailed || rotationError > .45) this.cancel("Under-rotated jump · no figure bonus."); else this.award(clean ? "clean" : "landed");
  }
  step(s: FigureSample, dt: number) {
    const intent = { spinning: false, gliding: false, autoPush: false, jump: false, holdJump: false, backwardEntry: false };
    this.mix += ((this.action || this.poseHold > 0 ? 1 : 0) - this.mix) * (1 - Math.exp(-dt * 9)); this.poseHold = Math.max(0, this.poseHold - dt);
    if (!this.action) { this.rotation = this.pose === "eagle" ? Math.PI / 2 * this.mix : this.rotation * Math.exp(-dt * 12); return intent; }
    if (!s.ice || s.cancel) { this.cancel(); return intent; }
    const move = figureDefinition(this.action); this.elapsed += dt;
    if (move.kind === "spin") {
      intent.spinning = true;
      if (!s.grounded) { this.cancel("Keep the spin on the ice."); return intent; }
      if (this.phase === "entry" && this.elapsed >= .7 && s.speed < .7) { this.phase = "performing"; this.elapsed = 0; this.origin = { x: s.x, z: s.z }; }
      if (this.phase === "entry" && this.elapsed > 3) this.cancel("Slow down before starting a spin.");
      if (this.phase === "performing") {
        const t = Math.min(1, this.elapsed / move.duration); this.rotation = move.turns * Math.PI * 2 * (.5 - .5 * Math.cos(t * Math.PI));
        this.message = `${move.name} · ${Math.round(t * 100)}%`;
        if (Math.hypot(s.x - this.origin.x, s.z - this.origin.z) > 1.3) this.cancel("Spin drifted · try a steadier entry.");
        else if (t >= 1) this.award(s.speed < .5 ? "clean" : "landed");
      }
    } else if (move.kind === "glide") {
      intent.gliding = true; intent.autoPush = this.phase === "entry" && s.speed < 2.4;
      if (!s.grounded) { this.cancel(); return intent; }
      if (this.phase === "entry" && this.elapsed >= .5 && s.speed >= 1.2) { this.phase = "performing"; this.elapsed = 0; }
      if (this.phase === "entry" && this.elapsed > 4) this.cancel("Find a clear run-up for the glide.");
      if (this.phase === "performing") {
        this.message = `${move.name} · hold the edge · ${Math.min(100, Math.round(this.elapsed / move.duration * 100))}%`;
        if (s.speed < .65) this.cancel("Keep gliding to finish the move."); else if (this.elapsed >= move.duration) this.award("clean");
      }
      if (move.id === "eagle") this.rotation = Math.PI / 2 * this.mix;
    } else {
      intent.holdJump = true; intent.autoPush = this.phase === "entry" && s.speed < 2;
      intent.backwardEntry = move.id !== "axel";
      if (this.phase === "entry" && this.elapsed > .7 && s.grounded && s.speed > .8) { intent.jump = true; this.phase = "airborne"; this.elapsed = 0; this.message = `${move.name} · rotate, then land on the blade`; }
      if (this.elapsed > 4) this.cancel("Jump interrupted · try another entry.");
    }
    return intent;
  }
  get view() { return { action: this.action, pose: this.pose, phase: this.phase, mix: this.mix, rotation: this.rotation, sequence: this.sequence, completed: this.completed, lastResult: this.lastResult ? { ...this.lastResult } : null, message: this.message }; }
}

export type FigureView = FigureSkating["view"];
export function figurePose(view: Pick<FigureView, "pose" | "phase" | "mix">) {
  const base = { feet: [{ x: 0.12, y: .25, z: -.05, yaw: 0 }, { x: -0.12, y: .25, z: .05, yaw: 0 }], hands: [{ x: 0.28, y: 1.02, z: .05 }, { x: -0.28, y: 1.02, z: .05 }], pitch: .1, bodyY: .13 };
  if (!view.pose || view.mix < .001) return base;
  let target = { feet: [{ x: 0, y: .25, z: 0, yaw: 0 }, { x: -0.16, y: .58, z: -.12, yaw: 0 }], hands: [{ x: 0.16, y: 1.15, z: .2 }, { x: -0.16, y: 1.15, z: .2 }], pitch: .04, bodyY: .13 };
  if (view.pose === "sit") target = { feet: [{ x: 0, y: .25, z: 0, yaw: 0 }, { x: -0.12, y: .42, z: .74, yaw: 0 }], hands: [{ x: 0.28, y: .82, z: .4 }, { x: -0.28, y: .82, z: .4 }], pitch: .18, bodyY: -.2 };
  if (view.pose === "camel" || view.pose === "spiral") target = { feet: [{ x: 0, y: .25, z: .02, yaw: 0 }, { x: -0.13, y: view.pose === "camel" ? .98 : 1.08, z: -.83, yaw: 0 }], hands: [{ x: 0.62, y: 1.3, z: .15 }, { x: -0.62, y: 1.3, z: .15 }], pitch: view.pose === "camel" ? .7 : .43, bodyY: .05 };
  if (view.pose === "eagle") target = { feet: [{ x: 0.34, y: .25, z: 0, yaw: Math.PI / 2 }, { x: -0.34, y: .25, z: 0, yaw: -Math.PI / 2 }], hands: [{ x: 0.62, y: 1.42, z: 0 }, { x: -0.62, y: 1.42, z: 0 }], pitch: .02, bodyY: .1 };
  if (["axel", "salchow", "toeloop"].includes(view.pose)) {
    target = view.phase === "landing" ? { feet: [{ x: 0, y: .25, z: 0, yaw: 0 }, { x: -0.12, y: .68, z: -.52, yaw: 0 }], hands: [{ x: 0.5, y: 1.12, z: .1 }, { x: -0.5, y: 1.12, z: .1 }], pitch: .17, bodyY: .09 }
      : view.phase === "entry" ? { feet: [{ x: 0.1, y: .25, z: -.1, yaw: 0 }, { x: -0.12, y: view.pose === "toeloop" ? .25 : .45, z: .25, yaw: 0 }], hands: [{ x: 0.4, y: 1, z: -.12 }, { x: -0.4, y: 1, z: -.12 }], pitch: .14, bodyY: -.02 }
      : { feet: [{ x: 0.045, y: .44, z: .05, yaw: 0 }, { x: -0.045, y: .49, z: .08, yaw: 0 }], hands: [{ x: 0.12, y: 1.16, z: .2 }, { x: -0.12, y: 1.16, z: .2 }], pitch: .02, bodyY: .13 };
  }
  const mix = view.mix, lerp = (a: number, b: number) => a + (b - a) * mix;
  return { feet: base.feet.map((f, i) => ({ x: lerp(f.x, target.feet[i].x), y: lerp(f.y, target.feet[i].y), z: lerp(f.z, target.feet[i].z), yaw: lerp(f.yaw, target.feet[i].yaw) })), hands: base.hands.map((h, i) => ({ x: lerp(h.x, target.hands[i].x), y: lerp(h.y, target.hands[i].y), z: lerp(h.z, target.hands[i].z) })), pitch: lerp(base.pitch, target.pitch), bodyY: lerp(base.bodyY, target.bodyY) };
}
