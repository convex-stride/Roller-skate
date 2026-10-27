import { RAPIER, Skater, idle, STEP } from "./physics";
import { RaceRun, type RaceDefinition, type RaceSample } from "./races";
import type { CrowdPerson } from "./crowd";

/** Opponents use the same mass, push forces, grip and gravity as the player. */
export class RaceSession {
  run: RaceRun;
  recorded = false;
  rivals: { skater: Skater; id: string; lane: number; skill: number; name: string }[];
  constructor(readonly world: RAPIER.World, readonly player: Skater, definition: RaceDefinition, readonly duet = false) {
    this.run = new RaceRun(definition, duet ? ["Layan", "Taqee"] : undefined);
    player.reset(definition.start.x, definition.start.z); player.heading = definition.heading;
    this.rivals = (duet ? [-1.2] : [-1.8, -0.9, 0.9]).map((lane, index) => {
      const x = definition.start.x + Math.cos(definition.heading) * lane;
      const z = definition.start.z - Math.sin(definition.heading) * lane;
      const skater = new Skater(world, x, z); skater.heading = definition.heading;
      return { skater, id: `rival-${index + 1}`, lane, skill: [1, 0.96, 0.91][index], name: this.run.entrants[index + 1].name };
    });
  }
  beforeStep() {
    for (const rival of this.rivals) {
      const s = rival.skater, controls = idle(), p = s.body.translation();
      if (this.run.locked) { s.body.setLinvel({ x: 0, y: s.body.linvel().y, z: 0 }, true); s.tick(controls, []); continue; }
      const progress = this.run.entrants.find(e => e.id === rival.id)!;
      if (progress.finish !== null || this.run.status === "timeout") { controls.brake = 1; s.tick(controls, []); continue; }
      const target = this.run.target(rival.id);
      const count = this.run.definition.checkpoints.length;
      const previous = progress.gate === 0 ? this.run.definition.start : this.run.definition.checkpoints[(progress.gate - 1) % count];
      const along = Math.atan2(target.x - previous.x, target.z - previous.z);
      const tx = target.x + Math.cos(along) * rival.lane, tz = target.z - Math.sin(along) * rival.lane;
      const desired = Math.atan2(tx - p.x, tz - p.z);
      const error = Math.atan2(Math.sin(desired - s.heading), Math.cos(desired - s.heading));
      controls.steer = Math.max(-1, Math.min(1, error * 2.3));
      controls.throttle = Math.abs(error) < 1.4 ? rival.skill : 0;
      const next = this.run.definition.checkpoints[(progress.gate + 1) % count];
      const nextHeading = Math.atan2(next.x - target.x, next.z - target.z);
      const turn = Math.abs(Math.atan2(Math.sin(nextHeading - along), Math.cos(nextHeading - along)));
      const distance = Math.hypot(target.x - p.x, target.z - p.z);
      if ((Math.abs(error) > 0.7 || (distance < 13 && turn > 0.5 && progress.gate + 1 < this.run.totalGates)) && s.speed > 3.3) controls.brake = 1;
      controls.crouch = s.speed > 7 && Math.abs(error) < 0.2;
      const ahead = this.world.castRay(new RAPIER.Ray({ x: p.x, y: p.y, z: p.z }, { x: Math.sin(s.heading), y: 0, z: Math.cos(s.heading) }), 0.65 + s.speed * 0.15, true, undefined, undefined, s.collider, s.body);
      if (ahead && s.speed > 2) { controls.brake = 1; controls.throttle = 0; }
      s.tick(controls, []);
    }
    if (this.run.locked) {
      const v = this.player.body.linvel(); this.player.body.setLinvel({ x: 0, y: v.y, z: 0 }, true);
    }
  }
  afterStep() {
    const sample = (id: string, skater: Skater): RaceSample => ({ id, ...skater.body.translation(), grounded: skater.grounded });
    this.run.tick([sample("player", this.player), ...this.rivals.map(r => sample(r.id, r.skater))], STEP);
  }
  visuals(time: number): CrowdPerson[] {
    return this.rivals.map((r, i) => {
      const p = r.skater.body.translation();
      return { id: 9000 + i, name: r.name, role: "skater", x: p.x, z: p.z, route: [], next: 0, heading: r.skater.heading, speed: r.skater.speed,
        phase: r.skater.pushPhase + time * 0.5, age: time, wait: 0, reaction: 0, action: r.skater.speed > 0.5 ? "push" : "talk", distance: Math.hypot(p.x - this.player.body.translation().x, p.z - this.player.body.translation().z), ground: p.y - 0.83,
        following: false, stuck: 0, traveled: 0, crouching: r.skater.speed > 7 };
    });
  }
  dispose() { for (const r of this.rivals) this.world.removeRigidBody(r.skater.body); this.rivals = []; }
}
