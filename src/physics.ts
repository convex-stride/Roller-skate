import RAPIER from "@dimforge/rapier3d-compat";
import { surfaceAt } from "./city-profile";
import { isFlip, type FlipAction, type TrickAction } from "./input";
export { RAPIER };
export const STEP = 1 / 60;
export type Controls = {
  throttle: number;
  steer: number;
  brake: number;
  crouch: boolean;
  jump: boolean;
  jumpPressed: boolean;
  jumpRelease: boolean;
  tricks: TrickAction[];
  slide: boolean;
  grind: boolean;
  manual: boolean;
  spin: number;
  grab: boolean;
};
export const idle = (): Controls => ({
  throttle: 0,
  steer: 0,
  brake: 0,
  crouch: false,
  jump: false,
  jumpPressed: false,
  jumpRelease: false,
  tricks: [],
  slide: false,
  grind: false,
  manual: false,
  spin: 0,
  grab: false,
});
export type Rail = {
  x: number;
  z: number;
  length: number;
  y: number;
  axis: "x" | "z";
};
export class Skater {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  heading = 0;
  grounded = false;
  normal = { x: 0, y: 1, z: 0 };
  charge = 0;
  jumpCount = 0;
  airRotation = 0;
  airPitch = 0;
  airRoll = 0;
  landingPitchOffset = 0;
  landingRollOffset = 0;
  flipKind: FlipAction | null = null;
  flipLandings = 0;
  lastLandedFlip: FlipAction | null = null;
  lastLandingQuality: "perfect" | "landed" | "rough" | "bail" | null = null;
  private flipTarget = 0;
  lastTrick = "";
  combo = 0;
  banked = 0;
  multiplier = 1;
  comboTimer = 0;
  grinding: Rail | null = null;
  grindingDistance = 0;
  manualDistance = 0;
  railCooldown = 0;
  coyote = 0;
  jumpCooldown = 0;
  airborneTime = 0;
  grabPerformed = false;
  switchStance = false;
  lastImpact = 0;
  pushPhase = 0;
  pushStrength = 0;
  angularVelocity = 0;
  leanAngle = 0;
  landingCompression = 0;
  spinVelocity = 0;
  bailTimer = 0;
  brakePressure = 0;
  landingYawOffset = 0;
  surface = "ASPHALT";
  manualActive = false;
  slideAmount = 0;
  grabPose: "grab" | "tweak" | "star" | "stale" | null = null;
  grindStyle: "Soul grind" | "Royale grind" = "Soul grind";
  liveTrick = "";
  private manualNeedsRelease = false;
  private manualTime = 0;
  private jumpBuffer = 0;
  private spinTarget = 0;
  private grabTimer = 0;
  private jumpAge = 1;
  private queuedTricks: TrickAction[] = [];
  world: RAPIER.World;
  constructor(world: RAPIER.World, x = -1000, z = 0) {
    this.world = world;
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, 1.05, z)
        .lockRotations()
        .setCcdEnabled(true)
        .setLinearDamping(0),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(0.55, 0.28)
        .setMass(75)
        .setFriction(0)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
        .setRestitution(0),
      this.body,
    );
  }
  get speed() {
    const v = this.body.linvel();
    return Math.hypot(v.x, v.z);
  }
  get grabbing() { return this.grabTimer > 0 && !this.grounded; }
  reset(x: number, z: number) {
    this.body.setTranslation({ x, y: 1.1, z }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.grinding = null;
    this.grindingDistance = 0;
    this.railCooldown = 0;
    this.grabPerformed = false;
    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.airRotation = 0;
    this.airPitch = this.airRoll = this.landingPitchOffset = this.landingRollOffset = 0;
    this.flipKind = null; this.flipTarget = 0;
    this.airborneTime = 0;
    this.charge = 0;
    this.jumpCooldown = 0.2;
    this.switchStance = false;
    this.spinVelocity = 0;
    this.spinTarget = 0;
    this.grabTimer = 0;
    this.grabPose = null;
    this.liveTrick = "";
    this.queuedTricks = [];
    this.jumpAge = 1;
    this.slideAmount = 0;
    this.angularVelocity = 0;
    this.leanAngle = 0;
    this.landingCompression = 0;
    this.bailTimer = 0;
    this.jumpBuffer = 0;
    this.lastImpact = 0;
    this.manualDistance = 0;
    this.grounded=false;this.normal={x:0,y:1,z:0};this.coyote=0;
    this.brakePressure = 0;
    this.landingYawOffset = 0;
    this.manualActive = false;
    this.manualNeedsRelease = false;
    this.manualTime = 0;
    this.lastTrick = "Back on your wheels";
  }
  addTrick(name: string, points: number) {
    this.combo += points;
    this.multiplier = Math.min(5, this.multiplier + 0.25);
    this.lastTrick = name;
    this.comboTimer = 2;
  }
  get poseName() {
    return this.grabPose === "tweak" ? "Mute tweak" : this.grabPose === "star" ? "Spread eagle" : this.grabPose === "stale" ? "Stalefish grab" : "Safety grab";
  }
  bank() {
    const earned = Math.round(this.combo * this.multiplier);
    this.banked += earned;
    this.combo = 0;
    this.multiplier = 1;
    return earned;
  }
  tick(c: Controls, rails: Rail[], dt = STEP) {
    const p = this.body.translation();
    let v = this.body.linvel();
    const surface = surfaceAt(p.x, p.z);
    this.surface = surface.name;
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.bailTimer = Math.max(0, this.bailTimer - dt);
    this.landingCompression *= Math.exp(-dt * 7);
    this.landingYawOffset *= Math.exp(-dt * 9);
    this.landingPitchOffset *= Math.exp(-dt * 12); this.landingRollOffset *= Math.exp(-dt * 12);
    this.brakePressure +=
      (c.brake - this.brakePressure) * (1 - Math.exp(-dt * 9));
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.jumpAge += dt;
    if (c.jumpPressed) this.jumpBuffer = 0.18;
    if (c.tricks.some(isFlip) && this.grounded && this.bailTimer === 0) this.jumpBuffer = 0.18;
    if (c.tricks.length && !this.grinding && (!this.grounded || this.jumpBuffer > 0))
      this.queuedTricks.push(...c.tricks);
    // Short taps make a low hop; a held jump retains the full ballistic arc.
    if ((c.jumpRelease || !c.jump) && this.jumpAge < 0.18 && v.y > 3.8) {
      this.body.setLinvel({ ...v, y: 3.8 }, true);
      v = this.body.linvel();
    }
    this.railCooldown = Math.max(0, this.railCooldown - dt);
    const contacts = [];
    for (const offset of [0, -0.13, 0.13]) {
      const hit = this.world.castRayAndGetNormal(
        new RAPIER.Ray(
          {
            x: p.x + Math.cos(this.heading) * offset,
            y: p.y,
            z: p.z - Math.sin(this.heading) * offset,
          },
          { x: 0, y: -1, z: 0 },
        ),
        1.05,
        true,
        undefined,
        undefined,
        this.collider,
        this.body,
      );
      if (hit && hit.normal.y > 0.65 && hit.timeOfImpact < 0.94)
        contacts.push(hit);
    }
    const hit = contacts.sort((a, b) => a.timeOfImpact - b.timeOfImpact)[0];
    // Catch the descending skate path before a thin rail can be mistaken for
    // ordinary ground. E widens the assist, but is never required to stay on.
    if (!this.grinding && this.railCooldown === 0 && c.brake < 0.5 && v.y <= 0.25 && v.y > -9) {
      for (const r of rails) {
        const side = r.axis === "x" ? p.z - r.z : p.x - r.x;
        const along = r.axis === "x" ? p.x - r.x : p.z - r.z;
        const alongSpeed = r.axis === "x" ? v.x : v.z;
        const alignment = Math.abs(alongSpeed) / Math.max(0.01, this.speed);
        const feet = p.y - 0.83;
        const reach = Math.max(0.12, -v.y * dt + 0.04);
        if (Math.abs(side) < (c.grind ? 0.65 : 0.42) &&
            Math.abs(along) < r.length / 2 - 0.15 &&
            feet >= r.y - 0.18 && feet <= r.y + reach &&
            Math.abs(alongSpeed) > 1.2 && alignment > 0.78) {
          this.grinding = r;
          this.grindingDistance = 0;
          this.grindStyle = c.tricks.includes("tweak") ? "Royale grind" : "Soul grind";
          this.normal = { x: 0, y: 1, z: 0 };
          break;
        }
      }
    }
    this.grounded =
      !!hit &&
      hit.normal.y > 0.65 &&
      hit.timeOfImpact < 0.91 &&
      v.y < 3.5 &&
      this.jumpCooldown === 0 &&
      !this.grinding;
    if (hit) {
      const n = contacts.reduce(
          (n, h) => ({
            x: n.x + h.normal.x,
            y: n.y + h.normal.y,
            z: n.z + h.normal.z,
          }),
          { x: 0, y: 0, z: 0 },
        ),
        len = Math.hypot(n.x, n.y, n.z);
      const blend = 1 - Math.exp(-dt * 18);
      this.normal = {
        x: this.normal.x + (n.x / len - this.normal.x) * blend,
        y: this.normal.y + (n.y / len - this.normal.y) * blend,
        z: this.normal.z + (n.z / len - this.normal.z) * blend,
      };
    }
    this.coyote = this.grounded ? 0.1 : Math.max(0, this.coyote - dt);
    if ((this.grounded || this.grinding) && this.airborneTime > 0.13) {
      const turns = Math.round(Math.abs(this.airRotation) / Math.PI);
      const alignmentError = Math.abs(
        this.airRotation - Math.round(this.airRotation / Math.PI) * Math.PI,
      );
      const flipAngle = this.flipKind === "frontflip" || this.flipKind === "backflip" ? this.airPitch : this.airRoll;
      const flips = Math.round(Math.abs(flipAngle) / (Math.PI * 2));
      const flipResidual = flipAngle - Math.round(flipAngle / (Math.PI * 2)) * Math.PI * 2;
      const flipError = Math.abs(flipResidual);
      const landedNames: string[] = [];
      this.landingCompression = Math.min(1, Math.abs(this.lastImpact) / 9);
      this.landingYawOffset =
        this.airRotation - Math.round(this.airRotation / Math.PI) * Math.PI;
      if (this.lastImpact < -11 || alignmentError > 1.1 || flipError > 0.9) {
        this.grinding = null;
        this.railCooldown = 0.5;
        this.combo = 0;
        this.multiplier = 1;
        this.lastTrick = "Bail · regain your balance";
        this.lastLandingQuality = "bail";
        this.bailTimer = 0.85;
        this.body.setLinvel({ x: v.x * 0.45, y: v.y, z: v.z * 0.45 }, true);
      } else {
        this.lastLandingQuality = alignmentError > 0.4 || flipError > 0.35 ? "rough" : "landed";
        this.landingPitchOffset = this.flipKind === "frontflip" || this.flipKind === "backflip" ? flipResidual : 0;
        this.landingRollOffset = this.flipKind === "leftflip" || this.flipKind === "rightflip" ? flipResidual : 0;
        if (alignmentError > 0.4 || flipError > 0.35) {
          this.body.setLinvel({ x: v.x * 0.78, y: v.y, z: v.z * 0.78 }, true);
          this.lastTrick = "Rough landing";
        }
        if (turns) {
          this.addTrick(`${turns * 180}° spin`, turns * 180);
          landedNames.push(`${turns * 180}° spin`);
          if (turns % 2) this.switchStance = !this.switchStance;
        }
        if (flips && this.flipKind) {
          const name = `${flips > 1 ? "Double " : ""}${this.flipKind === "frontflip" ? "frontflip" : this.flipKind === "backflip" ? "backflip" : this.flipKind === "leftflip" ? "left side flip" : "right side flip"}`;
          this.addTrick(name, flips * 450); landedNames.push(name);
          this.flipLandings++; this.lastLandedFlip = this.flipKind;
          if (alignmentError < 0.18 && flipError < 0.18 && this.lastImpact > -9) { this.addTrick("Perfect landing", 75); this.lastLandingQuality = "perfect"; }
        }
        if (this.grabPerformed) { this.addTrick(this.poseName, 180); landedNames.push(this.poseName); }
        if (flips) this.lastTrick = `${landedNames.join(" + ")} · ${this.lastLandingQuality === "perfect" ? "perfect landing" : this.lastLandingQuality === "rough" ? "rough landing" : "landed"}`;
        else if (turns || this.grabPerformed) this.lastTrick += " · landed";
      }
      this.airRotation = 0;
      this.airPitch = this.airRoll = 0; this.flipTarget = 0; this.flipKind = null;
      this.spinVelocity = 0;
      this.spinTarget = 0;
      this.grabTimer = 0;
      this.grabPose = null;
      this.liveTrick = "";
      this.airborneTime = 0;
      this.grabPerformed = false;
      this.lastImpact = 0;
      v = this.body.linvel();
    }
    if (!this.grounded && !this.grinding) {
      this.airborneTime += dt;
      this.lastImpact = Math.min(this.lastImpact, v.y);
    }
    if (this.grinding) {
      if (c.tricks.includes("tweak")) this.grindStyle = "Royale grind";
      if (c.tricks.includes("grab")) this.grindStyle = "Soul grind";
      this.queuedTricks = [];
      this.airborneTime = 0;
      this.lastImpact = 0;
      this.liveTrick = this.grindStyle.toUpperCase();
      const r = this.grinding;
      const side = r.axis === "x" ? p.z - r.z : p.x - r.x;
      const along = r.axis === "x" ? p.x - r.x : p.z - r.z;
      if (
        c.brake > 0.5 ||
        Math.abs(along) > r.length / 2 ||
        Math.abs(side) > 1.2
      ) {
        if (this.grindingDistance > 1)
          this.addTrick(
            this.grindStyle,
            Math.min(500, Math.round(this.grindingDistance * 25)),
          );
        this.grinding = null;
        this.liveTrick = "";
        this.railCooldown = 0.45;
      } else {
        const direction =
          r.axis === "x" ? (v.x >= 0 ? 1 : -1) : v.z >= 0 ? 1 : -1;
        const speed = Math.max(
          0,
          Math.abs(r.axis === "x" ? v.x : v.z) - dt * 0.65,
        );
        this.grindingDistance += speed * dt;
        this.body.setTranslation(
          {
            x: r.axis === "x" ? p.x : r.x,
            y: r.y + 0.835,
            z: r.axis === "z" ? p.z : r.z,
          },
          true,
        );
        this.body.setLinvel(
          {
            x: r.axis === "x" ? direction * speed : 0,
            y: -this.world.gravity.y * dt,
            z: r.axis === "z" ? direction * speed : 0,
          },
          true,
        );
        this.heading =
          r.axis === "x"
            ? (direction * Math.PI) / 2
            : direction > 0
              ? 0
              : Math.PI;
        this.comboTimer = 2;
        if (c.jumpPressed || c.tricks.some(isFlip)) {
          if (this.grindingDistance > 1) this.addTrick(`${this.grindStyle} · pop out`, Math.min(500, Math.round(this.grindingDistance * 25)));
          const velocity = this.body.linvel();
          this.body.setLinvel({ ...velocity, y: 4.8 }, true);
          this.grinding = null;
          this.railCooldown = 0.6;
          this.jumpCooldown = 0.2;
          this.jumpBuffer = 0;
          this.jumpAge = 0;
          this.jumpCount++;
          this.liveTrick = "";
          this.queuedTricks = [...c.tricks];
        }
        return;
      }
    }
    const speed = this.speed;
    this.slideAmount += ((c.slide && this.grounded && speed > 2 ? 1 : 0) - this.slideAmount) * (1 - Math.exp(-dt * 10));
    // Wheel/blade edge grip, aerodynamic drag and push force use SI units.
    const desiredYaw =
      c.steer *
      (this.grounded
        ? Math.min(
            2.1 / (1 + speed * 0.055),
            (surface.grip * 0.92 * 9.81) / Math.max(1, speed),
          )
        : 0.35) *
      (speed > 0.4 ? 1 : 0.25);
    this.angularVelocity +=
      (desiredYaw - this.angularVelocity) *
      (1 - Math.exp(-dt * (this.grounded ? 6 : 2)));
    this.heading += this.angularVelocity * dt;
    this.leanAngle = Math.atan((speed * this.angularVelocity) / 9.81);
    const fx = Math.sin(this.heading),
      fz = Math.cos(this.heading);
    const forward = v.x * fx + v.z * fz;
    const lateralX = v.x - forward * fx,
      lateralZ = v.z - forward * fz;
    const rolling = this.grounded ? surface.rolling * 75 * 9.81 : 0;
    const drag = 0.5 * 1.225 * (c.crouch ? 0.27 : 0.5) * speed * speed;
    this.pushPhase +=
      this.grounded && c.throttle > 0
        ? dt * (1.05 + speed * 0.035) * Math.PI * 2
        : 0;
    const stroke = 0.3 + 1.87 * Math.pow(Math.sin(this.pushPhase), 4);
    this.pushStrength = this.grounded && this.bailTimer === 0 ? c.throttle : 0;
    const push =
      this.pushStrength *
      Math.min(250, 600 / Math.max(2, Math.abs(forward))) *
      Math.max(0, 1 - Math.pow(Math.abs(forward) / 14, 4)) *
      stroke;
    const braking = this.grounded
      ? (this.bailTimer > 0 ? 1 : Math.max(this.brakePressure, this.slideAmount * 0.85)) * (this.surface === "ICE" ? 220 : 310)
      : 0;
    const resistance = Math.min((speed * 75) / dt, rolling + drag + braking);
    const nx = speed > 0 ? v.x / speed : 0,
      nz = speed > 0 ? v.z / speed : 0;
    const lateral = Math.hypot(lateralX, lateralZ);
    const grip = this.grounded
      ? Math.min(
          1 - Math.exp(-dt * 8),
          (surface.grip * (1 - this.slideAmount * 0.72) * 9.81 * dt) / Math.max(0.001, lateral),
        )
      : 0;
    // Rapier's gravity/contact solver supplies downhill acceleration; adding it
    // manually would incorrectly count the same gravitational force twice.
    this.body.applyImpulse(
      {
        x: (fx * push - nx * resistance) * dt - lateralX * 75 * grip,
        y: 0,
        z: (fz * push - nz * resistance) * dt - lateralZ * 75 * grip,
      },
      true,
    );
    this.charge = c.jump && !this.grounded ? Math.max(0, 0.6 - this.jumpAge * 2) : 0;
    if (
      this.jumpBuffer > 0 &&
      this.coyote > 0 &&
      this.jumpCooldown === 0 &&
      this.bailTimer === 0
    ) {
      const target = c.crouch ? 5.2 : 4.8;
      this.body.applyImpulse({ x: 0, y: 75 * (target - v.y), z: 0 }, true);
      this.charge = 0;
      this.coyote = 0;
      this.grounded = false;
      this.jumpCooldown = 0.2;
      this.jumpCount++;
      this.jumpBuffer = 0;
      this.lastImpact = 0;
      this.jumpAge = 0;
    }
    if (!this.grounded) {
      for (const action of this.queuedTricks) {
        if (action === "left" || action === "right")
          this.spinTarget = Math.max(-4 * Math.PI, Math.min(4 * Math.PI, this.spinTarget + (action === "left" ? 1 : -1) * Math.PI));
        else if (isFlip(action)) {
          if (!this.flipKind || this.flipKind === action) { this.flipKind = action; this.flipTarget = Math.min(Math.PI * 4, this.flipTarget + Math.PI * 2); }
        } else { this.grabPose = action; this.grabTimer = 0.45; this.grabPerformed = true; }
      }
      this.queuedTricks = [];
      const remaining = this.spinTarget - this.airRotation;
      const step = Math.sign(remaining) * Math.min(Math.abs(remaining), 8.5 * dt);
      this.spinVelocity = step / dt;
      this.airRotation += step;
      if (this.flipKind) {
        const pitch = this.flipKind === "frontflip" || this.flipKind === "backflip";
        const direction = this.flipKind === "frontflip" || this.flipKind === "leftflip" ? 1 : -1;
        const current = pitch ? this.airPitch : this.airRoll;
        const remainingFlip = this.flipTarget - Math.abs(current);
        const angle = direction * Math.min(Math.max(0, remainingFlip), 10.5 * dt);
        if (pitch) this.airPitch += angle; else this.airRoll += angle;
      }
      this.grabTimer = Math.max(0, this.grabTimer - dt);
      if (c.grab) { this.grabPose = "grab"; this.grabTimer = 0.1; this.grabPerformed = true; }
      this.liveTrick = [this.flipKind ? `${this.flipTarget > Math.PI * 2 ? "DOUBLE " : ""}${this.flipKind === "frontflip" ? "FRONTFLIP" : this.flipKind === "backflip" ? "BACKFLIP" : this.flipKind === "leftflip" ? "LEFT SIDE FLIP" : "RIGHT SIDE FLIP"}` : "", this.spinTarget ? `${Math.round(Math.abs(this.spinTarget) / Math.PI) * 180}°` : "", this.grabTimer > 0 ? this.poseName.toUpperCase() : ""].filter(Boolean).join(" + ");
    }
    if (!c.manual) this.manualNeedsRelease = false;
    this.manualActive =
      c.manual &&
      this.grounded &&
      speed > 2 &&
      !this.manualNeedsRelease &&
      this.manualTime < 4;
    if (this.manualActive) {
      this.manualDistance += speed * dt;
      this.manualTime += dt;
      this.comboTimer = 2;
      this.lastTrick = "Manual";
    } else if (this.manualDistance > 0) {
      this.addTrick("Manual", Math.round(this.manualDistance * 8));
      this.manualDistance = 0;
      this.manualNeedsRelease = c.manual;
      this.manualTime = 0;
      this.manualActive = false;
    }
    if (
      this.comboTimer > 0 &&
      !this.grinding &&
      !this.manualActive &&
      this.grounded
    ) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.bank();
    }
    const now = this.body.linvel();
    const total = Math.hypot(now.x, now.z);
    if (total > 16)
      this.body.setLinvel(
        { x: (now.x * 16) / total, y: now.y, z: (now.z * 16) / total },
        true,
      );
  }
}
