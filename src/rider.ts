import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import modelUrl from "./assets/rider-base.glb?url";
import type { Skater, Controls } from "./physics";
import { createHijab } from "./headwear";
import { createSkateHelmet, attachProtectivePads, FAIR_SKIN_TONES } from "./safety-gear";

type Pose = { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 };
const up = new THREE.Vector3(0, 1, 0);
function aim(bone: THREE.Bone, child: THREE.Bone, target: THREE.Vector3) {
  const position = bone.getWorldPosition(new THREE.Vector3()),
    from = child.getWorldPosition(new THREE.Vector3()).sub(position),
    to = target.clone().sub(position);
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return;
  const q = new THREE.Quaternion()
    .setFromUnitVectors(from.normalize(), to.normalize())
    .multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  bone.quaternion.copy(
    bone
      .parent!.getWorldQuaternion(new THREE.Quaternion())
      .invert()
      .multiply(q),
  );
  bone.updateWorldMatrix(false, true);
}
function orient(bone: THREE.Bone, world: THREE.Quaternion) {
  bone.quaternion.copy(
    bone
      .parent!.getWorldQuaternion(new THREE.Quaternion())
      .invert()
      .multiply(world),
  );
  bone.updateWorldMatrix(false, true);
}
export function solve(
  hip: THREE.Bone,
  knee: THREE.Bone,
  ankle: THREE.Bone,
  target: THREE.Vector3,
  pole: THREE.Vector3,
) {
  const a = hip.getWorldPosition(new THREE.Vector3()),
    b = knee.getWorldPosition(new THREE.Vector3()),
    c = ankle.getWorldPosition(new THREE.Vector3());
  const l1 = a.distanceTo(b),
    l2 = b.distanceTo(c),
    direction = target.clone().sub(a);
  const distance = Math.max(
    0.01,
    Math.min(direction.length(), l1 + l2 - 0.002),
  );
  direction.normalize();
  const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance),
    height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const bend = pole
    .clone()
    .addScaledVector(direction, -pole.dot(direction))
    .normalize();
  const joint = a
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(bend, height);
  aim(hip, knee, joint);
  aim(knee, ankle, target);
}

export async function createRider(outfit: number) {
  const gltf = await new GLTFLoader().loadAsync(modelUrl);
  const group = new THREE.Group(),
    body = new THREE.Group();
  group.add(body);
  body.add(gltf.scene);
  body.position.y = 0.13;
  let skin: THREE.SkinnedMesh | undefined;
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) skin = o;
  });
  if (!skin) throw Error("The rider mesh did not contain its skeleton.");
  const mesh: THREE.SkinnedMesh = skin;
  mesh.skeleton.pose();
  group.updateMatrixWorld(true);
  const poses = new Map<THREE.Bone, Pose>();
  mesh.skeleton.bones.forEach((b) =>
    poses.set(b, {
      p: b.position.clone(),
      q: b.quaternion.clone(),
      s: b.scale.clone(),
    }),
  );
  const bone = (name: string) => {
    const b = mesh.skeleton.bones.find((n) => n.name === name);
    if (!b) throw Error(`Missing rider joint ${name}`);
    return b;
  };
  const root = bone("Skeleton_torso_joint_1");
  const legs = [
    ["leg_joint_L_1", "leg_joint_L_2", "leg_joint_L_3"],
    ["leg_joint_R_1", "leg_joint_R_2", "leg_joint_R_3"],
  ].map((names) => names.map(bone));
  const arms = [
    [
      "Skeleton_arm_joint_L__4_",
      "Skeleton_arm_joint_L__3_",
      "Skeleton_arm_joint_L__2_",
    ],
    [
      "Skeleton_arm_joint_R",
      "Skeleton_arm_joint_R__2_",
      "Skeleton_arm_joint_R__3_",
    ],
  ].map((names) => names.map(bone));
  const footRotations = legs.map((l) =>
    l[2].getWorldQuaternion(new THREE.Quaternion()),
  );
  const positions = mesh.geometry.getAttribute("position"),
    colors = new Float32Array(positions.count * 3);
  const cloth = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0,
  });
  mesh.material = cloth;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  function setOutfit(color: number) {
    const shirt = new THREE.Color(color),
      trousers = new THREE.Color(0x263b49),
      skinColor = new THREE.Color(FAIR_SKIN_TONES[0]),
      lipColor = new THREE.Color(0xb77d79),
      cheekColor = new THREE.Color(0xc58e85),
      browColor = new THREE.Color(0x7b665c),
      gloves = new THREE.Color(0x26312e),
      stripe = new THREE.Color(0xc5cdc3);
    const colorAt = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i),
        h = positions.getY(i) / 1.78;
      colorAt.copy(h > 0.86 ? skinColor : h > 0.57 ? shirt : trousers);
      if (h > 0.86 && z > 0.1) {
        const y = positions.getY(i);
        const soft = (dx: number, dy: number, w: number, height: number) => Math.exp(-((dx / w) ** 2 + (dy / height) ** 2));
        colorAt.lerp(cheekColor, soft(Math.abs(x) - 0.047, y - 1.628, 0.025, 0.022) * 0.13);
        colorAt.lerp(lipColor, soft(x, y - 1.592, 0.026, 0.005) * 0.52);
        colorAt.lerp(browColor, soft(Math.abs(x) - 0.035, y - (1.671 - Math.abs(x - 0.035) * 0.07), 0.02, 0.003) * 0.62);
      }
      if (Math.abs(x) > 0.47 || h < 0.095) colorAt.copy(gloves);
      if (h > 0.64 && h < 0.8 && Math.abs(x) < 0.009 && z > 0.07)
        colorAt.copy(gloves);
      if (h > 0.77 && h < 0.779 && z < -0.045) colorAt.copy(stripe);
      colorAt.multiplyScalar(1 + Math.sin(h * 430 + x * 170) * 0.025);
      colors.set([colorAt.r, colorAt.g, colorAt.b], i * 3);
    }
    mesh.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }
  setOutfit(outfit);
  const rubber = new THREE.MeshStandardMaterial({
      color: 0x252d2b,
      roughness: 0.88,
    }),
    shell = new THREE.MeshStandardMaterial({
      color: 0x354b49,
      roughness: 0.47,
    }),
    alloy = new THREE.MeshStandardMaterial({
      color: 0xadb6b0,
      metalness: 0.7,
      roughness: 0.32,
    });
  const wheels: THREE.Object3D[] = [];
  function rounded(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    r = 0.025,
  ) {
    const o = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)),
      mat,
    );
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  }
  const skates = legs.map(() => {
    const boot = new THREE.Group();
    group.add(boot);
    rounded(boot, 0.125, 0.18, 0.3, 0, 0.2, 0.035, shell);
    rounded(boot, 0.115, 0.2, 0.13, 0, 0.28, -0.055, rubber);
    rounded(boot, 0.13, 0.035, 0.31, 0, 0.112, 0.03, rubber, 0.01);
    for (const z of [-0.08, 0.08])
      rounded(boot, 0.064, 0.042, 0.12, 0, 0.093, z, alloy, 0.008);
    for (const y of [0.21, 0.29]) {
      rounded(boot, 0.14, 0.022, 0.15, 0, y, -0.025, rubber, 0.007);
      rounded(boot, 0.04, 0.034, 0.025, 0.075, y, -0.025, alloy, 0.006);
    }
    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Group();
      wheel.position.set(0, 0.042, -0.105 + i * 0.09);
      boot.add(wheel);
      wheels.push(wheel);
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.041, 0.041, 0.032, 20),
        rubber,
      );
      tire.rotation.z = Math.PI / 2;
      wheel.add(tire);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.019, 0.019, 0.034, 12),
        alloy,
      );
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
    }
    return boot;
  });
  const head = bone("Skeleton_neck_joint_2");
  group.updateMatrixWorld(true);
  mesh.computeBoundingBox();
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  for (const anchor of (mesh.userData.eyeAnchors || []) as number[][]) {
    const eye = new THREE.Group();
    eye.position.copy(
      mesh.localToWorld(
        new THREE.Vector3(...(anchor as [number, number, number])),
      ),
    );
    group.add(eye);
    const white = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2dbcf, roughness: 0.45 }),
    );
    eye.add(white);
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.005, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x493c2e, roughness: 0.35 }),
    );
    iris.position.z = 0.01;
    eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1b1918, roughness: 0.4 }));
    pupil.position.z = 0.014;
    eye.add(pupil);
    head.attach(eye);
  }
  const hijab = createHijab(bounds.max.y);
  group.add(hijab.group);
  head.attach(hijab.group);
  const helmet = createSkateHelmet(0x9fbfc9, true);
  helmet.group.position.set(0, bounds.max.y - 0.125, 0.045); group.add(helmet.group); head.attach(helmet.group);
  const guards = attachProtectivePads(group, legs, arms);
  // Fit the lower scarf to the anatomical surface and share its skin weights.
  // This replaces the floating conical drape and follows the neck/shoulder joints.
  const scarfGeometry = mesh.geometry.clone();
  const scarfPositions = scarfGeometry.getAttribute("position"),
    scarfNormals = scarfGeometry.getAttribute("normal"),
    scarfUV = new Float32Array(scarfPositions.count * 2),
    scarfIndices: number[] = [], sourceIndex = mesh.geometry.index!;
  for (let i = 0; i < sourceIndex.count; i += 3) {
    const triangle = [sourceIndex.getX(i), sourceIndex.getX(i + 1), sourceIndex.getX(i + 2)];
    if (Math.min(...triangle.map(j => positions.getY(j))) < 1.62 &&
        Math.max(...triangle.map(j => positions.getY(j))) > 1.28 &&
        Math.min(...triangle.map(j => Math.abs(positions.getX(j)))) < 0.26)
      scarfIndices.push(...triangle);
  }
  for (let i = 0; i < scarfPositions.count; i++) {
    const thickness = 0.003 + Math.sin(positions.getY(i) * 130 + positions.getX(i) * 70) * 0.0005;
    scarfPositions.setXYZ(i, positions.getX(i) + scarfNormals.getX(i) * thickness,
      positions.getY(i) + scarfNormals.getY(i) * thickness,
      positions.getZ(i) + scarfNormals.getZ(i) * thickness);
    scarfUV.set([positions.getX(i) * 3, positions.getY(i) * 3], i * 2);
  }
  scarfGeometry.setIndex(scarfIndices);
  scarfGeometry.setAttribute("uv", new THREE.BufferAttribute(scarfUV, 2));
  scarfGeometry.computeBoundingSphere();
  const scarfMaterial = hijab.cloth.clone();
  scarfMaterial.onBeforeCompile = shader => {
    shader.vertexShader = "varying vec3 vScarfRest;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvScarfRest=position;");
    shader.fragmentShader = "varying vec3 vScarfRest;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      float scarfFront=smoothstep(-0.02,0.08,vScarfRest.z);
      float scarfHem=mix(1.39+abs(vScarfRest.x)*0.32,1.31+abs(vScarfRest.x)*0.68,scarfFront)+vScarfRest.x*0.07;
      float neckTop=mix(1.59,1.522,smoothstep(0.07,0.12,vScarfRest.z));
      if(vScarfRest.y<scarfHem || vScarfRest.y>neckTop || abs(vScarfRest.x)>0.22) discard;
    `);
  };
  const shoulderWrap = new THREE.SkinnedMesh(scarfGeometry, scarfMaterial);
  shoulderWrap.name = "Body-fitted hijab neck and shoulder fabric";
  shoulderWrap.position.copy(mesh.position);
  shoulderWrap.quaternion.copy(mesh.quaternion);
  shoulderWrap.scale.copy(mesh.scale);
  mesh.parent!.add(shoulderWrap);
  shoulderWrap.bind(mesh.skeleton, mesh.bindMatrix);
  shoulderWrap.frustumCulled = false;
  shoulderWrap.receiveShadow = true;
  const pole = new THREE.Vector3(0, 0, 1),
    worldQ = new THREE.Quaternion(),
    desiredFoot = new THREE.Vector3();
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext("2d")!,
    gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  gradient.addColorStop(0, "rgba(0,0,0,.5)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(shadowCanvas),
    transparent: true,
    depthWrite: false,
    color: 0x101915,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.65), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  group.add(shadow);
  let wheelAngle = 0, tuckBlend = 0, airBlend = 0, grabBlend = 0;
  return {
    group,
    setOutfit,
    vertexCount: positions.count,
    appearance: {
      skinTone: "fair",
      headwear: "hijab",
      accessory: "paisley bandana over hijab",
      bandanaStyle: hijab.style,
      helmet: "vented skate helmet over hijab and bandana",
      guards: guards.map(guard => guard.name),
    },
    animate(
      s: Skater,
      c: Controls,
      dt: number,
      groundHeight: (x: number, z: number) => number | null,
      cinematic = false,
    ) {
      poses.forEach((pose, b) => {
        b.position.copy(pose.p);
        b.quaternion.copy(pose.q);
        b.scale.copy(pose.s);
      });
      const blend = 1 - Math.exp(-dt * 14);
      tuckBlend += ((!cinematic ? s.grinding ? 0.85 : c.crouch ? 1 : 0 : 0) - tuckBlend) * blend;
      airBlend += ((!cinematic && !s.grounded && !s.grinding ? 1 : 0) - airBlend) * blend;
      grabBlend += ((!cinematic && s.grabbing ? 1 : 0) - grabBlend) * blend;
      const tuck = tuckBlend,
        compression = cinematic ? 0 : s.landingCompression;
      const physicalPosition = s.body.translation();
      const floor = groundHeight(physicalPosition.x, physicalPosition.z);
      shadow.visible = floor !== null && !s.grinding;
      if (floor !== null) {
        shadow.position.copy(group.worldToLocal(new THREE.Vector3(physicalPosition.x, floor + 0.012, physicalPosition.z)));
        shadow.quaternion.copy(group.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))));
        const height = Math.max(0, physicalPosition.y - 0.83 - floor);
        shadowMat.opacity = Math.max(0.1, 1 - height * 0.5);
        shadow.scale.setScalar(1 + height * 0.3);
      }
      body.position.y =
        0.13 - tuck * 0.17 - compression * 0.11 - (s.bailTimer > 0 ? 0.08 : 0);
      body.rotation.set(
        cinematic ? 0 : 0.1 + tuck * 0.22 + (s.bailTimer > 0 ? 0.22 : 0),
        -0.01,
        cinematic ? 0 : -s.leanAngle * 0.65,
      );
      group.updateMatrixWorld(true);
      group.getWorldQuaternion(worldQ);
      const forward = pole.clone().applyQuaternion(worldQ);
      legs.forEach((l, i) => {
        const side = i === 0 ? 1 : -1,
          stroke = Math.sin(s.pushPhase + i * Math.PI),
          pushing = !cinematic && s.grounded ? c.throttle : 0;
        const outward = Math.max(0, stroke) * 0.17 * pushing,
          lift = Math.max(0, -stroke) * 0.07 * pushing;
        desiredFoot.set(
          side * (0.12 + outward),
          0.25 + lift,
          (i === 0 ? -0.05 : 0.05) + stroke * 0.11 * pushing,
        );
        desiredFoot.y += airBlend * (0.2 + tuck * 0.1) + grabBlend * (i === 0 ? 0.23 : 0.1);
        desiredFoot.z -= airBlend * 0.17 + grabBlend * (s.grabPose === "tweak" ? side * 0.17 : 0.06);
        desiredFoot.x += s.slideAmount * side * 0.16;
        if (s.grabPose === "star") {
          desiredFoot.x += grabBlend * side * 0.27;
          desiredFoot.z += grabBlend * 0.16;
        }
        if (s.grabPose === "stale") {
          desiredFoot.y += grabBlend * 0.13;
          desiredFoot.z -= grabBlend * 0.22;
        }
        if (s.grinding) {
          desiredFoot.x = side * (s.grindStyle === "Royale grind" ? 0.045 : 0.09);
          desiredFoot.z = side * 0.13;
        }
        const groundPoint = group.localToWorld(
          new THREE.Vector3(desiredFoot.x, 0, desiredFoot.z),
        );
        if (s.grounded || cinematic) {
          const floor = groundHeight(groundPoint.x, groundPoint.z);
          if (floor !== null && Math.abs(floor - group.position.y) < 0.6)
            desiredFoot.y += floor - group.position.y;
        }
        const localTarget = desiredFoot.clone(),
          target = group.localToWorld(desiredFoot.clone());
        solve(l[0], l[1], l[2], target, forward);
        const brakingYaw =
          s.grinding ? (s.grindStyle === "Royale grind" ? Math.PI / 2 : i === 0 ? Math.PI / 2 : 0) :
          !cinematic && s.grounded ? (i === 1 ? s.brakePressure * 0.52 : 0) + s.slideAmount * 0.95 : 0;
        orient(
          l[2],
          worldQ
            .clone()
            .multiply(new THREE.Quaternion().setFromAxisAngle(up, brakingYaw))
            .multiply(footRotations[i]),
        );
        skates[i].position
          .copy(localTarget)
          .add(new THREE.Vector3(0, -0.25, 0));
        skates[i].rotation.set(
          -Math.atan2(s.normal.z, s.normal.y),
          brakingYaw,
          Math.atan2(s.normal.x, s.normal.y),
        );
      });
      arms.forEach((a, i) => {
        const side = i === 0 ? 1 : -1,
          arm = group.localToWorld(
            new THREE.Vector3(
              side * (s.grinding ? 0.4 : 0.28) + grabBlend * (s.grabPose === "star" ? side * 0.4 : s.grabPose === "tweak" && i === 1 ? 0.25 : 0),
              1.02 - grabBlend * (s.grabPose === "star" ? -0.24 : i === 0 ? 0.32 : -0.15),
              0.05 + grabBlend * (s.grabPose === "stale" ? -0.35 : 0.2) + Math.sin(s.pushPhase + i * Math.PI) * 0.055 * s.pushStrength,
            ),
          );
        solve(a[0], a[1], a[2], arm, forward.clone().negate());
      });
      wheelAngle += (s.speed * dt) / 0.041;
      wheels.forEach((w) => (w.rotation.x = wheelAngle));
      mesh.skeleton.update();
      hijab.animate(s.speed, s.pushPhase, s.leanAngle);
    },
  };
}
