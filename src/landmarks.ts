import * as THREE from "three";
import { landmarks, type Landmark } from "./city-profile";
import { surface, sign, type StreetKit } from "./environment";
import { glazing } from "./world-materials";

const pointedShape = new THREE.Shape();
pointedShape.moveTo(-.5, 0); pointedShape.lineTo(-.5, .67);
pointedShape.quadraticCurveTo(-.35, .9, 0, 1);
pointedShape.quadraticCurveTo(.35, .9, .5, .67); pointedShape.lineTo(.5, 0); pointedShape.closePath();
const pointedGeometry = new THREE.ShapeGeometry(pointedShape);
function gothicWindow(g: THREE.Group, x: number, y: number, z: number, w: number, h: number, yaw: number, k: StreetKit) {
  const border = new THREE.Mesh(pointedGeometry, surface("stone", 0x9b9180));
  border.position.set(x, y, z); border.scale.set(w, h, 1); border.rotation.y = yaw; g.add(border);
  const glass = new THREE.Mesh(pointedGeometry, glazing(0x394e58));
  glass.position.set(x + Math.sin(yaw) * .04, y + .3, z + Math.cos(yaw) * .04);
  glass.scale.set(w - .5, h - .65, 1); glass.rotation.y = yaw; g.add(glass);
  const mullion = k.box(g, x + Math.sin(yaw) * .09, y + h * .4, z + Math.cos(yaw) * .09, .13, h * .79, .13, 0xb9ad93);
  mullion.castShadow = true;
}

function basilica(g: THREE.Group, l: Landmark, k: StreetKit) {
  const { x, z } = l;
  const brick = (dx: number, y: number, dz: number, w: number, h: number, d: number) => {
    const m = k.box(g, x + dx, y, z + dz, w, h, d, 0x9e6854); m.material = surface("brick", 0xa7745d); return m;
  };
  brick(0, 13, 0, 35, 26, 62);
  for (const dx of [-11.7, 0, 11.7]) pitched(g, x + dx, 26, z, 11.7, 63, 9, 0x71584b, k);
  // The wide, blunt western bell tower is the church's identifying silhouette.
  brick(0, 28, -23, 22, 56, 18);
  for (const side of [-1, 1]) {
    for (let dz = -18; dz <= 24; dz += 10.5) {
      brick(side * 18.3, 11, dz, 1.7, 22, 2.1);
      gothicWindow(g, x + side * 17.56, 5, z + dz + 4.8, 3.4, 15, side * Math.PI / 2, k);
    }
    for (const dx of [-8, 8]) {
      const turret = k.cylinder(g, x + dx, 58, z - 23 + side * 7, .95, 8, 0x9e6854); turret.material = surface("brick", 0xa7745d);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 12, 8), k.material(0x5b776c, .55, .3));
      spire.position.set(x + dx, 65, z - 23 + side * 7); spire.castShadow = true; g.add(spire);
    }
    for (const dx of [-11.7, 0, 11.7]) for (let step = 0; step < 6; step++)
      brick(dx, 27 + step * 1.3, side * 31.3, 10.7 - step * 1.6, 1.3, .8);
    for (const dx of [-12.8, 0, 12.8])
      gothicWindow(g, x + dx, 5, z + side * 31.76, dx === 0 ? 5.5 : 4.6, 17, side > 0 ? 0 : Math.PI, k);
    for (const dx of [-17, -6, 6, 17]) brick(dx, 11.5, side * 31.7, 1.3, 23, 2);
  }
  for (let y = 34; y <= 47; y += 10) for (const dx of [-5, 5]) gothicWindow(g, x + dx, y, z - 32.05, 3, 7, Math.PI, k);
  k.box(g, x, 55.5, z - 23, 23, .8, 19, 0x8d7a60);
  gothicWindow(g, x, .3, z - 32.12, 4.8, 9, Math.PI, k);
  sign(g, "BAZYLIKA MARIACKA · ST. MARY’S", x + 17.65, 1.5, z + 22, 4.5, Math.PI / 2, "#4b5550");
}

function pifTower(g: THREE.Group, l: Landmark, k: StreetKit) {
  const { x, z } = l, vertices: number[] = [];
  const ring = (i: number, r: number, y: number) => [Math.cos(i * Math.PI / 4) * r, y, Math.sin(i * Math.PI / 4) * r];
  const levels = [[0, 21], [100, 18.5], [123, 14], [142, 1]];
  for (let level = 0; level < levels.length - 1; level++) for (let i = 0; i < 8; i++) {
    const a = ring(i, levels[level][1], levels[level][0]), b = ring(i + 1, levels[level][1], levels[level][0]);
    const c = ring(i + 1, levels[level + 1][1], levels[level + 1][0]), d = ring(i, levels[level + 1][1], levels[level + 1][0]);
    vertices.push(...a, ...c, ...b, ...a, ...d, ...c);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
  const glass = new THREE.Mesh(geometry, glazing(0x7f9ca7)); glass.position.set(x, 0, z); glass.castShadow = true; glass.receiveShadow = true; g.add(glass);
  const line = (a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
    const d = b.clone().sub(a), m = k.cylinder(g, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, radius, d.length(), 0xc5c9c2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.material = k.material(0xc5c9c2, .35, .65);
  };
  for (let y = 4; y < 121; y += 3.6) {
    const r = y < 100 ? 21 - y * .025 : 18.5 - (y - 100) * 4.5 / 23;
    for (let i = 0; i < 8; i++) line(new THREE.Vector3(...ring(i, r + .06, y)).add(new THREE.Vector3(x, 0, z)), new THREE.Vector3(...ring(i + 1, r + .06, y)).add(new THREE.Vector3(x, 0, z)), .045);
  }
  for (let i = 0; i < 8; i++) for (let level = 0; level < levels.length - 1; level++) line(new THREE.Vector3(...ring(i, levels[level][1] + .08, levels[level][0])).add(new THREE.Vector3(x, 0, z)), new THREE.Vector3(...ring(i, levels[level + 1][1] + .08, levels[level + 1][0])).add(new THREE.Vector3(x, 0, z)), .16);
  const podium = k.box(g, x, 2, z, 42, 4, 42, 0xc2b69d); podium.material = surface("stone", 0xd5cbb6);
  sign(g, "PIF TOWER · KAFD", x, 3, z + 21.06, 5, 0, "#405c65");
}

function slab(
  g: THREE.Group,
  shape: THREE.Shape,
  depth: number,
  color: number,
  x: number,
  y: number,
  z: number,
  k: StreetKit,
) {
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
    k.material(color, 0.38, 0.3),
  );
  mesh.position.set(x, y, z - depth / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
function pitched(
  g: THREE.Group,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: number,
  k: StreetKit,
) {
  const p = new THREE.Shape();
  p.moveTo(-w / 2, 0);
  p.lineTo(0, h);
  p.lineTo(w / 2, 0);
  p.closePath();
  const mesh = slab(g, p, d, color, x, y, z, k);
  mesh.material = surface("roof", color);
  return mesh;
}
function crenels(
  g: THREE.Group,
  x: number,
  z: number,
  length: number,
  height: number,
  k: StreetKit,
  axis: "x" | "z" = "x",
) {
  for (let i = -length / 2; i < length / 2; i += 2)
    k.box(
      g,
      x + (axis === "x" ? i : 0),
      height,
      z + (axis === "z" ? i : 0),
      1.1,
      1.2,
      1.1,
      0xb69b72,
    );
}

export function buildCityLandmarks(group: THREE.Group, k: StreetKit) {
  for (const l of landmarks) {
    const { x, z } = l;
    const box = k.box;
    if (l.kind !== "gate" && l.kind !== "neptune" && l.kind !== "deera") {
      const collider = box(group, x, 4, z, l.w, 8, l.d, 0x667466, true);
      collider.visible = false;
    }
    if (l.kind === "basilica") {
      basilica(group, l, k);
    } else if (l.kind === "pif") {
      pifTower(group, l, k);
    } else if (l.kind === "neptune") {
      // Long Market's defining silhouette: basin, bronze figure and trident.
      const bronze = 0x41695e;
      const solid = box(group, x, 0.45, z, 6.4, 0.9, 6.4, 0xbeb29a, true);
      solid.visible = false;
      k.cylinder(group, x, 0.25, z, 3.5, 0.5, 0xbab09c);
      k.cylinder(group, x, 0.7, z, 2.9, 0.5, 0xd0c3a8);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.18, 8, 40), k.material(0xd4c5aa));
      rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.98, z); group.add(rim);
      k.cylinder(group, x, 0.91, z, 2.7, 0.025, 0x4d898a);
      k.cylinder(group, x, 1.5, z, 0.7, 1.2, 0xc4b69a);
      k.cylinder(group, x, 2.15, z, 1.1, 0.2, 0xbfb293);
      const limb = (a: number[], b: number[], radius: number) => {
        const start = new THREE.Vector3(...a).add(new THREE.Vector3(x, 0, z));
        const end = new THREE.Vector3(...b).add(new THREE.Vector3(x, 0, z));
        const dir = end.clone().sub(start);
        const m = k.cylinder(group, (start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2, radius, dir.length(), bronze);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      };
      limb([-0.33, 2.3, 0], [-0.14, 3.5, 0], 0.16);
      limb([0.35, 2.3, 0.15], [0.14, 3.5, 0], 0.16);
      limb([0, 3.4, 0], [0, 4.3, 0], 0.3);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), k.material(bronze));
      head.position.set(x, 4.65, z); group.add(head);
      limb([-0.25, 4.15, 0], [-0.85, 4.45, 0.06], 0.12);
      limb([-0.85, 4.45, 0.06], [-1.1, 4.15, 0.2], 0.11);
      limb([0.25, 4.15, 0], [0.8, 3.7, -0.1], 0.12);
      limb([0.8, 3.7, -0.1], [1.2, 3.9, -0.2], 0.11);
      limb([-1.1, 2.5, 0.2], [-1.1, 5.6, 0.2], 0.045);
      limb([-1.5, 5.5, 0.2], [-0.7, 5.5, 0.2], 0.045);
      for (const dx of [-1.5, -1.1, -0.7]) limb([dx, 5.5, 0.2], [dx, 6, 0.2], 0.04);
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        k.cylinder(group, x + Math.cos(a) * 3.25, 0.65, z + Math.sin(a) * 3.25, 0.035, 1.3, 0x334c43);
      }
      sign(group, "FONTANNA NEPTUNA · DŁUGI TARG", x, 1.1, z - 3.4, 2.6, Math.PI, "#36594f");
    } else if (l.kind === "deera") {
      const shaft = box(group, x, 8, z, 3.7, 16, 3.7, 0xd8c6a6, true);
      shaft.material = surface("plaster", 0xe3d2b5);
      box(group, x, 0.35, z, 6.5, 0.7, 6.5, 0xb99b74, true);
      box(group, x, 17.4, z, 5.8, 4.5, 5.8, 0xdcc7a3, true);
      for (const y of [15.1, 19.8, 20.5]) box(group, x, y, z, 6.2, 0.35, 6.2, 0xb89c71);
      k.cylinder(group, x, 21.1, z, 0.6, 1.1, 0xc3a47a);
      for (let side = 0; side < 4; side++) {
        const clock = new THREE.Group(); clock.position.set(x, 17.5, z); clock.rotation.y = side * Math.PI / 2; group.add(clock);
        const face = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32), k.material(0xf0e2c5));
        face.position.z = 2.92; clock.add(face);
        for (let i = 0; i < 12; i++) {
          const a = i * Math.PI / 6;
          const tick = box(clock, Math.sin(a) * 1.45, Math.cos(a) * 1.45, 2.94, 0.09, 0.2, 0.04, 0x534b36); tick.rotation.z = -a;
        }
        box(clock, 0, 0.55, 2.97, 0.09, 1.1, 0.04, 0x453e2c);
        const hand = box(clock, 0.35, 0.15, 2.98, 0.8, 0.1, 0.04, 0x453e2c); hand.rotation.z = 0.4;
      }
      sign(group, "ساعة الديرة · DEERA CLOCK", x, 3, z - 1.9, 3.2, Math.PI, "#79603f");
    } else if (l.kind === "crane") {
      for (const side of [-1, 1]) {
        const tower = k.cylinder(group, x + side * 8, 10, z, 4.5, 20, 0x8e5943);
        tower.material = surface("brick", 0x9b6149);
        pitched(group, x + side * 8, 20, z, 9.5, 12, 5, 0x4e4d43, k);
        for (let y = 5; y < 19; y += 5)
          box(group, x + side * 8, y, z - 4.45, 1.2, 2, 0.16, 0x283838);
      }
      box(group, x, 11, z - 2, 8, 22, 12, 0x3d3c30).material = surface("timber", 0x63584b);
      pitched(group, x, 22, z - 2, 9, 13, 7, 0x333d36, k);
      box(group, x, 15, z - 9, 7, 12, 8, 0x363a30).material = surface("timber", 0x5a5147);
      pitched(group, x, 21, z - 9, 8, 8, 6, 0x363a30, k);
      for (let y = 4; y < 22; y += 2.5)
        box(group, x, y, z - 13.1, 7.2, 0.18, 0.14, 0x73644a);
      for (const side of [-1, 1]) {
        box(group, x + side * 3.2, 14, z - 13.2, 0.16, 15, 0.2, 0x8e7657);
        box(group, x + side * 1.7, 9, z - 13.3, 1.9, 3.2, 0.1, 0x111f1e);
      }
      sign(group, "ŻURAW · GDAŃSK", x, 3, z - 13.4, 4.8, Math.PI, "#4b5142");
    } else if (l.kind === "townhall") {
      const base = box(group, x, 10, z, 28, 20, 18, 0x995a42);
      base.material = surface("brick", 0x995a42);
      pitched(group, x, 20, z, 29, 19, 7, 0x765444, k);
      for (let y = 5; y < 19; y += 4)
        for (let dx = -10; dx <= 10; dx += 4)
          box(group, x + dx, y, z + 9.1, 1.5, 2.6, 0.12, 0x30413e);
      const tower = box(group, x, 22, z + 3, 7, 44, 7, 0x9c5f47);
      tower.material = surface("brick", 0x9c5f47);
      for (const y of [18, 28, 38, 44])
        box(group, x, y, z + 3, 7.6, 0.4, 7.6, 0xc2ad8b);
      k.cylinder(group, x, 47, z + 3, 3.5, 6, 0x4f766b);
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(3.1, 18, 8),
        k.material(0x4c796d),
      );
      spire.position.set(x, 59, z + 3);
      spire.castShadow = true;
      group.add(spire);
      const dial = new THREE.Mesh(
        new THREE.CircleGeometry(1.6, 32),
        k.material(0xe6d6aa),
      );
      dial.position.set(x, 36, z + 6.56);
      group.add(dial);
      for (const [angle, len] of [
        [-0.4, 1.2],
        [1.9, 0.9],
      ]) {
        const hand = box(group, x, 36, z + 6.6, 0.1, len, 0.03, 0x273b36);
        hand.rotation.z = angle;
        hand.position.y += (Math.cos(angle) * len) / 2;
        hand.position.x -= (Math.sin(angle) * len) / 2;
      }
      sign(group, "RATUSZ GŁÓWNEGO MIASTA", x, 3, z + 9.15, 5.5, 0, "#415346");
    } else if (l.kind === "gate") {
      // Four real passages remain open beneath the upper storeys.
      const facade = box(group, x, 12.5, z, 47, 12, 12, 0xc0aa81, true);
      facade.material = surface("plaster", 0xd4c098);
      for (let i = 0; i < 5; i++)
        box(group, x - 23 + i * 11.5, 3.3, z, 2.2, 6.6, 12, 0xbaa580, true);
      for (let i = 0; i < 4; i++) {
        const ax = x - 17.25 + i * 11.5,
          arch = new THREE.Mesh(
            new THREE.TorusGeometry(4.1, 0.5, 5, 20, Math.PI),
            k.material(0xd5c19a),
          );
        arch.position.set(ax, 4.8, z - 6.1);
        group.add(arch);
        for (const y of [9.5, 14.3])
          for (const dx of [-2.5, 2.5])
            box(group, ax + dx, y, z - 6.1, 1.7, 2.7, 0.16, 0x3a5552);
        pitched(group, ax, 18.8, z, 10.5, 13, 5, 0x675b47, k);
        for (let j = 0; j < 3; j++)
          box(
            group,
            ax,
            20 + j * 0.9,
            z - 6.7,
            6 - j * 1.6,
            0.3,
            0.4,
            0xd2bd92,
          );
      }
      sign(group, "ZIELONA BRAMA", x, 17.1, z - 6.3, 6, Math.PI, "#68705c");
    } else if (l.kind === "kingdom") {
      const shape = new THREE.Shape();
      shape.moveTo(-21.5, 0);
      shape.lineTo(21.5, 0);
      shape.lineTo(16, 112);
      shape.lineTo(-16, 112);
      shape.closePath();
      const opening = new THREE.Path();
      opening.moveTo(-12, 108);
      opening.lineTo(12, 108);
      opening.bezierCurveTo(13, 96, 8, 85, 0, 83);
      opening.bezierCurveTo(-8, 85, -13, 96, -12, 108);
      opening.closePath();
      shape.holes.push(opening);
      slab(group, shape, 29, 0x76939d, x, 0, z, k).material = glazing(0x99aeb4);
      for (let y = 4; y < 79; y += 3.3)
        for (const side of [-1, 1])
          box(
            group,
            x,
            y,
            z + side * 14.57,
            42 - y * 0.09,
            0.11,
            0.12,
            0xa0adb1,
          );
      for (const side of [-1, 1]) for (let dx = -18; dx <= 18; dx += 4.5)
        box(group, x + dx, 39, z + side * 14.63, .085, 77, .08, 0xb3bdba);
      for (const side of [-1, 1])
        box(group, x + side * 14, 98, z, 0.35, 20, 29.3, 0xb1bab8);
      box(group, x, 110, z, 31.9, 0.9, 29.4, 0xb7c5c2);
      sign(group, "KINGDOM CENTRE", x, 5, z - 14.7, 23, Math.PI, "#3b575c");
    } else if (l.kind === "faisaliyah") {
      const shape = new THREE.Shape();
      shape.moveTo(-17, 0);
      shape.lineTo(17, 0);
      shape.lineTo(2, 95);
      shape.lineTo(-2, 95);
      shape.closePath();
      slab(group, shape, 24, 0x577d87, x, 0, z, k).material = glazing(0x81959e);
      for (let y = 5; y < 70; y += 4) {
        const width = 34 * (1 - y / 104);
        for (const side of [-1, 1])
          box(group, x, y, z + side * 12.1, width, 0.18, 0.16, 0xaab7b4);
      }
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(4.5, 24, 16),
        k.material(0xc1a269, 0.25, 0.7),
      );
      globe.position.set(x, 78, z - 12.2);
      group.add(globe);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 12, 4),
        k.material(0xb8c5be),
      );
      tip.position.set(x, 98, z);
      group.add(tip);
      sign(group, "AL FAISALIYAH", x, 4, z - 12.3, 21, Math.PI, "#39555c");
    } else {
      for (const dx of [-20, 20])
        for (const dz of [-16, 16]) {
          const tower = k.cylinder(group, x + dx, 5, z + dz, 4.1, 10, 0xb99b71);
          tower.material = surface("plaster", 0xc5a77f);
          k.cylinder(group, x + dx, 10.2, z + dz, 4.3, 1.2, 0xc4a780).material = surface("plaster", 0xc4a780);
          for (let a = 0; a < 12; a++)
            box(
              group,
              x + dx + Math.sin((a * Math.PI) / 6) * 3.9,
              11.1,
              z + dz + Math.cos((a * Math.PI) / 6) * 3.9,
              1,
              1,
              0.8,
              0xc4a780,
            );
        }
      for (const dz of [-17, 17]) {
        const wall = box(group, x, 3.8, z + dz, 41, 7.6, 2, 0xb89a71);
        wall.material = surface("plaster", 0xc2a27b);
        crenels(group, x, z + dz, 40, 8.2, k);
      }
      for (const dx of [-21, 21]) {
        box(group, x + dx, 3.8, z, 2, 7.6, 31, 0xc2a27b).material = surface("plaster", 0xc2a27b);
        crenels(group, x + dx, z, 30, 8.2, k, "z");
      }
      box(group, x, 2.3, z - 18.15, 4.4, 4.6, 0.35, 0x5d4932).material = surface("timber", 0x76604b);
      for (let i = -2; i <= 2; i++)
        box(group, x + i * 0.8, 2.3, z - 18.35, 0.09, 4.4, 0.08, 0x8d7050);
      for (const dx of [-12, -6, 6, 12]) {
        const vent = new THREE.Mesh(
          new THREE.ConeGeometry(0.3, 0.5, 3),
          k.material(0x554c35),
        );
        vent.rotation.x = Math.PI / 2;
        vent.position.set(x + dx, 6, z - 18.07);
        group.add(vent);
      }
      sign(group, "AL MASMAK", x, 6, z - 18.4, 4.8, Math.PI, "#7d684b");
    }
  }
}

export function modernArchitecture(
  g: THREE.Group,
  b: {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    color: number;
    hero?: boolean;
  },
  k: StreetKit,
) {
  const { x, z, w, d, h } = b,
    box = k.box;
  const mass = box(g, x, h / 2, z, w, h, d, 0x738c90, true);
  mass.material = glazing(b.color % 2 ? 0x7d939a : 0x647e87);
  for (let y = 4; y < h - 1; y += 3.5) {
    box(g, x, y, z, w + 0.15, 0.18, d + 0.15, 0xa6afaa);
    for (const side of [-1, 1])
      for (let dz = -d / 2 + 1.8; dz < d / 2; dz += 2.8)
        box(
          g,
          x + side * (w / 2 + 0.08),
          y - 1.5,
          z + dz,
          0.13,
          2.8,
          2.2,
          Math.round(dz) % 3 ? 0x41676f : 0x587d83,
        );
  }
  for (const side of [-1, 1]) {
    for (let dx = -w / 2 + 2; dx < w / 2; dx += 3.6)
      box(g, x + dx, h / 2, z + side * (d / 2 + .12), .13, h - .8, .24, 0xb7bdb6);
    box(
      g,
      x + side * (w / 2 + 0.15),
      h / 2,
      z - d / 2 + 0.4,
      0.28,
      h,
      0.5,
      0xc3c1ae,
    );
    box(
      g,
      x + side * (w / 2 + 0.15),
      h / 2,
      z + d / 2 - 0.4,
      0.28,
      h,
      0.5,
      0xc3c1ae,
    );
  }
  box(g, x, h + 0.4, z, w + 0.5, 0.8, d + 0.5, 0xbfbda9);
  const podium = box(g, x, 1.65, z, w + .4, 3.3, d + .4, 0xc9bea6);
  podium.material = surface("stone", 0xc9bea6);
  box(g, x, h + 1, z, w * 0.45, 1.5, d * 0.5, 0x8e9e96);
  for (const side of [-1, 1]) {
    box(g, x + side * (w / 2 + 0.08), 1.7, z, 0.15, 3.2, d - 1, 0x304c52);
    box(g, x + side * (w / 2 + 1), 3.6, z, 2.5, 0.18, d + 0.4, 0xc6b795);
  }
  if (b.hero)
    sign(
      g,
      "OLAYA · RIYADH",
      x + (x > 1000 ? -1 : 1) * (w / 2 + 0.2),
      4.4,
      z,
      8,
      ((x > 1000 ? -1 : 1) * Math.PI) / 2,
      "#466062",
    );
}
