import * as THREE from "three";

function fabricTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#eeece7";
  x.fillRect(0, 0, 128, 128);
  // Low-contrast yarns read as cloth rather than broad plastic stripes.
  for (let i = 0; i < 128; i++) {
    x.fillStyle = i % 2 ? "rgba(76,73,68,.06)" : "rgba(255,255,252,.08)";
    x.fillRect(i, 0, 1, 128);
    x.fillRect(0, i, 128, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function bandanaTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#853d3a";
  x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 11000; i++) {
    const px = (i * 73.73) % 512, py = (i * 37.19) % 256;
    x.fillStyle = i % 2 ? "rgba(247,206,167,.055)" : "rgba(33,18,14,.06)";
    x.fillRect(px, py, 1.5, 1);
  }
  x.strokeStyle = "#c9ad8e";
  x.globalAlpha = 0.65;
  x.lineWidth = 1.5;
  for (const y of [10, 18, 238, 246]) {
    x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke();
  }
  // Faded traditional print on a broad, weathered pirate-style kerchief.
  for (let row = 0; row < 2; row++)
    for (let i = -1; i < 8; i++) {
      x.save();
      x.translate(i * 80 + row * 40, 73 + row * 109);
      x.rotate(row ? 0.35 : -0.35);
      x.beginPath(); x.moveTo(0, -23);
      x.bezierCurveTo(-25, -6, -14, 26, 4, 23);
      x.bezierCurveTo(26, 17, 13, -3, 5, 2);
      x.bezierCurveTo(-4, 8, 8, 14, 8, 7);
      x.stroke();
      for (let d = 0; d < 6; d++) {
        x.beginPath(); x.arc(-16 + d * 6, 33, 0.8, 0, Math.PI * 2); x.stroke();
      }
      x.restore();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function meshGrid(
  rows: number, cols: number,
  point: (u: number, v: number) => THREE.Vector3,
  material: THREE.Material, closed = false,
) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c <= cols; c++) {
      positions.push(...point(c / cols, r / rows).toArray());
      uv.push(c / cols, r / rows);
    }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c, b = a + cols + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // UV seams retain separate vertices; average their normals to avoid a hard cloth seam.
  if (closed) {
    const normals = geometry.getAttribute("normal");
    for (let r = 0; r <= rows; r++) {
      const a = r * (cols + 1), b = a + cols;
      const n = new THREE.Vector3().fromBufferAttribute(normals, a)
        .add(new THREE.Vector3().fromBufferAttribute(normals, b)).normalize();
      normals.setXYZ(a, n.x, n.y, n.z); normals.setXYZ(b, n.x, n.y, n.z);
    }
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

type Profile = { t: number; x: number; upper: number; lower: number; z: number };
function profileAt(profile: Profile[], t: number) {
  const i = Math.max(0, profile.findIndex((p, j) => j < profile.length - 1 && t <= profile[j + 1].t));
  const a = profile[i], b = profile[i + 1];
  const mix = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1);
  const previous = profile[Math.max(0, i - 1)], next = profile[Math.min(profile.length - 1, i + 2)];
  function blend(key: "x" | "upper" | "lower" | "z") {
    const m0 = (b[key] - previous[key]) / (b.t - previous.t);
    const m1 = (next[key] - a[key]) / (next.t - a.t);
    const f2 = mix * mix, f3 = f2 * mix, dt = b.t - a.t;
    return (2 * f3 - 3 * f2 + 1) * a[key] + (f3 - 2 * f2 + mix) * dt * m0
      + (-2 * f3 + 3 * f2) * b[key] + (f3 - f2) * dt * m1;
  }
  return {
    x: Math.max(0, blend("x")), upper: blend("upper"), lower: blend("lower"), z: blend("z"),
  };
}

export function createHijab(top: number) {
  const group = new THREE.Group();
  group.name = "Soft fitted hijab with pirate-style side-tied bandana";
  const center = top - 0.15;
  const weave = fabricTexture();
  const cloth = new THREE.MeshPhysicalMaterial({
    color: 0x56616a, map: weave, bumpMap: weave, bumpScale: 0.0006,
    roughness: 0.94, sheen: 0.35, sheenColor: 0x84909a, sheenRoughness: 0.85,
    side: THREE.DoubleSide,
  });
  const print = bandanaTexture();
  const bandMaterial = new THREE.MeshPhysicalMaterial({
    map: print, bumpMap: weave, bumpScale: 0.0008,
    roughness: 0.95, sheen: 0.2, sheenColor: 0x9d6254, sheenRoughness: 0.9,
    side: THREE.DoubleSide,
  });
  // Loft around the face, crown and nape instead of ending in a pointed helmet.
  const hoodProfile: Profile[] = [
    { t: 0, x: 0.083, upper: 0.07, lower: 0.112, z: 0.167 },
    { t: 0.18, x: 0.104, upper: 0.142, lower: 0.127, z: 0.139 },
    { t: 0.4, x: 0.106, upper: 0.157, lower: 0.137, z: 0.065 },
    { t: 0.65, x: 0.094, upper: 0.14, lower: 0.129, z: -0.014 },
    { t: 0.85, x: 0.058, upper: 0.095, lower: 0.085, z: -0.057 },
    { t: 1, x: 0, upper: 0, lower: 0, z: -0.073 },
  ];
  const cap = meshGrid(40, 80, (u, v) => {
    const a = u * Math.PI * 2, p = profileAt(hoodProfile, v);
    const fold = Math.sin(a * 8 + v * 4) * 0.0015 * Math.sin(v * Math.PI);
    return new THREE.Vector3(
      Math.cos(a) * (p.x + fold),
      center + Math.sin(a) * (Math.sin(a) > 0 ? p.upper : p.lower),
      p.z + Math.sin(a) * 0.002 - Math.abs(Math.cos(a)) * 0.035 * (1 - v),
    );
  }, cloth, true);
  cap.name = "Smooth continuous scalp and face wrap";
  group.add(cap);
  cap.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), direction = new THREE.Vector3();
  function bandPoint(u: number, v: number) {
    const a = u * Math.PI * 2, front = Math.max(0, Math.cos(a));
    const y = center + 0.032 + front * 0.06 + Math.sin(a) * 0.006
      + v * (0.065 - front * 0.012);
    direction.set(Math.sin(a), 0, Math.cos(a));
    ray.set(new THREE.Vector3(direction.x * 0.35, y, 0.03 + direction.z * 0.35), direction.clone().negate());
    const hit = ray.intersectObject(cap, false)[0];
    const point = hit?.point.clone() ?? new THREE.Vector3(direction.x * 0.105, y, 0.03 + direction.z * 0.11);
    const crease = Math.sin(v * Math.PI * 5 + a * 0.8) * 0.0012;
    return point.addScaledVector(direction, 0.0035 + crease);
  }
  const band = meshGrid(12, 96, bandPoint, bandMaterial, true);
  band.name = "Broad fitted pirate-style kerchief wrap";
  group.add(band);
  const knotPoint = bandPoint(0.29, 0.42).add(new THREE.Vector3(0.008, 0, -0.003));
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 20, 12), bandMaterial);
  knot.name = "Soft cloth side knot";
  knot.position.copy(knotPoint); knot.scale.set(0.85, 0.7, 1.2);
  knot.castShadow = true; group.add(knot);
  const tails = new THREE.Group();
  tails.name = "Unequal pointed pirate bandana tails";
  tails.position.copy(knotPoint); group.add(tails);
  for (const side of [-1, 1]) {
    const tail = meshGrid(24, 8, (u, v) => {
      const width = (0.035 + Math.sin(v * Math.PI) * 0.027) * (1 - v * 0.55);
      return new THREE.Vector3(
        side * v * 0.024 + (u - 0.5) * width,
        -v * (side > 0 ? 0.25 : 0.19) + Math.abs(u - 0.5) * 0.035 * Math.pow(v, 5),
        -v * 0.055 - Math.sin(v * Math.PI) * 0.023 + Math.sin(u * Math.PI * 2 + v * 6) * 0.003,
      );
    }, bandMaterial);
    tail.name = "Folded tapered bandana tail";
    tail.rotation.z = side * 0.08; tails.add(tail);
  }
  return {
    group, cloth,
    style: "pirate-style side-tied bandana",
    animate(speed: number, phase: number, lean: number) {
      tails.rotation.z = Math.sin(phase * 0.45) * 0.035 * Math.min(1, speed / 8) + lean * 0.1;
      tails.rotation.x = Math.min(0.14, speed * 0.008);
    },
  };
}
