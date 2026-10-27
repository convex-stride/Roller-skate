import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const FAIR_SKIN_TONES = [0xe9c8b8, 0xf0d7c8, 0xe8c5b3, 0xf2d9cd, 0xeacdbc, 0xefd1bf];
export type PadKind = "knee" | "elbow" | "wrist";
const armor = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 });
const dark = new THREE.MeshStandardMaterial({ color: 0x29353b, roughness: 0.9 });
const helmetMaterials = new Map<number, THREE.MeshStandardMaterial>();
const pads = new Map<PadKind, THREE.BufferGeometry>();
function tint(g: THREE.BufferGeometry, color: number) {
  const c = new THREE.Color(color), count = g.getAttribute("position").count, colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3)); return g;
}
export function padGeometry(kind: PadKind) {
  if (!pads.has(kind)) {
    const size = kind === "knee" ? [0.15, 0.19, 0.075, 0.076] : kind === "elbow" ? [0.11, 0.14, 0.065, 0.057] : [0.085, 0.105, 0.045, 0.041];
    const [w, h, d, radius] = size;
    const parts = [
      tint(new RoundedBoxGeometry(w + 0.018, h + 0.018, d * 0.7, 2, 0.018).translate(0, 0, radius), 0x26343a),
      tint(new RoundedBoxGeometry(w, h, d, 2, 0.024).translate(0, 0, radius + 0.018), 0x748d9b),
      tint(new THREE.BoxGeometry(w * 0.5, 0.012, 0.006).translate(0, h * 0.22, radius + d / 2 + 0.022), 0xdce8d5),
    ];
    for (const y of [-h * 0.32, h * 0.32]) parts.push(tint(new THREE.TorusGeometry(radius, 0.012, 4, 12).rotateX(Math.PI / 2).translate(0, y, 0), 0x26343a));
    const flattened = parts.map(g => g.index ? g.toNonIndexed() : g);
    const combined = mergeGeometries(flattened)!; new Set([...parts, ...flattened]).forEach(g => g.dispose()); pads.set(kind, combined);
  }
  return pads.get(kind)!;
}
function shellGeometry(vented: boolean) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [], rows = 18, cols = 32;
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
    const phi = x / cols * Math.PI * 2, theta = y / rows * (1.98 - 0.75 * Math.max(0, Math.cos(phi)) ** 0.7);
    positions.push(Math.sin(phi) * Math.sin(theta) * 0.12, Math.cos(theta) * 0.14, Math.cos(phi) * Math.sin(theta) * 0.145);
    uv.push(x / cols, y / rows);
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (vented && y >= 4 && y <= 7 && [3, 4, 11, 12, 19, 20, 27, 28].includes(x)) continue;
    const a = y * (cols + 1) + x, b = a + cols + 1; indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}
export const helmetShellGeometry = shellGeometry(true);
function strap(a: THREE.Vector3, b: THREE.Vector3) {
  const g = new THREE.BoxGeometry(0.012, a.distanceTo(b), 0.007);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}
const linerParts = [shellGeometry(false).scale(0.965, 0.965, 0.965)];
for (const side of [-1, 1]) {
  const chin = new THREE.Vector3(side * 0.035, -0.14, 0.08);
  linerParts.push(strap(new THREE.Vector3(side * 0.11, -0.025, 0.025), chin), strap(new THREE.Vector3(side * 0.1, -0.04, -0.07), chin));
}
linerParts.push(new THREE.BoxGeometry(0.065, 0.012, 0.016).translate(0, -0.14, 0.08));
export const helmetLinerGeometry = mergeGeometries(linerParts)!; linerParts.forEach(g => g.dispose());
export function createSkateHelmet(color: number, overCloth = false) {
  const group = new THREE.Group(); group.name = "Vented skate helmet with liner and chin straps";
  if (!helmetMaterials.has(color)) helmetMaterials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.48 }));
  const shell = new THREE.Mesh(helmetShellGeometry, helmetMaterials.get(color)), liner = new THREE.Mesh(helmetLinerGeometry, dark);
  shell.name = "Vented hard shell"; liner.name = "Foam liner and fastened chin straps";
  shell.castShadow = liner.castShadow = true; group.add(shell, liner);
  if (overCloth) group.scale.set(1.07, 1.21, 1.04);
  return { group, shell, setColor(value: number) { if (!helmetMaterials.has(value)) helmetMaterials.set(value, new THREE.MeshStandardMaterial({ color: value, roughness: 0.48 })); shell.material = helmetMaterials.get(value)!; } };
}
/** Fit in the rest pose, then let the existing IK bones carry each guard. */
export function attachProtectivePads(root: THREE.Group, legs: THREE.Bone[][], arms: THREE.Bone[][]) {
  const guards: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  function add(kind: PadKind, joint: THREE.Bone, end: THREE.Bone, back = false) {
    const position = joint.getWorldPosition(new THREE.Vector3());
    const y = position.clone().sub(end.getWorldPosition(new THREE.Vector3())).normalize();
    const z = new THREE.Vector3(0, 0, back ? -1 : 1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())); z.addScaledVector(y, -z.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    const guard = new THREE.Mesh(padGeometry(kind), armor); guard.name = `${kind} guard`; guard.castShadow = true;
    guard.position.copy(root.worldToLocal(position)); guard.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)).premultiply(root.getWorldQuaternion(new THREE.Quaternion()).invert());
    root.add(guard); joint.attach(guard); guards.push(guard);
  }
  legs.forEach(leg => add("knee", leg[1], leg[2]));
  arms.forEach(arm => { add("elbow", arm[1], arm[2], true); add("wrist", arm[2], arm[1], true); });
  return guards;
}
