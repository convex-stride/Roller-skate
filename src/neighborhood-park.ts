import * as THREE from "three";
import { RAPIER } from "./physics";
import { parkLayout, surfaceGeometry } from "./park-layouts";
import { sign, surface, type StreetKit } from "./environment";
import type { Spot } from "./spots";

export function neighborhoodPark(spot: Spot, group: THREE.Group, world: RAPIER.World, k: StreetKit) {
  const { x, z } = spot, historic = spot.city === "gdansk", layout = parkLayout(spot);
  const floor = k.box(group, x, 0.025, z, spot.size[0], 0.05, spot.size[1], historic ? 0x6b7d80 : 0xc8b18c, true);
  floor.material = surface("paving", historic ? 0x8b9fa2 : 0xd9c4a0);
  for (const b of layout.boxes) {
    const object = k.box(group, x + b.x, 0.05 + b.y, z + b.z, b.w, b.h, b.d, b.rotation ? 0xb6b9a8 : spot.color, true, b.rotation ?? 0);
    object.material = k.material(b.rotation ? 0xaeb6ad : spot.color, 0.88);
  }
  for (const s of layout.surfaces) {
    const data = surfaceGeometry(s), geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data.vertices, 3)); geometry.setIndex(new THREE.BufferAttribute(data.indices, 1)); geometry.computeVertexNormals();
    const ramp = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: spot.layout === "pump" ? spot.color : historic ? 0xb9bfb0 : 0xd6c6a7, roughness: 0.86, side: THREE.DoubleSide }));
    ramp.position.set(x, 0.05, z); ramp.receiveShadow = true; ramp.castShadow = true; group.add(ramp);
    world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices, data.indices).setTranslation(x, 0.05, z).setFriction(0.05));
    const shape = new THREE.Shape();
    s.profile.forEach(([dz, y], i) => { if (i === 0) shape.moveTo(dz, y); else shape.lineTo(dz, y); });
    shape.lineTo(s.profile.at(-1)![0], -0.05); shape.lineTo(s.profile[0][0], -0.05); shape.closePath();
    const sideGeometry = new THREE.ShapeGeometry(shape).rotateY(-Math.PI / 2);
    const sideMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(spot.color).multiplyScalar(0.72), roughness: 0.95, side: THREE.DoubleSide });
    for (const direction of [-1, 1]) {
      const side = new THREE.Mesh(sideGeometry, sideMaterial); side.position.set(x + s.x + direction * s.w / 2, 0.05, z + s.z); side.receiveShadow = true; group.add(side);
      const vertices = sideGeometry.getAttribute("position").array as Float32Array;
      const indices = new Uint32Array(sideGeometry.index!.array);
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setTranslation(side.position.x, side.position.y, side.position.z));
    }
    // A painted lip follows the actual curved surface rather than a flat fake ramp.
    for (const side of [-1, 1]) {
      const line = new THREE.BufferGeometry().setFromPoints(s.profile.map(([dz, y]) => new THREE.Vector3(x + s.x + side * (s.w / 2 - 0.08), 0.07 + y, z + s.z + dz)));
      group.add(new THREE.Line(line, new THREE.LineBasicMaterial({ color: spot.color })));
    }
  }
  for (const r of layout.rails) k.rail(group, x + r.x, z + r.z, r.length, r.axis);
  const entranceZ = z - spot.size[1] / 2 + 5;
  for (const side of [-1, 1]) {
    k.cylinder(group, x + side * 11, 2.2, entranceZ, 0.1, 4.4, historic ? 0x38565b : 0x97794f);
    for (const dz of [-spot.size[1] / 2 + 18, spot.size[1] / 2 - 12]) {
      const px = x + side * (spot.size[0] / 2 - 6);
      k.tree(group, px, z + dz, spot.city);
      k.box(group, px, 0.35, z + dz + 3, 4, 0.7, 1, historic ? 0x668479 : 0xa48b66, true);
    }
    for (let dz = -spot.size[1] / 2 + 12; dz < spot.size[1] / 2 - 4; dz += 10)
      k.box(group, x + side * (spot.size[0] / 2 - 1), 0.07, z + dz, 0.18, 0.02, 4, spot.color);
  }
  sign(group, spot.name, x, 4.1, entranceZ, 22, Math.PI, historic ? "#385e64" : "#6e7254");
  const subtitle = spot.layout === "pump" ? "PUMP / AIR / FLOW" : spot.layout === "vert" ? "QUARTER PIPES / AIR / GRIND" : "BANKS / LEDGES / STAIRS / RAILS";
  sign(group, subtitle, x, 3.05, entranceZ, 15, Math.PI, historic ? "#385e64" : "#6e7254");
  const pad = k.box(group, x, 0.065, entranceZ + 8, 8, 0.025, 5, spot.color); pad.material = k.material(spot.color, 1);
  for (const side of [-1, 1]) k.box(group, x + side * 2.2, 0.085, entranceZ + 8, 0.12, 0.02, 3.8, 0xf0ead3);
  return floor;
}
