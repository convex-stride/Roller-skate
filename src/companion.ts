import { RAPIER, Skater, idle, STEP } from "./physics";
import { clearGround } from "./world";
import { findRoute, type Goal, type Point } from "./navigation";
import type { CrowdPerson } from "./crowd";
import { iceAt } from "./ice-rinks";

export type PartnerMode = "follow" | "guide" | "wait" | "cheer" | "tricks" | "pairs";
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export class Companion {
  skater: Skater | null = null;
  mode: PartnerMode = "follow";
  message = "Call me whenever you want company, Layan.";
  route: Point[] = [];
  private routeIndex = 0;
  private plannedGoal: Point | null = null;
  private planClock = 0;
  private trickClock = 0;
  private lastJumps = 0;
  private lastScore = 0;
  private celebration = 0;
  private pausedForRace = false;
  constructor(readonly world: RAPIER.World, readonly player: Skater) {}
  get active() { return this.skater !== null; }
  private spawn() {
    const p = this.player.body.translation();
    for (const radius of [3, 5, 8, 12, 18]) for (let n = 0; n < 12; n++) {
      const angle = this.player.heading + Math.PI / 2 + n * Math.PI / 6;
      const x = p.x + Math.sin(angle) * radius, z = p.z + Math.cos(angle) * radius;
      if (!clearGround(x, z, 0.8)) continue;
      const hit = this.world.castRay(new RAPIER.Ray({ x, y: p.y + 3, z }, { x: 0, y: -1, z: 0 }), 25, true, undefined, undefined, undefined, this.player.body, collider => !this.skater || collider.parent()?.handle !== this.skater.body.handle);
      if (!hit || p.y + 3 - hit.timeOfImpact > p.y + 1) continue;
      this.dismiss(); this.skater = new Skater(this.world, x, z);
      this.skater.body.setTranslation({ x, y: p.y + 3 - hit.timeOfImpact + 0.88, z }, true);
      this.skater.heading = this.player.heading; this.lastJumps = this.player.jumpCount; this.lastScore = this.player.banked;
      this.planClock = 0; this.plannedGoal = null; this.route = []; return true;
    }
    return false;
  }
  call() {
    if (!this.spawn()) { this.message = "I need a little clear ground to meet you. Try the path nearby."; return false; }
    this.mode = "follow"; this.message = "I’m here, Layan. Lead the way — I’ll stay with you."; return true;
  }
  command(mode: PartnerMode, goal: Goal | null = null) {
    const p = this.player.body.translation();
    if (mode === "pairs" && !iceAt(p.x, p.z)) { this.message = "Meet me on an ice rink, Layan, and we can skate side by side."; return; }
    if (!this.active && !this.call()) return;
    if (mode === "guide" && !goal) { this.message = "Choose a place or a quest on the map, then ask me to lead."; return; }
    this.mode = mode; this.plannedGoal = null; this.planClock = 0; this.route = [];
    this.message = mode === "pairs" ? "Let’s share the ice, Layan. I’ll skate beside you and join your jumps." : mode === "guide" ? `Let’s go to ${goal!.label}. I’ll wait if you fall behind.` : mode === "wait" ? "I’ll wait right here. Call me when you’re ready." : mode === "cheer" ? "Show me your best line, Layan!" : mode === "tricks" ? "Let’s practise! Jump and I’ll join in." : "I’m with you. We can skate at your pace.";
  }
  dismiss() { if (this.skater) this.world.removeRigidBody(this.skater.body); this.skater = null; this.route = []; this.pausedForRace = false; }
  tick(goal: Goal | null, racing = false) {
    if (!this.skater) return;
    // During a duet the race session renders and simulates Taqee on its grid.
    if (racing) { this.skater.body.setEnabled(false); this.pausedForRace = true; return; }
    if (this.pausedForRace) { const mode = this.mode; this.call(); this.mode = mode; if (!this.skater) return; }
    if (this.mode === "guide" && !goal) { this.mode = "follow"; this.message = "I’ll follow you until you choose another stop, Layan."; }
    let s = this.skater, p = s.body.translation(), player = this.player.body.translation();
    if (this.mode === "pairs" && !iceAt(player.x, player.z)) { this.mode = "follow"; this.message = "That was fun. I’ll follow you through the mall, Layan."; }
    if (distance(p, player) > 85 && this.mode !== "wait") { const mode = this.mode; if (!this.spawn()) return; this.mode = mode; s = this.skater!; p = s.body.translation(); }
    this.planClock -= STEP; this.trickClock -= STEP; this.celebration = Math.max(0, this.celebration - STEP);
    if (this.player.banked > this.lastScore + 100) { this.celebration = 3; this.message = "That was a great landing, Layan!"; }
    this.lastScore = this.player.banked;
    const c = idle();
    const stationary = this.mode === "wait" || this.mode === "cheer" || (this.mode === "tricks" && this.player.speed < 1);
    let target: Point = { x: player.x - Math.sin(this.player.heading) * 3 + Math.cos(this.player.heading) * 2, z: player.z - Math.cos(this.player.heading) * 3 - Math.sin(this.player.heading) * 2 };
    if (this.mode === "pairs") target = { x: player.x + Math.cos(this.player.heading) * 2, z: player.z - Math.sin(this.player.heading) * 2 };
    if (!clearGround(target.x, target.z, 0.8)) target = player;
    const guiding = this.mode === "guide" && !!goal;
    if (guiding) target = goal;
    const goalChanged = !this.plannedGoal || distance(target, this.plannedGoal) > (guiding ? 1 : this.mode === "pairs" ? 2 : 12);
    if (!stationary && ((guiding && goalChanged) || (this.planClock <= 0 && (goalChanged || !this.route.length || this.mode === "pairs")))) {
      if (guiding && goalChanged) this.message = `Next stop: ${goal.label}. Follow my blue marker, Layan.`;
      const steps = Math.ceil(distance(p, target) / .75);
      const directIce = this.mode === "pairs" && iceAt(p.x, p.z) && iceAt(target.x, target.z) && Array.from({ length: steps + 1 }, (_, n) => clearGround(p.x + (target.x - p.x) * n / Math.max(1, steps), p.z + (target.z - p.z) * n / Math.max(1, steps), .8)).every(Boolean);
      this.route = directIce ? [{ x: p.x, z: p.z }, { ...target }] : findRoute(p, target); this.routeIndex = 1; this.plannedGoal = { ...target }; this.planClock = guiding ? 4 : this.mode === "pairs" ? .35 : 1.5;
    }
    while (this.routeIndex < this.route.length - 1 && distance(p, this.route[this.routeIndex]) < 2.5) this.routeIndex++;
    const next = this.route[this.routeIndex] ?? target, remaining = distance(p, target);
    const desired = Math.atan2(next.x - p.x, next.z - p.z), error = Math.atan2(Math.sin(desired - s.heading), Math.cos(desired - s.heading));
    c.steer = Math.max(-1, Math.min(1, error * 3));
    const waitingForLayan = guiding && distance(p, player) > 16;
    const stopped = stationary || waitingForLayan || remaining < (guiding ? 3.5 : this.mode === "pairs" ? .7 : 1.8);
    const limit = guiding ? 5.5 : Math.min(12, Math.max(2, this.player.speed + 1.5));
    if (stopped || (Math.abs(error) > 0.45 && s.speed > 1) || s.speed > limit) c.brake = 1;
    else if (Math.abs(error) < 0.65) c.throttle = Math.min(1, remaining / 5);
    if (stationary) c.steer = Math.max(-1, Math.min(1, Math.atan2(Math.sin(Math.atan2(player.x - p.x, player.z - p.z) - s.heading), Math.cos(Math.atan2(player.x - p.x, player.z - p.z) - s.heading)) * 2));
    const ahead = this.world.castRay(new RAPIER.Ray({ x: p.x, y: p.y, z: p.z }, { x: Math.sin(s.heading), y: 0, z: Math.cos(s.heading) }), 0.7 + s.speed * 0.2, true, undefined, undefined, s.collider, s.body);
    if (ahead && ahead.collider.parent()?.handle !== this.player.body.handle) { c.brake = 1; c.throttle = 0; this.planClock = 0; this.plannedGoal = null; }
    const newJump = this.player.jumpCount > this.lastJumps; this.lastJumps = this.player.jumpCount;
    if (s.grounded && ((newJump && distance(p, player) < 18 && this.mode !== "wait") || (this.mode === "tricks" && this.trickClock <= 0))) {
      c.jumpPressed = true; c.jump = true; c.tricks = ["left", "grab"]; this.trickClock = 5;
      if (this.player.flipKind) c.tricks.push(this.player.flipKind);
      else if (this.mode === "tricks") c.tricks.push("backflip");
    }
    if (!s.grounded && !s.flipKind && this.player.flipKind && distance(p, player) < 18) c.tricks.push(this.player.flipKind);
    s.tick(c, []);
    if (guiding && remaining < 4 && distance(player, target) < 9) this.message = `We’re here, Layan — ${goal.label}.`;
    else if (waitingForLayan) this.message = "I’m just ahead. Follow my blue marker; I’ll wait for you.";
  }
  visual(time: number): CrowdPerson | null {
    if (!this.skater || this.pausedForRace) return null;
    const s = this.skater, p = s.body.translation(), player = this.player.body.translation();
    return { id: 21001, name: "Taqee", role: "skater", x: p.x, z: p.z, ground: p.y - 0.83, heading: s.heading, speed: s.speed, phase: s.pushPhase + time * 0.5, age: time, action: this.mode === "cheer" || this.celebration > 0 ? "cheer" : s.speed > 0.4 ? "push" : "talk", route: [], next: 0, wait: 0, reaction: this.celebration, distance: distance(p, player), following: true, stuck: 0, traveled: 0, airRotation: s.airRotation + s.landingYawOffset, airPitch: s.airPitch + s.landingPitchOffset, airRoll: s.airRoll + s.landingRollOffset, grabbing: !s.grounded && !!s.grabPose, crouching: !s.grounded };
  }
  get state() { const s = this.skater; return { active: this.active, mode: this.mode, message: this.message, position: s ? { ...s.body.translation() } : null, speed: s?.speed ?? 0, surface: s?.surface ?? null, jumps: s?.jumpCount ?? 0, routePoints: this.route.length, racing: this.pausedForRace }; }
}
