import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import modelUrl from "./assets/rider-base.glb?url";
import { CrowdDirector, type CrowdPerson, type CrowdPlayer } from "./crowd";
import { solve } from "./rider";
import { RAPIER } from "./physics";

const colors = [0xd58759, 0x799fb1, 0xb6a0bb, 0x71865d, 0xe0c271, 0x9ab1a2, 0xc27170, 0xd9d2bd];
const skinColors = [0xd7ab8e, 0x986849, 0xc39370, 0xe7c4ad, 0x735043, 0xba8b67];
const up = new THREE.Vector3(0, 1, 0);

/** Shared anatomical mesh near the player; instanced articulated silhouettes farther away. */
export async function createCrowd(scene: THREE.Scene, world: RAPIER.World, playerBody: RAPIER.RigidBody, mobile: boolean) {
  const director = new CrowdDirector(mobile ? 44 : 84);
  const source = (await new GLTFLoader().loadAsync(modelUrl)).scene;
  let base: THREE.SkinnedMesh | undefined;
  source.traverse(o => { if (o instanceof THREE.SkinnedMesh) base = o; });
  if (!base) throw Error("NPC anatomy did not contain a skeleton");
  const geometries = colors.map((color, palette) => {
    const g = base!.geometry.clone(), position = g.getAttribute("position"), c = new Float32Array(position.count * 3);
    const shirt = new THREE.Color(color), skin = new THREE.Color(skinColors[palette % skinColors.length]);
    const trousers = new THREE.Color(palette % 3 ? 0x344754 : 0x4e423d), trim = new THREE.Color(0xded8c4);
    for (let i = 0; i < position.count; i++) {
      const h = position.getY(i) / 1.78, x = position.getX(i), z = position.getZ(i);
      const tint = (h > 0.86 || Math.abs(x) > 0.48 ? skin : h > 0.57 ? shirt : trousers).clone();
      if (h > 0.71 && h < 0.74) tint.lerp(trim, 0.65);
      if (h < 0.095) tint.setHex(0x26302f);
      if (h > 0.89 && z > 0.1 && Math.abs(x) < 0.03 && position.getY(i) < 1.61) tint.multiplyScalar(0.8);
      c.set([tint.r, tint.g, tint.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g;
  });
  const bodyMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x283c40, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe5dfd0, roughness: 0.7 });
  const helmets = colors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.65 }));
  const capGeometry = new THREE.SphereGeometry(0.106, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const bootGeometry = new THREE.BoxGeometry(0.12, 0.14, 0.29);
  const wheelGeometry = new THREE.CylinderGeometry(0.038, 0.038, 0.035, 8);
  const wheelParts = Array.from({ length: 4 }, (_, n) => wheelGeometry.clone().rotateZ(Math.PI / 2).translate(0, 0.037, -0.105 + n * 0.07));
  const skateGeometry = mergeGeometries([bootGeometry.clone().translate(0, 0.12, 0), ...wheelParts]);
  const shoeGeometry = bootGeometry.clone().translate(0, 0.1, 0);
  const rigs = Array.from({ length: mobile ? 10 : 20 }, () => {
    const group = new THREE.Group(), body = clone(source); group.add(body); scene.add(group);
    let mesh!: THREE.SkinnedMesh; body.traverse(o => { if (o instanceof THREE.SkinnedMesh) mesh = o; });
    mesh.material = bodyMaterial; mesh.frustumCulled = false; mesh.castShadow = !mobile;
    mesh.skeleton.pose(); group.updateMatrixWorld(true);
    const poses = mesh.skeleton.bones.map(b => ({ b, q: b.quaternion.clone(), p: b.position.clone() }));
    const bone = (name: string) => mesh.skeleton.bones.find(b => b.name === name)!;
    const legs = [["leg_joint_L_1", "leg_joint_L_2", "leg_joint_L_3"], ["leg_joint_R_1", "leg_joint_R_2", "leg_joint_R_3"]].map(names => names.map(bone));
    const arms = [["Skeleton_arm_joint_L__4_", "Skeleton_arm_joint_L__3_", "Skeleton_arm_joint_L__2_"], ["Skeleton_arm_joint_R", "Skeleton_arm_joint_R__2_", "Skeleton_arm_joint_R__3_"]].map(names => names.map(bone));
    const head = bone("Skeleton_neck_joint_2");
    const headwear = new THREE.Mesh(capGeometry, dark); headwear.position.set(0, 1.69, -0.005); group.add(headwear); head.attach(headwear);
    const eyes = new THREE.Group(); group.add(eyes);
    for (const anchor of (mesh.userData.eyeAnchors || []) as number[][]) {
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), dark); pupil.position.set(anchor[0], anchor[1], anchor[2] + 0.004); eyes.add(pupil);
    }
    head.attach(eyes);
    const boots = legs.map(() => {
      const g = new THREE.Mesh(skateGeometry, dark); group.add(g); return { group: g };
    });
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.12, 0.012), dark); group.add(phone);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.1, 8), white); group.add(cup);
    group.visible = false;
    return { group, mesh, poses, legs, arms, boots, headwear, head, body, phone, cup, assigned: -1 };
  });
  const capacity = director.budget;
  const distant = new THREE.Group(); scene.add(distant);
  function instances(geometry: THREE.BufferGeometry, count: number, material: THREE.Material = bodyMaterial) {
    const m = new THREE.InstancedMesh(geometry, material, count); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; distant.add(m); return m;
  }
  // Tapered torso, separate upper/lower limbs and shoes replace the old four capsules.
  const torso = instances(new THREE.CylinderGeometry(0.21, 0.15, 0.55, 8), capacity, new THREE.MeshStandardMaterial({ roughness: 0.9 }));
  const heads = instances(new THREE.SphereGeometry(1, 10, 8), capacity, new THREE.MeshStandardMaterial({ roughness: 0.9 }));
  const limbs = instances(new THREE.CapsuleGeometry(1, 1, 2, 6), capacity * 8, new THREE.MeshStandardMaterial({ color: 0x344754, roughness: 0.9 }));
  const shoes = instances(new THREE.BoxGeometry(1, 1, 1), capacity * 2, dark);
  const caps = instances(capGeometry, capacity, dark);
  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 32;
  const shadowContext = shadowCanvas.getContext("2d")!, gradient = shadowContext.createRadialGradient(16, 16, 1, 16, 16, 16);
  gradient.addColorStop(0, "rgba(12,24,26,.45)"); gradient.addColorStop(1, "rgba(12,24,26,0)");
  shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 32, 32);
  const shadows = instances(new THREE.PlaneGeometry(0.9, 0.65).rotateX(-Math.PI / 2), capacity,
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  const dummy = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0), vec = new THREE.Vector3(), axis = new THREE.Vector3();
  const point = (p: CrowdPerson, x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyAxisAngle(up, p.heading).add(new THREE.Vector3(p.x, p.ground, p.z));
  function place(mesh: THREE.InstancedMesh, i: number, position: THREE.Vector3, scale: number[], yaw = 0) {
    dummy.position.copy(position); dummy.rotation.set(0, yaw, 0); dummy.scale.set(scale[0], scale[1], scale[2]); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
  }
  function segment(i: number, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
    vec.copy(b).sub(a); dummy.position.copy(a).add(b).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(up, axis.copy(vec).normalize()); dummy.scale.set(radius, vec.length() / 3, radius); dummy.updateMatrix(); limbs.setMatrixAt(i, dummy.matrix);
  }
  let visible: CrowdPerson[] = [], simulationAccumulator = 0, previousTime = 0;
  const before = new Map<number, { x: number; z: number; phase: number; heading: number }>();
  const ray = new RAPIER.Ray({ x: 0, y: 2, z: 0 }, { x: 0, y: -1, z: 0 });
  function probe(x: number, z: number, fromX: number, fromZ: number) {
    const dx = x - fromX, dz = z - fromZ, length = Math.hypot(dx, dz);
    if (length > 0.001) {
      const ahead = new RAPIER.Ray({ x: fromX, y: 0.7, z: fromZ }, { x: dx / length, y: 0, z: dz / length });
      if (world.castRay(ahead, length + 0.5, true, undefined, undefined, undefined, playerBody)) return null;
    }
    ray.origin.x = x; ray.origin.z = z;
    const hit = world.castRay(ray, 2.3, true, undefined, undefined, undefined, playerBody);
    return hit ? 2 - hit.timeOfImpact : null;
  }
  function animateRig(rig: typeof rigs[number], p: CrowdPerson, player: CrowdPlayer) {
    const palette = p.id % colors.length, skating = p.role === "skater";
    rig.assigned = p.id; rig.group.visible = true; rig.mesh.geometry = geometries[palette]; rig.headwear.material = skating ? helmets[palette] : dark;
    rig.poses.forEach(({ b, q, p }) => { b.quaternion.copy(q); b.position.copy(p); });
    const height = 0.94 + (p.id % 5) * 0.025, stride = Math.sin(p.phase), moving = Math.min(1, p.speed / (skating ? 2 : 0.8));
    rig.group.position.set(p.x, p.ground, p.z); rig.group.rotation.y = p.heading; rig.group.scale.set(1, height, 1);
    rig.body.position.y = skating ? 0.07 : Math.abs(stride) * 0.025 * moving + 0.025;
    rig.group.updateMatrixWorld(true);
    const forward = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
    rig.legs.forEach((leg, i) => {
      const side = i === 0 ? 1 : -1, phase = Math.sin(p.phase + i * Math.PI);
      const local = new THREE.Vector3(side * (0.12 + (skating ? Math.max(0, phase) * 0.22 * moving : 0)), 0.22 + (skating ? Math.max(0, -phase) * 0.08 : Math.max(0, phase) * 0.1) * moving,
        skating ? phase * 0.09 * moving : phase * 0.28 * moving);
      const target = rig.group.localToWorld(local.clone()); solve(leg[0], leg[1], leg[2], target, forward);
      rig.boots[i].group.position.copy(local).add(new THREE.Vector3(0, -0.22, 0));
      rig.boots[i].group.rotation.y = skating ? side * Math.max(0, phase) * 0.25 * moving : 0;
      rig.boots[i].group.geometry = skating ? skateGeometry : shoeGeometry;
    });
    rig.arms.forEach((arm, i) => {
      const side = i === 0 ? 1 : -1, swing = Math.sin(p.phase + i * Math.PI);
      const hand = new THREE.Vector3(side * 0.27, skating ? 1.03 : 0.91, (skating ? 0.13 : 0) - swing * 0.15 * moving);
      if (p.action === "talk") { hand.y += Math.sin(p.age * 2 + i) * 0.1; hand.z = 0.2; }
      if (p.action === "phone" && i === 0) hand.set(0.12, 1.47, 0.16);
      if (p.action === "wave" || p.action === "cheer" || (p.following && p.reaction > 0)) hand.set(side * (0.35 + Math.sin(p.age * 7) * 0.09), 1.78, 0.03);
      solve(arm[0], arm[1], arm[2], rig.group.localToWorld(hand.clone()), forward.clone().negate());
      if (i === 0) { rig.phone.position.copy(hand); rig.phone.position.z += 0.025; rig.cup.position.copy(hand); rig.cup.position.y += 0.035; }
    });
    rig.phone.visible = p.action === "phone"; rig.cup.visible = p.role === "vendor" && p.action === "talk";
    if (p.distance < 12 && p.speed < 1) {
      const delta = Math.atan2(player.x - p.x, player.z - p.z) - p.heading;
      rig.head.rotateY(Math.max(-0.6, Math.min(0.6, Math.atan2(Math.sin(delta), Math.cos(delta)))));
    }
    rig.mesh.skeleton.update();
  }
  return {
    director,
    update(time: number, player: CrowdPlayer) {
      const dt = Math.max(0, Math.min(0.15, time - previousTime)); previousTime = time; simulationAccumulator += dt;
      if (!visible.length || simulationAccumulator >= 0.1) {
        for (const p of visible) before.set(p.id, { x: p.x, z: p.z, phase: p.phase, heading: p.heading });
        visible = director.update(player, simulationAccumulator, probe); simulationAccumulator = 0;
      }
      const blended = visible.map(p => {
        const old = before.get(p.id), blend = Math.min(1, simulationAccumulator / 0.1);
        if (!old || Math.hypot(old.x - p.x, old.z - p.z) > 3) return p;
        const turn = Math.atan2(Math.sin(p.heading - old.heading), Math.cos(p.heading - old.heading));
        return { ...p, x: old.x + (p.x - old.x) * blend, z: old.z + (p.z - old.z) * blend, phase: old.phase + (p.phase - old.phase) * blend, heading: old.heading + turn * blend };
      });
      const detailed = blended.filter(p => p.distance < 45).slice(0, rigs.length);
      const assigned = new Set(detailed.map(p => p.id));
      rigs.forEach((rig, i) => { if (detailed[i]) animateRig(rig, detailed[i], player); else rig.group.visible = false; });
      blended.forEach((p, i) => {
        place(shadows, i, new THREE.Vector3(p.x, p.ground + 0.012, p.z), [1, 1, 1], p.heading);
        if (assigned.has(p.id)) { torso.setMatrixAt(i, zero); heads.setMatrixAt(i, zero); caps.setMatrixAt(i, zero); for (let n = 0; n < 8; n++) limbs.setMatrixAt(i * 8 + n, zero); for (let n = 0; n < 2; n++) shoes.setMatrixAt(i * 2 + n, zero); return; }
        const color = new THREE.Color(colors[p.id % 8]), skin = new THREE.Color(skinColors[p.id % 6]);
        torso.setColorAt(i, color); heads.setColorAt(i, skin);
        place(torso, i, point(p, 0, 1.14, 0), [1, 1, 0.66], p.heading);
        place(heads, i, point(p, 0, 1.66, 0), [0.105, 0.135, 0.11], p.heading);
        place(caps, i, point(p, 0, 1.7, -0.01), [1, 1, 1], p.heading);
        for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
          const side = sideIndex === 0 ? 1 : -1, phase = Math.sin(p.phase + sideIndex * Math.PI), moving = Math.min(1, p.speed);
          const foot = point(p, side * (0.12 + (p.role === "skater" ? Math.max(0, phase) * 0.14 * moving : 0)), 0.09, phase * 0.22 * moving);
          const knee = point(p, side * 0.14, 0.53, 0.06 - phase * 0.07 * moving), hip = point(p, side * 0.12, 0.98, 0);
          const shoulder = point(p, side * 0.22, 1.37, 0), elbow = point(p, side * 0.29, p.action === "cheer" ? 1.66 : 1.09, 0.06), hand = point(p, side * 0.29, p.action === "cheer" ? 1.88 : 0.92, -phase * 0.14 * moving);
          segment(i * 8 + sideIndex * 4, hip, knee, 0.085); segment(i * 8 + sideIndex * 4 + 1, knee, foot, 0.065);
          segment(i * 8 + sideIndex * 4 + 2, shoulder, elbow, 0.06); segment(i * 8 + sideIndex * 4 + 3, elbow, hand, 0.048);
          place(shoes, i * 2 + sideIndex, foot, [0.12, 0.12, 0.28], p.heading);
        }
      });
      for (const m of [torso, heads, caps, shadows]) m.count = visible.length;
      limbs.count = visible.length * 8; shoes.count = visible.length * 2;
      for (const m of [torso, heads, caps, limbs, shoes, shadows]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    },
    get diagnostics() { return { visible: visible.length, detailed: rigs.filter(r => r.group.visible).length, residents: director.people.length, reactions: director.reactions, yields: director.yields, following: director.follower?.name ?? null,
      actions: visible.reduce((counts, p) => { counts[p.action] = (counts[p.action] || 0) + 1; return counts; }, {} as Record<string, number>),
      sample: visible.slice(0, 12).map(p => ({ id: p.id, x: p.x, z: p.z, role: p.role, action: p.action, speed: p.speed, traveled: p.traveled })) }; },
  };
}
