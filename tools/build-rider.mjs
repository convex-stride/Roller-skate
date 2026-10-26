import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { readFile, writeFile } from "node:fs/promises";
// Original anatomical mesh and clothing proxy: MakeHuman core data, CC0.
// Source is retained separately from the distributable, clothed/skinned GLB.
const source = await readFile(
  new URL("./assets/makehuman-base.obj", import.meta.url),
  "utf8",
);
const vertices = [],
  groups = new Map();
let group = "";
for (const line of source.split("\n")) {
  if (line.startsWith("v "))
    vertices.push(line.trim().split(/\s+/).slice(1).map(Number));
  else if (line.startsWith("g ")) {
    group = line.slice(2).trim();
    if (!groups.has(group)) groups.set(group, []);
  } else if (line.startsWith("f "))
    groups.get(group)?.push(
      line
        .slice(2)
        .trim()
        .split(/\s+/)
        .map((v) => Number(v.split("/")[0]) - 1),
    );
}
const scale = 1.78 / (8.4913 + 8.18305),
  floor = -8.18305;
const point = (p) =>
  new THREE.Vector3(p[0] * scale, (p[1] - floor) * scale, p[2] * scale);
function joint(name) {
  const ids = [...new Set(groups.get("joint-" + name).flat())];
  return point(
    [0, 1, 2].map(
      (axis) =>
        ids.reduce((sum, id) => sum + vertices[id][axis], 0) / ids.length,
    ),
  );
}
const specs = [
  ["Skeleton_torso_joint_1", "pelvis", null],
  ["Skeleton_torso_joint_2", "spine-3", 0],
  ["torso_joint_3", "spine-1", 1],
  ["Skeleton_neck_joint_1", "neck", 2],
  ["Skeleton_neck_joint_2", "head", 3],
  ["leg_joint_L_1", "l-upper-leg", 0],
  ["leg_joint_L_2", "l-knee", 5],
  ["leg_joint_L_3", "l-ankle", 6],
  ["leg_joint_L_5", "l-foot-1", 7],
  ["leg_joint_R_1", "r-upper-leg", 0],
  ["leg_joint_R_2", "r-knee", 9],
  ["leg_joint_R_3", "r-ankle", 10],
  ["leg_joint_R_5", "r-foot-1", 11],
  ["Skeleton_arm_joint_L__4_", "l-shoulder", 2],
  ["Skeleton_arm_joint_L__3_", "l-elbow", 13],
  ["Skeleton_arm_joint_L__2_", "l-hand", 14],
  ["Skeleton_arm_joint_R", "r-shoulder", 2],
  ["Skeleton_arm_joint_R__2_", "r-elbow", 16],
  ["Skeleton_arm_joint_R__3_", "r-hand", 17],
];
const absolute = specs.map((s) => joint(s[1])),
  bones = specs.map((s) => {
    const b = new THREE.Bone();
    b.name = s[0];
    return b;
  });
specs.forEach((s, i) => {
  bones[i].position.copy(absolute[i]);
  if (s[2] !== null) {
    bones[i].position.sub(absolute[s[2]]);
    bones[s[2]].add(bones[i]);
  }
});
const kept = new Set(),
  faces = [];
for (const face of groups.get("helper-tights")) {
  faces.push(face);
  face.forEach((i) => kept.add(i));
}
for (const face of groups.get("body")) {
  const center = face
    .map((i) => vertices[i])
    .reduce((a, p) => a.map((v, j) => v + p[j] / face.length), [0, 0, 0]);
  if (center[1] > 5.93 || (Math.abs(center[0]) > 4.46 && center[1] < 4.5)) {
    faces.push(face);
    face.forEach((i) => kept.add(i));
  }
}
const ids = [...kept],
  remap = new Map(ids.map((id, i) => [id, i])),
  position = [],
  skinIndex = [],
  skinWeight = [],
  indices = [];
const segments = specs.map((s, i) => {
  const child = specs.findIndex((x) => x[2] === i);
  return {
    i,
    a: absolute[i],
    b:
      child >= 0
        ? absolute[child]
        : absolute[i].clone().add(new THREE.Vector3(0, 0.12, 0)),
  };
});
for (const id of ids) {
  const p = point(vertices[id]);
  position.push(...p.toArray());
  let candidates = segments;
  if (p.y > absolute[3].y + 0.025)
    candidates = segments.filter((s) => s.i === 3 || s.i === 4);
  else if (p.y < absolute[0].y - 0.05)
    candidates = segments.filter(
      (s) =>
        s.i === 0 || (p.x >= 0 ? s.i >= 5 && s.i <= 8 : s.i >= 9 && s.i <= 12),
    );
  else
    candidates = segments.filter(
      (s) => s.i < 5 || (p.x >= 0 ? s.i >= 13 && s.i <= 15 : s.i >= 16),
    );
  const ranked = candidates
    .map((s) => {
      const ab = s.b.clone().sub(s.a),
        t = THREE.MathUtils.clamp(
          p.clone().sub(s.a).dot(ab) / Math.max(0.001, ab.lengthSq()),
          0,
          1,
        );
      return { i: s.i, d: p.distanceTo(s.a.clone().addScaledVector(ab, t)) };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  const weights = ranked.map((r) => 1 / Math.pow(r.d + 0.025, 4)),
    sum = weights.reduce((a, b) => a + b, 0);
  const jointIds = ranked.map((r) => r.i),
    normalized = weights.map((w) => w / sum);
  while (jointIds.length < 4) {
    jointIds.push(0);
    normalized.push(0);
  }
  skinIndex.push(...jointIds);
  skinWeight.push(...normalized);
}
for (const f of faces)
  for (let i = 1; i < f.length - 1; i++)
    indices.push(remap.get(f[0]), remap.get(f[i]), remap.get(f[i + 1]));
const geometry = new THREE.BufferGeometry();
geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(position, 3),
);
geometry.setAttribute(
  "skinIndex",
  new THREE.Uint16BufferAttribute(skinIndex, 4),
);
geometry.setAttribute(
  "skinWeight",
  new THREE.Float32BufferAttribute(skinWeight, 4),
);
geometry.setIndex(indices);
geometry.computeVertexNormals();
const mesh = new THREE.SkinnedMesh(
  geometry,
  new THREE.MeshStandardMaterial({ color: 0x788775, roughness: 0.9 }),
);
mesh.name = "Between_Cities_Clothed_Rider";
mesh.add(bones[0]);
mesh.bind(new THREE.Skeleton(bones));
mesh.userData.eyeAnchors = [joint("l-eye").toArray(), joint("r-eye").toArray()];
const scene = new THREE.Scene();
scene.add(mesh);
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((data) => {
      this.result = data;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((data) => {
      this.result =
        "data:application/octet-stream;base64," +
        Buffer.from(data).toString("base64");
      this.onloadend?.();
    });
  }
};
const result = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile(
  new URL("../src/assets/rider-base.glb", import.meta.url),
  Buffer.from(result),
);
console.log(
  `Built clothed anatomical rider: ${ids.length} vertices, ${indices.length / 3} triangles, ${result.byteLength} bytes`,
);
