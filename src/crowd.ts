import { clearGround, hash, inWorld } from "./world";
import { spots } from "./spots";
import { quests } from "./quests";
import { iceRinks } from "./ice-rinks";

export type CrowdRole = "skater" | "walker" | "social" | "vendor" | "spectator";
export type CrowdAction = "push" | "coast" | "walk" | "talk" | "phone" | "wave" | "cheer" | "yield" | "rideAlong";
export type CrowdPoint = { x: number; z: number };
export type CrowdPerson = CrowdPoint & {
  id: number; name: string; role: CrowdRole; route: CrowdPoint[]; next: number;
  heading: number; speed: number; phase: number; age: number; wait: number;
  reaction: number; action: CrowdAction; distance: number; ground: number;
  following: boolean; stuck: number; traveled: number;
  crouching?: boolean;
  airRotation?: number;
  airPitch?: number;
  airRoll?: number;
  grabbing?: boolean;
};
export type CrowdPlayer = CrowdPoint & { heading: number; speed: number; score: number };
type Probe = (x: number, z: number, fromX: number, fromZ: number) => number | null;
const gdNames = ["Marta", "Ola", "Kuba", "Ania", "Jan", "Lena", "Michał", "Zofia"];
const ryNames = ["Noura", "Omar", "Sara", "Faisal", "Lina", "Khalid", "Hana", "Yousef"];
function angleDelta(a: number, b: number) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }

/** Residents keep their routes and routines when the camera turns away. */
export class CrowdDirector {
  people: CrowdPerson[] = [];
  follower: CrowdPerson | null = null;
  followTime = 0;
  private previousScore = 0;
  private ambientCenter = { x: Infinity, z: Infinity };
  private ambientStart = 0;
  reactions = 0;
  yields = 0;
  constructor(readonly budget = 80) {
    const add = (role: CrowdRole, points: number[][], count: number) => {
      for (let n = 0; n < count; n++) {
        const id = this.people.length, route = points.map(([x, z]) => ({ x, z }));
        const along = n / count * route.length, segment = Math.floor(along), t = along % 1;
        const a = route[segment], b = route[(segment + 1) % route.length];
        const p: CrowdPerson = {
          id, name: (a.x < 0 ? gdNames : ryNames)[id % 8], role, route,
          x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
          next: (segment + 1) % route.length, heading: Math.atan2(b.x - a.x, b.z - a.z),
          speed: 0, phase: hash(id, 7) * Math.PI * 2, age: hash(id, 9) * 10,
          wait: role === "social" || role === "spectator" ? 1 + hash(id, 2) * 4 : 0,
          reaction: 0, action: "talk", distance: Infinity, ground: 0,
          following: false, stuck: 0, traveled: 0,
        };
        // Never start somebody inside a solid landmark or over the canal.
        if (clearGround(p.x, p.z, 0.4)) {
          if (this.people.some(other => Math.hypot(p.x - other.x, p.z - other.z) < 0.95)) {
            const original = { x: p.x, z: p.z };
            for (let attempt = 0; attempt < 24; attempt++) {
              const a = attempt * Math.PI / 4, radius = 1 + Math.floor(attempt / 8) * 0.6;
              const x = original.x + Math.sin(a) * radius, z = original.z + Math.cos(a) * radius;
              if (clearGround(x, z, 0.4) && !this.people.some(other => Math.hypot(x - other.x, z - other.z) < 0.95)) { p.x = x; p.z = z; break; }
            }
          }
          this.people.push(p);
        }
      }
    };
    add("skater", [[-1090, 71], [-1010, 71], [-1010, 79], [-1090, 79]], 14);
    add("walker", [[-1090, 81], [-1010, 81], [-1010, 73], [-1090, 73]], 16);
    add("walker", [[-1012, -72], [-1012, 3], [-1003, 3], [-1003, -72]], 10);
    add("social", [[-1084, 65], [-1082, 65], [-1082, 67], [-1084, 67]], 5);
    add("vendor", [[-1090, 62], [-1088, 62]], 2);
    add("social", [[-1016, 60], [-1013, 60], [-1013, 62]], 4);
    add("skater", [[1247, -5], [1247, 44], [1264, 44], [1264, -5]], 12);
    add("walker", [[1230, -4], [1230, 43], [1280, 43], [1280, -4]], 18);
    add("social", [[1240, 31], [1243, 31], [1243, 33]], 5);
    add("vendor", [[1221, 10], [1221, 22]], 3);
    add("social", [[1286, 12], [1289, 12], [1289, 15]], 5);
    for (const side of [-1, 1]) {
      add("walker", [[1000 + side * 22, -72], [1000 + side * 22, 76]], 10);
      add("skater", [[1000 + side * 5, -70], [1000 + side * 5, 74]], 5);
    }
    for (const spot of spots) {
      const end = spot.size[1] / 2 - (spot.layout === "pump" ? 12 : 28), sideX = spot.size[0] / 2 - 20;
      add("skater", [[spot.x - 16, spot.z - end], [spot.x - 16, spot.z + end], [spot.x + 15, spot.z + end], [spot.x + 15, spot.z - end]], 10);
      for (const side of [-1, 1]) {
        add("spectator", [[spot.x + side * 12, spot.z - 18], [spot.x + side * 13, spot.z - 15]], 5);
        add("social", [[spot.x + side * sideX, spot.z - end], [spot.x + side * sideX, spot.z - end + 4]], 3);
      }
    }
    // Small local routines give the outer activity courts residents of their own.
    for (const q of quests) {
      const { x, z } = q.anchor;
      add("walker", [[x - 3, z - 3], [x + 3, z - 3], [x + 3, z + 3], [x - 3, z + 3]], 2);
      add(q.kind === "style" || q.kind === "flip" ? "spectator" : "social", [[x - 2, z + 2], [x - 1, z + 2]], 2);
    }
    for (const r of iceRinks) {
      add("skater", [[r.x - 9, r.z - 22], [r.x - 9, r.z + 22], [r.x + 9, r.z + 22], [r.x + 9, r.z - 22]], 8);
      for (const side of [-1, 1]) {
        add("spectator", [[r.x + side * 19, r.z - 9], [r.x + side * 19, r.z + 9]], 2);
        add("vendor", [[r.x + side * 16, r.z - 36], [r.x + side * 16, r.z - 34]], 1);
      }
    }
    this.ambientStart = this.people.length;
    for (let n = 0; n < 32; n++) {
      const id = this.people.length;
      this.people.push({ id, name: "Local", role: n % 3 === 0 ? "skater" : "walker", x: 0, z: 10000, route: [], next: 0, heading: 0, speed: 0, phase: n, age: n, wait: 0, reaction: 0, action: "walk", distance: Infinity, ground: 0, following: false, stuck: 0, traveled: 0 });
    }
  }
  private populateAmbient(player: CrowdPlayer) {
    if (Math.hypot(player.x - this.ambientCenter.x, player.z - this.ambientCenter.z) < 75) return;
    const relocated = Math.hypot(player.x - this.ambientCenter.x, player.z - this.ambientCenter.z) > 250;
    const sparse = this.people.slice(0, this.ambientStart).filter(p => Math.hypot(p.x - player.x, p.z - player.z) < 70).length < 12;
    this.ambientCenter = { x: player.x, z: player.z };
    const cellX = Math.floor(player.x / 100), cellZ = Math.floor(player.z / 100);
    for (const p of this.people.slice(this.ambientStart)) {
      if (Math.hypot(p.x - player.x, p.z - player.z) < 190) continue;
      for (let attempt = 0; attempt < 24; attempt++) {
        const a = hash(p.id, cellX + attempt, cellZ + 71) * Math.PI * 2;
        const r = relocated && sparse && p.id < this.ambientStart + 12 ? 24 + hash(p.id, attempt + cellZ, 91) * 30 : 65 + hash(p.id, attempt + cellZ, 91) * 105;
        const x = player.x + Math.sin(a) * r, z = player.z + Math.cos(a) * r;
        const dx = Math.sin(a + 1) * 20, dz = Math.cos(a + 1) * 20;
        if (!clearGround(x, z, 0.6) || !clearGround(x + dx, z + dz, 0.6)) continue;
        let legal = true;
        for (let t = 0; t <= 1; t += 0.1) if (!clearGround(x + dx * t, z + dz * t, 0.6)) legal = false;
        if (!legal) continue;
        Object.assign(p, { x, z, route: [{ x, z }, { x: x + dx, z: z + dz }], next: 1, speed: 0, ground: 0 });
        p.name = (x < 0 ? gdNames : ryNames)[p.id % 8]; break;
      }
    }
  }
  invite(player: CrowdPlayer) {
    if (this.follower) { const name = this.follower.name; this.follower.following = false; this.follower = null; return `${name} · See you on the next lap!`; }
    const p = this.nearbyRider(player);
    if (!p) return "Skate closer to a local rider to invite them along";
    this.follower = p; p.following = true; p.reaction = 2; this.followTime = 45;
    return `${p.name} joined you · lead the way for a 45-second ride`;
  }
  nearbyRider(player: CrowdPoint) {
    return this.people.filter(p => p.role === "skater" && Math.hypot(p.x - player.x, p.z - player.z) < 28)
      .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0];
  }
  update(player: CrowdPlayer, dt: number, probe: Probe = (x, z) => clearGround(x, z, 0.45) ? 0 : null) {
    this.populateAmbient(player);
    const celebrate = player.score > this.previousScore + 120;
    this.previousScore = player.score;
    if (this.follower && (Math.hypot(this.follower.x - player.x, this.follower.z - player.z) > 90 || (this.followTime -= dt) <= 0)) { this.follower.following = false; this.follower = null; }
    const active = this.people.filter(p => Math.hypot(p.x - player.x, p.z - player.z) < 200 && p.route.length);
    for (const p of active) {
      const floor = probe(p.x, p.z, p.x, p.z);
      if (floor !== null && floor < 0.55 && floor > -0.2) p.ground = floor;
      p.distance = Math.hypot(p.x - player.x, p.z - player.z); p.age += dt;
      p.reaction = Math.max(0, p.reaction - dt); p.wait = Math.max(0, p.wait - dt);
      if (celebrate && p.distance < 28) { p.reaction = 2.5 + hash(p.id, 1); p.action = "cheer"; this.reactions++; }
      if (p.reaction > 0 && p.distance > 2.8 && (p.action === "cheer" || p.role !== "skater")) {
        p.speed *= Math.exp(-dt * 7); p.heading += angleDelta(Math.atan2(player.x - p.x, player.z - p.z), p.heading) * Math.min(1, dt * 5);
        continue;
      }
      const target = p.following ? {
        x: player.x - Math.sin(player.heading) * 3.5 + Math.cos(player.heading) * 2.4,
        z: player.z - Math.cos(player.heading) * 3.5 - Math.sin(player.heading) * 2.4,
      } : p.route[p.next];
      let dx = target.x - p.x, dz = target.z - p.z, length = Math.hypot(dx, dz);
      if (!p.following && length < 0.85) {
        p.next = (p.next + 1) % p.route.length;
        p.wait = p.role === "skater" ? 0 : p.role === "walker" ? hash(p.id, p.next) * 1.4 : 3 + hash(p.id, p.age) * 5;
      }
      let desiredSpeed = p.role === "skater" ? 3.6 + hash(p.id, 1) * 1.7 : 1 + hash(p.id, 2) * 0.4;
      if (p.following) desiredSpeed = Math.min(10, Math.max(0, length - 1) * 1.6 + player.speed * 0.65);
      if (p.wait > 0) desiredSpeed = 0;
      if (length > 0.01) { dx /= length; dz /= length; }
      // Predicted player position makes people yield before a fast close pass.
      const px = player.x + Math.sin(player.heading) * player.speed * 0.4;
      const pz = player.z + Math.cos(player.heading) * player.speed * 0.4;
      const close = Math.hypot(p.x - px, p.z - pz);
      if (close < 3.2 || p.distance < 1.9) {
        const awayX = p.x - player.x, awayZ = p.z - player.z, away = Math.max(0.1, Math.hypot(awayX, awayZ));
        dx = awayX / away; dz = awayZ / away; desiredSpeed = p.distance < 1.3 ? 2.4 : 1.3;
        if (p.action !== "yield") this.yields++;
        p.action = "yield";
      } else {
        for (const other of active) {
          if (other === p) continue;
          const ox = p.x - other.x, oz = p.z - other.z, separation = Math.hypot(ox, oz);
          if (separation > 0.01 && separation < 1.25) { dx += ox / separation * (1.25 - separation); dz += oz / separation * (1.25 - separation); }
        }
        p.action = p.following ? "rideAlong" : desiredSpeed === 0 ? (p.role === "spectator" ? "cheer" : p.id % 3 === 0 ? "phone" : "talk") : p.role === "skater" ? (Math.sin(p.phase) > 0.2 ? "push" : "coast") : "walk";
      }
      const wantedHeading = Math.atan2(dx, dz);
      p.heading += angleDelta(wantedHeading, p.heading) * Math.min(1, dt * (p.role === "skater" ? 3 : 6));
      p.speed += (desiredSpeed - p.speed) * (1 - Math.exp(-dt * 3));
      const step = p.speed * dt;
      let moved = false;
      for (const turn of [0, 0.65, -0.65, 1.3, -1.3]) {
        const heading = p.heading + turn;
        const x = p.x + Math.sin(heading) * step, z = p.z + Math.cos(heading) * step;
        if (!inWorld(x, z) || !clearGround(x, z, 0.4)) continue;
        const floor = probe(x, z, p.x, p.z);
        if (floor === null || floor > 0.55 || floor < -0.2) continue;
        p.x = x; p.z = z; p.ground = floor; p.heading = heading; p.traveled += step; moved = true; break;
      }
      if (moved) p.stuck = 0;
      else { p.speed = 0; p.stuck += dt; if (p.stuck > 1.5) { p.next = (p.next + 1) % p.route.length; p.stuck = 0; } }
      p.phase += p.speed * dt * (p.role === "skater" ? 1.7 : 4.4);
    }
    return active.sort((a, b) => a.distance - b.distance).slice(0, this.budget);
  }
}
