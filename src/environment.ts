import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { centers, hash, streets, type Building, type City } from "./world";
import { inHeritageSquare, heritageShops } from "./city-profile";
import { insideSpot } from "./spots";

export type StreetKit = {
  box: (
    g: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    solid?: boolean,
    rotation?: number,
  ) => THREE.Mesh;
  cylinder: (
    g: THREE.Group,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: number,
  ) => THREE.Mesh;
  tree: (g: THREE.Group, x: number, z: number, city: City) => void;
  rail: (
    g: THREE.Group,
    x: number,
    z: number,
    length: number,
    axis?: "x" | "z",
  ) => void;
  material: (
    color: number,
    roughness?: number,
    metalness?: number,
  ) => THREE.MeshStandardMaterial;
};

const textures = new Map<string, THREE.CanvasTexture>();
/** Hand-drawn surface patterns at believable scale; no downloads or image assets. */
function texture(kind: "plaster" | "brick" | "paving" | "asphalt" | "roof") {
  if (textures.has(kind)) return textures.get(kind)!;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle =
    kind === "asphalt"
      ? "#a9aaa8"
      : kind === "brick"
        ? "#a49a8e"
        : kind === "roof"
          ? "#b7a89b"
          : "#e1e0d8";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6500; i++) {
    const x = hash(i, 2) * 256,
      y = hash(i, 3) * 256,
      v = hash(i, 4);
    ctx.fillStyle = `rgba(${v > 0.5 ? "255,255,244" : "35,34,29"},${kind === "plaster" ? 0.035 : 0.07})`;
    ctx.fillRect(x, y, 1 + v * 2, 1);
  }
  if (kind === "brick" || kind === "roof") {
    const height = kind === "brick" ? 20 : 13;
    for (let row = 0; row < 256 / height; row++) {
      ctx.strokeStyle = "rgba(35,30,25,.22)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, row * height);
      ctx.lineTo(256, row * height);
      ctx.stroke();
      for (let col = -1; col < 8; col++) {
        const x = col * 48 + (row % 2) * 24;
        ctx.beginPath();
        ctx.moveTo(x, row * height);
        ctx.lineTo(x, (row + 1) * height);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,250,230,${hash(row, col) * 0.1})`;
        ctx.fillRect(x + 2, row * height + 2, 44, height - 4);
      }
    }
  }
  if (kind === "paving")
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 8; col++) {
        const x = col * 48 + (row % 2) * 24,
          y = row * 32;
        ctx.strokeStyle = "rgba(37,44,40,.25)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, 48, 32);
        ctx.fillStyle = `rgba(60,57,46,${hash(row, col) * 0.07})`;
        ctx.fillRect(x + 1, y + 1, 46, 30);
      }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  textures.set(kind, t);
  return t;
}
const surfaceMaterials = new Map<string, THREE.MeshStandardMaterial>();
export function surface(
  kind: "plaster" | "brick" | "paving" | "asphalt" | "roof",
  color: number,
) {
  const key = kind + color;
  if (!surfaceMaterials.has(key)) {
    const t = texture(kind).clone();
    t.needsUpdate = true;
    t.repeat.set(
      kind === "paving" ? 4 : kind === "brick" ? 3 : 1,
      kind === "paving" ? 4 : kind === "brick" ? 3 : 1,
    );
    const mat = new THREE.MeshStandardMaterial({
      map: t,
      color,
      roughness: kind === "asphalt" ? 0.98 : 0.87,
    });
    if (kind === "paving" || kind === "asphalt")
      mat.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "varying vec3 vStreetPosition;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvec4 streetPosition=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nstreetPosition=instanceMatrix*streetPosition;\n#endif\nvStreetPosition=(modelMatrix*streetPosition).xyz;",
        );
        shader.fragmentShader =
          "varying vec3 vStreetPosition;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          "#ifdef USE_MAP\nvec4 sampledDiffuseColor=texture2D(map,vStreetPosition.xz*0.22);\ndiffuseColor*=sampledDiffuseColor;\n#endif",
        );
      };
    surfaceMaterials.set(key, mat);
  }
  return surfaceMaterials.get(key)!;
}
const signMaterials = new Map<string, THREE.MeshBasicMaterial>();
function signMaterial(
  text: string,
  background: string,
  foreground = "#f2e4ca",
) {
  const key = text + background;
  if (!signMaterials.has(key)) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = foreground;
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, 496, 80);
    ctx.fillStyle = foreground;
    ctx.font = "600 36px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 51, 470);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    signMaterials.set(
      key,
      new THREE.MeshBasicMaterial({ map, toneMapped: false }),
    );
  }
  return signMaterials.get(key)!;
}
export function sign(
  g: THREE.Group,
  text: string,
  x: number,
  y: number,
  z: number,
  width = 6,
  yaw = 0,
  background = "#294d49",
) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, (width * 96) / 512),
    signMaterial(text, background),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  g.add(mesh);
  return mesh;
}

export function architecture(
  g: THREE.Group,
  b: Building,
  city: City,
  k: StreetKit,
) {
  if (b.style === "najdi") { najdiArchitecture(g, b, k); return; }
  const { box } = k;
  const center = centers[city],
    side = b.facing ?? (b.x < center ? 1 : -1);
  const body = box(g, b.x, b.h / 2, b.z, b.w, b.h, b.d, b.color, true);
  body.material = surface(
    city === "gdansk" && hash(b.x, b.z) > 0.65 ? "brick" : "plaster",
    b.color,
  );
  box(
    g,
    b.x,
    1.05,
    b.z,
    b.w + 0.1,
    2.1,
    b.d + 0.1,
    city === "gdansk" ? 0x67655b : 0xac997c,
  );
  for (const y of [3.9, b.h - 0.3])
    box(g, b.x, y, b.z, b.w + 0.4, 0.26, b.d + 0.45, 0xc9c1ac);
  box(
    g,
    b.x,
    b.h + 0.1,
    b.z,
    b.w + 0.9,
    0.4,
    b.d + 0.9,
    city === "gdansk" ? 0x777068 : 0xc7b392,
  );
  if (city === "gdansk") {
    // An actual pitched prism gives each merchant house a gable, not a pyramid.
    const w = b.w / 2 + 0.5,
      d = b.d / 2 + 0.5,
      h = 3.4;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-w, 0, -d, -w, 0, d, -w, h, 0, w, 0, -d, w, 0, d, w, h, 0],
        3,
      ),
    );
    geo.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        [0, 0, 0, 1, 0, 0.5, 1, 0, 1, 1, 1, 0.5],
        2,
      ),
    );
    geo.setIndex([0, 1, 2, 3, 5, 4, 0, 5, 3, 0, 2, 5, 2, 4, 5, 2, 1, 4]);
    geo.computeVertexNormals();
    const roof = new THREE.Mesh(
      geo,
      surface("roof", hash(b.x, b.z) > 0.5 ? 0x85533f : 0x465451),
    );
    roof.position.set(b.x, b.h + 0.3, b.z);
    roof.castShadow = true;
    g.add(roof);
    box(g, b.x - 2, b.h + 2.2, b.z - 4, 1, 3, 1.2, 0x86735f);
    for (const dz of [-b.d / 2 + 0.5, b.d / 2 - 0.5])
      box(
        g,
        b.x + side * (b.w / 2 + 0.2),
        b.h - 1,
        b.z + dz,
        0.3,
        1.5,
        0.4,
        0xc9c1ac,
      );
  } else {
    box(g, b.x, b.h + 1, b.z, b.w, 0.9, b.d, 0xcdb99a);
    for (const side of [-1, 1]) {
      box(
        g,
        b.x + side * (b.w / 2 - 0.25),
        b.h + 1.7,
        b.z,
        0.45,
        0.7,
        b.d,
        0xcdb99a,
      );
      box(
        g,
        b.x,
        b.h + 1.7,
        b.z + side * (b.d / 2 - 0.25),
        b.w,
        0.7,
        0.45,
        0xcdb99a,
      );
    }
    box(
      g,
      b.x,
      b.h + 1,
      b.z,
      Math.max(2, b.w - 3),
      0.9,
      Math.max(2, b.d - 3),
      0x9f9786,
    );
  }
  // Recessed glazing, stone surrounds, sills, and occasional shutters.
  for (const face of [-1, 1])
    for (let y = 5.8; y < b.h - 1; y += 3.2)
      for (let dz = -b.d / 2 + 2.5; dz < b.d / 2 - 1; dz += 4) {
        const x = b.x + face * (b.w / 2 + 0.08),
          z = b.z + dz;
        box(
          g,
          x,
          y,
          z,
          0.14,
          2.2,
          1.75,
          city === "gdansk" ? 0xd0c7b3 : 0xb29c7b,
        );
        const glass = box(g, x + face * 0.1, y, z, 0.12, 1.83, 1.35, 0x344d50);
        glass.material = k.material(0x344d50, 0.24, 0.2);
        box(g, x + face * 0.18, y, z, 0.1, 0.075, 1.38, 0x8f9c94);
        box(g, x + face * 0.18, y, z, 0.1, 1.85, 0.075, 0x8f9c94);
        if (city === "riyadh")
          for (let slat = 0; slat < 4; slat++)
            box(
              g,
              x + face * 0.23,
              y - 0.65 + slat * 0.43,
              z,
              0.1,
              0.08,
              1.4,
              0x8a7353,
            );
        box(g, x + face * 0.12, y - 1.15, z, 0.5, 0.15, 2, 0xb3ac9a);
        if (city === "gdansk" && hash(z, y) > 0.65)
          for (const q of [-1, 1])
            box(g, x + face * 0.05, y, z + q * 1.12, 0.13, 2, 0.4, 0x45645a);
      }
  // Side elevations have fewer openings and downpipes rather than blank walls.
  for (const face of [-1, 1]) {
    for (let y = 6; y < b.h - 1; y += 3.2)
      for (const dx of [-b.w * 0.27, b.w * 0.27])
        box(
          g,
          b.x + dx,
          y,
          b.z + face * (b.d / 2 + 0.1),
          1.25,
          1.9,
          0.14,
          0x40545a,
        );
    box(
      g,
      b.x + b.w / 2 + 0.12,
      b.h / 2,
      b.z + face * (b.d / 2 - 0.3),
      0.12,
      b.h,
      0.12,
      0x4d5c59,
    );
  }
  const front = b.x + side * (b.w / 2 + 0.3);
  for (const dz of [-b.d * 0.26, b.d * 0.26]) {
    box(g, front, 1.7, b.z + dz, 0.16, 2.85, 3.6, 0x263e3e);
    box(g, front + side * 0.1, 1.7, b.z + dz, 0.1, 2.9, 0.09, 0xb5a78c);
    box(
      g,
      front + side * 0.16,
      3.45,
      b.z + dz,
      1.8,
      0.16,
      4.3,
      city === "gdansk" ? 0x557768 : 0x9b7654,
    );
    box(
      g,
      front + side * 0.8,
      3.2,
      b.z + dz,
      0.16,
      0.5,
      4.3,
      city === "gdansk" ? 0x557768 : 0x9b7654,
    );
  }
  if (b.hero) {
    const names =
      city === "gdansk"
        ? [
            "KAWA · PALARNIA",
            "PIEKARNIA",
            "PRACOWNIA",
            "ROWERY",
            "BISTRO PORT",
            "KSIĘGARNIA",
            "MOTŁAWA",
          ]
        : [
            "COURTYARD COFFEE",
            "PALM STUDIO",
            "STONE & SHADE",
            "THE WORKSHOP",
            "GARDEN CAFÉ",
            "SKATE SUPPLY",
            "WADI GALLERY",
          ];
    const index = Math.floor(hash(b.z, side) * names.length);
    sign(
      g,
      names[index],
      front + side * 0.15,
      4.35,
      b.z,
      7.5,
      (side * Math.PI) / 2,
      city === "gdansk" ? "#34564f" : "#675540",
    );
    if (city === "gdansk")
      for (let j = 0; j < 4; j++)
        box(
          g,
          front + side * 0.2,
          b.h + 1.3 + j * 0.58,
          b.z,
          0.5,
          0.25,
          Math.max(1, 4 - j * 0.9),
          0xd7ccaf,
        );
  }
}

/** Low plaster blocks, deep openings and crenellated parapets of the heritage quarters. */
function najdiArchitecture(g: THREE.Group, b: Building, k: StreetKit) {
  const { box } = k;
  const mass = box(g, b.x, b.h / 2, b.z, b.w, b.h, b.d, b.color, true);
  mass.material = surface("plaster", b.color);
  for (const side of [-1, 1]) {
    const face = b.x + side * (b.w / 2 + 0.06);
    box(g, face, b.h - 0.6, b.z, 0.35, 0.18, b.d + 0.2, 0xf0d9b0);
    for (let z = -b.d / 2 + 2; z < b.d / 2; z += 3) {
      box(g, face, b.h + 0.4, b.z + z, 0.7, 0.8, 1.4, b.color);
      for (let y = 3.3; y < b.h - 1; y += 3.3) {
        box(g, face, y, b.z + z, 0.12, 1.35, 0.9, 0x58483b);
        box(g, face + side * 0.08, y - 0.8, b.z + z, 0.38, 0.18, 1.2, 0xdcc39c);
      }
    }
    box(g, face, 1.4, b.z, 0.14, 2.8, 2.1, 0x5e4430);
    // Deep street arcade, with readable solid piers and open passage below.
    box(g, face + side * 2, 3.7, b.z, 4, 0.35, b.d, 0xc9ad81);
    for (let z = -b.d / 2 + 1; z < b.d / 2; z += 6)
      box(g, face + side * 3.5, 1.8, b.z + z, 0.5, 3.6, 0.5, 0xd3b991, true);
  }
  if (b.hero) sign(g, "سوق · SOUQ", b.x + b.w / 2 + 0.2, 4.4, b.z, 7, Math.PI / 2, "#705137");
}

export function streetDetails(
  g: THREE.Group, cx: number, cz: number, city: City, k: StreetKit,
) {
  const { box, cylinder, tree, rail } = k;
  const historic = city === "gdansk";
  // The arrival district and canal own their ground; never overlay a generic tile.
  const arrival = Math.abs(cx - centers[city]) < 101 && Math.abs(cz) < 101;
  const waterfront = historic && Math.abs(cx + 1000) < 201 && cz === 100;
  if (!waterfront) {
    const base = box(g, cx, 0.012, cz, 200, 0.02, 200, historic ? 0xaaa896 : 0xcbb695);
    base.material = surface(historic ? "paving" : "plaster", historic ? 0x939e9b : 0xcab182);
    for (const road of streets(cx, cz, city)) {
      const lane = box(g, road.x, 0.034, road.z, road.w, 0.018, road.d, 0x606763);
      lane.material = surface(historic ? "paving" : "asphalt", historic ? 0x949d91 : 0x50595c);
      // Lane paint belongs only to the broad, north-south Riyadh arteries.
      if (!historic && road.d === 200)
        for (const roadX of [200, 600, 1000, 1400, 1800])
          for (const dx of [-9, -4.5, 4.5, 9])
            if (roadX + dx > cx - 100 && roadX + dx < cx + 100)
              for (let dz = -90; dz < 100; dz += 12)
                box(g, roadX + dx, 0.048, cz + dz, 0.12, 0.008, 5, 0xd9d6bd);
    }
  }
  if (arrival || waterfront || insideSpot(cx, cz, 100) || (city === "riyadh" && inHeritageSquare(cx, cz, 100))) return;
  if (historic) {
    // Green courtyards behind close-set merchant terraces, narrow stone lanes.
    for (const side of [-1, 1]) {
      const x = cx + side * 65;
      box(g, x, 0.03, cz + 12, 42, 0.025, 126, 0x7d906b);
      for (const dz of [-43, 12, 65]) tree(g, x + side * 9, cz + dz, city);
      box(g, x, 0.31, cz - 18, 1.2, 0.62, 15, 0x8e9a89, true);
      rail(g, x - side * 11, cz + 23, 12);
      for (const dz of [-62, 54]) {
        const px = cx + side * 8 + Math.sin((cz + dz) * 0.012) * 5;
        cylinder(g, px, 2.6, cz + dz, 0.065, 5.2, 0x354a43);
        box(g, px, 5.2, cz + dz, 0.7, 0.15, 0.7, 0xe2d9bb);
      }
    }
  } else {
    // Large limestone courts, palms and high shade structures between towers.
    const plaza = box(g, cx, 0.035, cz, 52, 0.025, 176, 0xdcc7a4);
    plaza.material = surface("paving", 0xe1ceae);
    for (const side of [-1, 1]) {
      for (const dz of [-72, -24, 24, 72]) tree(g, cx + side * 18, cz + dz, city);
      for (const dz of [-65, 65]) {
        cylinder(g, cx + side * 22, 3.6, cz + dz, 0.18, 7.2, 0xb3a083);
        for (let slat = -3; slat <= 3; slat++)
          box(g, cx + side * 15, 7.25, cz + dz + slat * 1.5, 16, 0.2, 0.6, 0x9c805c);
      }
      box(g, cx + side * 14, 0.34, cz, 1.6, 0.68, 24, 0xb29d7c, true);
    }
    rail(g, cx - 7, cz - 30, 18);
    box(g, cx + 6, 0.6, cz + 28, 7, 0.22, 9, 0xc2ad89, true, -0.12);
  }
}

function table(g: THREE.Group, x: number, z: number, k: StreetKit, city: City) {
  k.cylinder(g, x, 0.7, z, 0.08, 1.4, 0x394d47);
  const top = k.cylinder(g, x, 1.06, z, 0.8, 0.09, 0xa38b65);
  top.position.y = 0.96;
  for (const side of [-1, 1]) {
    k.box(g, x + side * 1.25, 0.48, z, 0.7, 0.1, 0.7, 0x3f5d51);
    k.box(g, x + side * 1.53, 0.9, z, 0.1, 0.85, 0.7, 0x3f5d51);
    for (const a of [-1, 1])
      k.box(
        g,
        x + side * 1.25,
        0.23,
        z + a * 0.25,
        0.055,
        0.5,
        0.055,
        0x394d47,
      );
  }
  k.cylinder(g, x, 2.2, z, 0.045, 4.4, 0x95846a);
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 0.65, 8),
    k.material(city === "gdansk" ? 0xe0c7a0 : 0xdccaa5),
  );
  canopy.position.set(x, 3.1, z);
  canopy.castShadow = true;
  g.add(canopy);
}

/** Authored arrival streets, shared physical scale but different city identities. */
export function arrivalDistrict(g: THREE.Group, city: City, k: StreetKit) {
  const x = centers[city],
    historic = city === "gdansk",
    sidewalk = historic ? 16 : 31,
    { box, cylinder, tree, rail } = k;
  activityCorners(g, city, k);
  if (!historic) {
    const plaza = box(g, 1255, 0.035, 9, 108, 0.06, 83, 0xd6bd94, true);
    plaza.material = surface("paving", 0xe1c9a4);
    // Geometric limestone inlays leave the central skating approach open.
    for (const px of [1236, 1274]) {
      box(g, px, 0.071, 10, 0.3, 0.012, 80, 0x9a7754);
      for (const z of [-22, 41]) {
        tree(g, px, z, city);
        box(g, px, 0.3, z, 3, 0.6, 3, 0xb59870, true);
      }
    }
    for (const shop of heritageShops) {
      najdiArchitecture(g, { ...shop, h: 7, color: 0xc7a87c, front: "x", facing: shop.x < 1255 ? 1 : -1, style: "najdi" }, k);
      // Patterned carpet displays below the market arcade.
      for (const z of [8, 17, 26]) {
        const rug = box(g, shop.x + (shop.x < 1255 ? 1 : -1) * 6.1, 1.7, z, 0.08, 2.6, 2.3, 0x8c3d35);
        for (const dy of [-0.8, 0, 0.8]) box(g, rug.position.x + (shop.x < 1255 ? 0.06 : -0.06), 1.7 + dy, z, 0.04, 0.13, 2.1, 0xd5b986);
      }
    }
    sign(g, "سوق الزل · SOUQ AL ZAL", 1217, 5.7, 17, 11, Math.PI / 2, "#725337");
    sign(g, "المصمك · AL MASMAK →", 1283, 2.8, -17, 10, Math.PI, "#735c3d");
    for (const px of [1279, 1287]) cylinder(g, px, 1.4, -17, 0.07, 2.8, 0x735c3d);
    for (const z of [3, 4.5]) box(g, 1255, 0.08, z, 1, 0.015, 0.12, 0xf1dfb9);
  } else {
    sign(g, "DŁUGIE POBRZEŻE · ŻURAW", -1065, 2.6, 68, 8, 0, "#36594f");
    for (const px of [-1068, -1062]) cylinder(g, px, 1.3, 68, 0.06, 2.6, 0x36594f);
    for (const px of [-1059, -1057.5]) box(g, px, 0.16, 76, 0.12, 0.015, 1, 0xe6ddbf);
  }
  const street = box(
    g,
    x,
    0.07,
    0,
    historic ? 37 : 80,
    0.1,
    166,
    city === "gdansk" ? 0x9faaa2 : 0xd4c3a4,
    true,
  );
  street.material = surface("paving", city === "gdansk" ? 0x94a5aa : 0xdbc7a4);
  if (city === "riyadh") {
    const road = box(g, x, 0.128, 0, 28, 0.014, 166, 0x49575a);
    road.material = surface("asphalt", 0x5d6768);
    for (const lane of [-8.7, -5.8, -2.9, 2.9, 5.8, 8.7])
      for (let z = -78; z < 82; z += 10)
        box(g, x + lane, 0.14, z, 0.12, 0.015, 4, 0xd8d6bd);
    for (const offset of [-0.2, 0.2])
      box(g, x + offset, 0.14, 0, 0.1, 0.015, 165, 0xc6b677);
    for (const side of [-1, 1])
      for (const z of [-55, -15, 35]) {
        const px = x + side * 10.3,
          paint = k.material(z < 0 ? 0xc0c4bc : 0x516a70, 0.36, 0.28),
          glass = k.material(0x29434b, 0.25, 0.3);
        const body = new THREE.Mesh(
          new RoundedBoxGeometry(1.8, 0.63, 4.4, 3, 0.15),
          paint,
        );
        body.position.set(px, 0.72, z);
        body.castShadow = true;
        g.add(body);
        const collision = box(g, px, 0.72, z, 1.8, 1.15, 4.4, 0x344943, true);
        collision.visible = false;
        const cab = new THREE.Mesh(
          new RoundedBoxGeometry(1.55, 0.6, 2.4, 3, 0.18),
          glass,
        );
        cab.position.set(px, 1.25, z - 0.1);
        cab.castShadow = true;
        g.add(cab);
        box(g, px, 1.59, z - 0.15, 1.4, 0.09, 1.8, 0xb3bdb4);
        for (const dx of [-1, 1])
          for (const dz of [-1, 1]) {
            const wheel = cylinder(
              g,
              px + dx * 0.9,
              0.36,
              z + dz * 1.35,
              0.31,
              0.2,
              0x2b3431,
            );
            wheel.rotation.z = Math.PI / 2;
            const hub = cylinder(
              g,
              px + dx * 1.01,
              0.36,
              z + dz * 1.35,
              0.15,
              0.015,
              0x9caaa8,
            );
            hub.rotation.z = Math.PI / 2;
          }
        for (const dx of [-1, 1]) {
          box(g, px + dx * 0.58, 0.72, z + 2.21, 0.4, 0.14, 0.025, 0xe4e9d4);
          box(g, px + dx * 0.58, 0.75, z - 2.21, 0.38, 0.13, 0.025, 0x9f4942);
        }
      }
  }
  for (const side of [-1, 1]) {
    const curb = box(g, x + side * (historic ? 18.5 : 39), 0.14, 0, 0.35, 0.2, 166, 0xb9b8a2);
    curb.material = surface("plaster", 0xb9b8a2);
    for (let i = 0; i < 7; i++) {
      const z = -65 + i * 22;
      if (i % 2 === 0 && historic) table(g, x + side * sidewalk, z + 3, k, city);
      else if (i % 2 === 0) {
        // Riyadh's shaded waiting/seating bays replace European café umbrellas.
        for (const dz of [-3, 3]) cylinder(g, x + side * sidewalk, 2.7, z + dz, 0.12, 5.4, 0xc2a27a);
        for (let slat = -4; slat <= 4; slat++) box(g, x + side * sidewalk, 5.45, z + slat * 0.8, 7, 0.16, 0.45, 0x9a7650);
        box(g, x + side * sidewalk, 0.35, z, 4, 0.7, 1.1, 0xb49a76, true);
      }
      else {
        box(
          g,
          x + side * sidewalk,
          0.5,
          z,
          2.5,
          1,
          2,
          city === "gdansk" ? 0x6a7a60 : 0xa68a65,
          true,
        );
        tree(g, x + side * sidewalk, z, city);
      }
      cylinder(g, x + side * (historic ? 14.3 : 16), 0.5, z - 7, 0.09, 1, 0x445954);
    }
    for (const z of [-48, 10, 62]) {
      cylinder(g, x + side * (historic ? 13 : 18), 3.2, z, 0.09, 6.4, 0x3e5550);
      box(g, x + side * (historic ? 13 : 18), 6.4, z, 1.1, 0.2, 0.7, 0x3e5550);
      box(g, x + side * (historic ? 13 : 18), 6.28, z, 0.85, 0.05, 0.5, 0xffe4b0);
    }
  }
  // A visible line from the spawn: low ledge → jump rail → open landing.
  box(g, x + (historic ? -6 : 24), 0.23, 35, 1.2, 0.46, 12, 0x8f9c8d, true);
  box(g, x + (historic ? -6 : 24), 0.48, 35, 1.35, 0.04, 12.1, 0xc4c8b6);
  rail(g, x + (historic ? 7 : -24), 56, 15);
  box(g, x + (historic ? 10 : -27), 0.4, 46, 5, 0.8, 2, 0xa8a992, true);
  // A flush toe at the low end makes this a usable takeoff rather than a step.
  box(g, x + (historic ? -9 : 23), 0.58, 18, 4, 0.22, 9, historic ? 0x9da99b : 0xc8b38f, true, -0.12);
  sign(
    g,
    city === "gdansk" ? "MOTŁAWA / QUAY →" : "PALM COURT / WADI →",
    x - 11,
    2.4,
    8,
    4.5,
    Math.PI / 2,
    city === "gdansk" ? "#33564d" : "#77624a",
  );
  if (city === "gdansk") {
    // Lower water, stone quay walls and a flush bridge with collision.
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 24),
      new THREE.MeshStandardMaterial({
        color: 0x387a80,
        roughness: 0.24,
        metalness: 0.35,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, -0.6, 98);
    g.add(water);
    for (const z of [84.5, 111.5]) {
      const promenade = box(
        g,
        x,
        0.08,
        z + (z < 98 ? -8 : 8),
        200,
        0.14,
        15,
        0x999e8d,
        true,
      );
      promenade.material = surface("paving", 0xa9ad9a);
      box(g, x, -0.7, z, 200, 1.6, 1.6, 0x666b5e);
      for (const side of [-1, 1])
        rail(g, x + side * 55, z + (z < 98 ? -2 : 2), 86, "x");
    }
    box(g, x, -0.08, 98, 12, 0.25, 28, 0xaaa58e, true);
    for (const side of [-1, 1]) rail(g, x + side * 5.6, 98, 26);
    for (const bx of [-62, 55]) {
      const hull = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 6),
        k.material(bx < 0 ? 0xd5c4a1 : 0x344f56, 0.55),
      );
      hull.scale.set(8, 1.2, 2.4);
      hull.position.set(x + bx, -0.5, 98);
      g.add(hull);
      box(g, x + bx, 0.35, 98, 10, 0.25, 3.2, 0x998363);
      box(g, x + bx - 1, 1.6, 98, 3.5, 2.3, 2.6, 0xe3d9be);
      box(g, x + bx - 1, 1.9, 96.65, 2.7, 0.85, 0.1, 0x335b64);
      cylinder(g, x + bx + 3, 4.5, 98, 0.06, 8.5, 0xd4ccb4);
    }
    sign(g, "NABRZEŻE · MOTŁAWA", x - 29, 3.7, 80, 10, 0, "#425b50");
  } else {
    // A courtyard with pergolas, planted edges, a fountain, and intricate screens.
    for (const side of [-1, 1]) {
      const court = box(g, x + side * 35, 0.08, 160, 40, 0.13, 62, 0xc8b391);
      court.material = surface("paving", 0xd7c29e);
    }
    for (const side of [-1, 1])
      for (let j = 0; j < 4; j++) {
        const px = x + side * 28,
          z = 132 + j * 18;
        cylinder(g, px, 3.3, z, 0.25, 6.6, 0xc4ac85);
        tree(g, x + side * 44, z, city);
        for (let l = 0; l < 4; l++)
          box(g, px + side * 4, 6.7, z - 6 + l * 4, 12, 0.22, 0.65, 0x9c815e);
      }
    for (const side of [-1, 1]) {
      box(g, x + side * 34, 0.5, 160, 4, 1, 48, 0xa28c68, true);
      for (let j = 0; j < 7; j++)
        box(g, x + side * 34, 0.93, 139 + j * 7, 4.1, 0.15, 5.8, 0xceb58b);
    }
    const fx = x + 24,
      fz = 163;
    cylinder(g, fx, 0.45, fz, 6, 0.9, 0xa78c64);
    cylinder(g, fx, 0.94, fz, 5.4, 0.08, 0x53908a);
    cylinder(g, fx, 1.5, fz, 1, 1.1, 0xc7ad7d);
    cylinder(g, fx, 2.1, fz, 2, 0.18, 0xc7ad7d);
    for (let j = 0; j < 10; j++) {
      const a = (j * Math.PI) / 5;
      box(g, x - 26, 2.2, 137 + j * 5, 0.2, 4.4, 3, 0x8a7051);
      for (let k2 = 0; k2 < 4; k2++) {
        const screen = box(
          g,
          x - 25.8,
          1 + k2 * 0.85,
          137 + j * 5,
          0.22,
          0.09,
          3,
          0xd9c6a0,
        );
        screen.rotation.x = 0.4;
      }
    }
    sign(g, "PALM COURT", x - 25, 3.3, 186, 10, Math.PI, "#786348");
  }
}

/** Small, occupied destinations anchor the crowd routes to visible city activity. */
function activityCorners(g: THREE.Group, city: City, k: StreetKit) {
  const { box, cylinder } = k, historic = city === "gdansk";
  if (historic) {
    // A coffee kiosk and café terrace face the quay, clear of the skating line.
    box(g, -1094, 1.25, 61, 5.5, 2.5, 3.2, 0x4c6c63, true);
    box(g, -1094, 2.65, 61, 6.2, 0.2, 4.2, 0xd8b47e);
    box(g, -1094, 1.1, 62.7, 5.7, 0.15, 0.7, 0xb49164);
    box(g, -1094, 1.85, 62.66, 4.5, 1.1, 0.03, 0x2b4341);
    sign(g, "KAWA · COFFEE", -1094, 2.4, 62.74, 5, 0, "#294e45");
    for (const x of [-1083, -1075, -1067]) table(g, x, 65, k, city);
    box(g, -1018, 0.6, 56, 4, 1.2, 1.4, 0x8d6b4f, true);
    for (let i = 0; i < 12; i++) box(g, -1019.7 + i * 0.3, 1.3, 56, 0.19, 0.16 + i % 3 * 0.08, 0.55, [0x6d8890, 0xb8926b, 0xa75f50][i % 3]);
    sign(g, "KSIĄŻKI / BOOKS", -1018, 2, 56.8, 4.5, 0, "#4a5b47");
    // Recognizable parked bicycles, instead of another row of empty paving.
    for (let i = 0; i < 4; i++) {
      const x = -1052 + i * 1.2, z = 63;
      for (const dz of [-0.58, 0.58]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 5, 16), k.material(0x263734));
        wheel.rotation.y = Math.PI / 2; wheel.position.set(x, 0.34, z + dz); g.add(wheel);
      }
      box(g, x, 0.57, z, 0.055, 0.06, 1.1, 0x658c8c);
      cylinder(g, x, 0.69, z - 0.2, 0.025, 0.65, 0x658c8c);
      box(g, x, 1.03, z + 0.58, 0.4, 0.04, 0.05, 0x2b3939);
      box(g, x, 0.98, z - 0.15, 0.2, 0.06, 0.3, 0x343e39);
    }
  } else {
    // Coffee service and patterned market awnings belong to the heritage square.
    box(g, 1223, 0.7, 17, 3.2, 1.4, 1.5, 0x8e6748, true);
    box(g, 1223, 1.45, 17, 3.5, 0.12, 1.7, 0xd1b389);
    for (const x of [1222, 1223]) {
      cylinder(g, x, 1.75, 17, 0.2, 0.55, 0xb9924f);
      cylinder(g, x, 2.05, 17, 0.12, 0.13, 0xc5a96b);
    }
    for (let i = 0; i < 6; i++) cylinder(g, 1223.5 + i * 0.16, 1.58, 17.3, 0.045, 0.16, 0xe9dfc8);
    sign(g, "قهوة · COFFEE", 1223, 2.65, 17.8, 4.5, 0, "#73573e");
    for (const x of [1240, 1274]) {
      box(g, x, 0.4, 36, 4, 0.8, 1.1, 0xa78a62, true);
      box(g, x, 1.1, 36.5, 4, 0.7, 0.12, 0x92724f);
      for (const dx of [-2.5, 2.5]) cylinder(g, x + dx, 2.8, 36, 0.08, 5.6, 0xb29670);
      box(g, x, 5.65, 36, 6, 0.12, 5, 0xd8bd8a);
    }
    box(g, 1287, 0.55, 23, 4, 1.1, 1.7, 0x8b6648, true);
    for (let i = 0; i < 7; i++) {
      const roll = cylinder(g, 1285.5 + i * 0.48, 1.3, 23, 0.2, 1.3, [0x91463b, 0xdec38d, 0x547b74][i % 3]); roll.rotation.x = Math.PI / 2;
    }
    for (const x of [1284.5, 1289.5]) cylinder(g, x, 2, 23, 0.07, 4, 0x9b7b53);
    box(g, 1287, 4, 23, 6, 0.1, 3.5, 0x936549);
  }
}
