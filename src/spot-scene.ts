import * as THREE from "three";
import { RAPIER } from "./physics";
import { spots } from "./spots";
import { sign, surface, type StreetKit } from "./environment";
import { neighborhoodPark } from "./neighborhood-park";

/** Authored stunt geometry stays loaded so elevated landings always have collision. */
export function buildSpots(scene: THREE.Scene, world: RAPIER.World, k: StreetKit) {
  const root = new THREE.Group(); scene.add(root);
  const parks: { group: THREE.Group; x: number; z: number }[] = [];
  const movers: { mesh: THREE.Group; body: RAPIER.RigidBody; x: number; z: number }[] = [];
  const flags: THREE.Mesh[] = [];
  for (const s of spots) {
    const group = new THREE.Group(); root.add(group); parks.push({ group, x: s.x, z: s.z });
    if (s.layout !== "gap") { root.add(neighborhoodPark(s, group, world, k)); continue; }
    const { x, z, height: h } = s, dock = s.city === "gdansk", color = s.color;
    const floor = k.box(group, x, 0.025, z, 128, 0.05, 202, dock ? 0x394e58 : 0xc6b294, true);
    floor.material = surface(dock ? "asphalt" : "paving", dock ? 0x42575f : 0xcbb897);
    root.add(floor);
    // Painted lanes make the choices visible from the entrance, not only on a map.
    for (const lane of [0, -27, 28]) {
      for (const side of [-1, 1]) for (let dz = -80; dz < 84; dz += 8)
        k.box(group, x + lane + side * 7, 0.061, z + dz, 0.2, 0.018, 4, color);
    }
    for (const [dx, title] of [[-27, "TRICK PARTY"], [0, "UP & OVER"], [28, "WEAVE LINE"]] as const) {
      for (const side of [-1, 1]) k.cylinder(group, x + dx + side * 5, 1.5, z - 53, 0.06, 3, 0x405b59);
      sign(group, title, x + dx, 3, z - 53, 10, Math.PI, dock ? "#3b5a64" : "#467969");
    }
    // Thin rotated slabs have a flush toe and the same physical and visible slope.
    const rampLength = 30, angle = Math.atan(h / rampLength);
    k.box(group, x, h / 2 - 0.06, z - 35, 10, 0.12, Math.hypot(rampLength, h), dock ? 0xa6a49a : 0xdfcba8, true, -angle);
    k.box(group, x, h / 2, z - 8, 10, h, 24, dock ? 0x427d82 : 0xb89a74, true);
    k.box(group, x, h / 2, z + (4 + s.gap + 36) / 2, 10, h, 32 - s.gap, dock ? 0xc16c48 : 0xb89a74, true);
    k.box(group, x, h / 2 - 0.06, z + 51, 10, 0.12, Math.hypot(rampLength, h), dock ? 0xa6a49a : 0xdfcba8, true, angle);
    for (let dz = -19; dz < 35; dz += 2) {
      if (dz > 4 && dz < 4 + s.gap) continue;
      for (const side of [-1, 1]) k.box(group, x + side * 5.04, h / 2, z + dz, 0.12, h * 0.86, 0.12, dock ? 0x375e62 : 0xd7bf94);
    }
    // High-contrast takeoff stripes and direction arrows.
    for (let dx = -4; dx <= 4; dx += 1) k.box(group, x + dx, h + 0.02, z + 2, 0.55, 0.025, 1.5, dx % 2 ? 0x172b33 : color);
    for (const dz of [-8, 21]) {
      k.box(group, x, h + 0.015, z + dz, 9.8, 0.025, 8, dock ? 0x486c75 : 0x6c9990);
      for (const side of [-1, 1]) k.box(group, x + side * 4.5, h + 0.04, z + dz, 0.2, 0.02, 8, color);
    }
    for (const dz of [-66, -58, 70]) {
      for (const side of [-1, 1]) {
        const arrow = k.box(group, x + side * 0.5, 0.06, z + dz, 0.18, 0.02, 1.4, color);
        arrow.rotation.y = side * 0.65;
      }
    }
    // A separate trick lane lets players keep chaining without blocking the circuit.
    k.rail(group, x - 27, z - 35, 18);
    k.rail(group, x - 27, z + 15, 22);
    for (const dz of [-8, 45]) {
      k.box(group, x - 27, 0.52, z + dz, 6, 0.18, 8, color, true, -0.13);
      k.box(group, x - 39, 0.27, z + dz, 2, 0.54, 13, 0xb9baa9, true);
    }
    for (const dz of [-49, -20, 9, 43, 78]) {
      const dx = dz === -20 ? 34 : dz === 9 ? 22 : dz === 43 ? 33 : 28;
      for (const side of [-1, 1]) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), k.material(color));
        cone.position.set(x + dx + side * 4, 0.43, z + dz); group.add(cone);
      }
    }
    // Entrance and finish arches frame an immediately readable route.
    for (const dz of [-88, 88]) {
      for (const dx of [-10, 10]) k.box(group, x + dx, 3, z + dz, 0.45, 6, 0.45, color, true);
      k.box(group, x, 6, z + dz, 20.5, 0.5, 0.5, color);
      sign(group, dz < 0 ? s.name : "LAND IT. LINK IT. REPEAT.", x, 5.35, z + dz - 0.3, 18, Math.PI, dock ? "#294a54" : "#315e55");
    }
    for (let i = 0; i < 18; i++) {
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.3, 3), k.material(i % 2 ? color : 0xe9ddbc));
      flag.position.set(x - 51 + i * 6, 6.8, z - 62); flag.rotation.z = Math.PI;
      group.add(flag); flags.push(flag);
    }
    for (const dx of [-55, 55]) {
      k.cylinder(group, x + dx, 3.5, z - 62, 0.1, 7, 0x54645a);
      for (const dz of [-70, -18, 40, 80]) {
        if (dock) {
          k.box(group, x + dx, 1.3, z + dz, 6, 2.6, 12, dz % 3 ? 0xb36549 : 0x3c7583, true);
          for (let n = -5; n <= 5; n++) k.box(group, x + dx - Math.sign(dx) * 3.04, 1.3, z + dz + n, 0.1, 2.5, 0.1, 0x283f46);
        } else {
          k.box(group, x + dx, 0.4, z + dz, 5, 0.8, 5, 0xa38965, true);
          k.tree(group, x + dx, z + dz, "riyadh");
          for (const offset of [-3, 3]) k.cylinder(group, x + dx + offset, 3.2, z + dz, 0.1, 6.4, 0xbca379);
          k.box(group, x + dx, 6.4, z + dz, 8, 0.12, 6, 0xe6cda0);
        }
      }
    }
    // A cargo gantry versus a lantern pavilion gives each skyline its own shape.
    if (dock) {
      for (const dx of [-49, 49]) k.box(group, x + dx, 10, z + 55, 1.2, 20, 1.2, 0xcd7c42, true);
      k.box(group, x, 20, z + 55, 100, 1.4, 1.4, 0xcd7c42);
      k.cylinder(group, x - 43, 15, z + 55, 0.07, 9, 0x263c42);
    } else {
      for (let i = 0; i < 9; i++) {
        const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0xffd18e, emissive: 0xffa23d, emissiveIntensity: 0.6 }));
        lantern.position.set(x - 48 + i * 12, 7.5, z + 70); group.add(lantern);
      }
    }
    // Slow kinematic carts are actual colliders, confined to the optional weave lane.
    const cart = new THREE.Group(); scene.add(cart);
    k.box(cart, 0, 0.7, 0, 2.2, 1, 2.7, dock ? 0xd29b49 : 0x5faaa0);
    for (const dx of [-1, 1]) for (const dz of [-0.9, 0.9]) {
      const wheel = k.cylinder(cart, dx, 0.3, dz, 0.3, 0.16, 0x293a3c); wheel.rotation.z = Math.PI / 2;
    }
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x + 28, 0, z + 31));
    world.createCollider(RAPIER.ColliderDesc.cuboid(1.1, 0.6, 1.35).setTranslation(0, 0.6, 0), body);
    movers.push({ mesh: cart, body, x: x + 28, z: z + 31 });
  }
  return {
    group: root,
    groups: parks.map(p => p.group),
    tick(time: number) { for (const m of movers) m.body.setNextKinematicTranslation({ x: m.x + Math.sin(time * 0.45) * 8, y: 0, z: m.z }); },
    animate(time: number, playerX: number, playerZ: number) {
      for (const p of parks) p.group.visible = Math.hypot(p.x - playerX, p.z - playerZ) < 320;
      for (const m of movers) { m.mesh.position.copy(m.body.translation()); m.mesh.visible = Math.hypot(m.x - playerX, m.z - playerZ) < 320; }
      flags.forEach((f, i) => { f.rotation.x = Math.sin(time * 2 + i * 0.5) * 0.15; });
    },
  };
}
