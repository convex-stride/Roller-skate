import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { RAPIER, Skater, STEP, idle, type Rail } from "./physics";
import { ActionBuffer, createGamepadReader } from "./input";
import { createTouchControls } from "./touch";
import { createRider } from "./rider";
import { NavigationMap, type Goal, type MapState } from "./navigation";
import { buildCityLandmarks, modernArchitecture } from "./landmarks";
import { courses, SpotRun, type Course } from "./spots";
import { buildSpots } from "./spot-scene";
import { createCrowd } from "./crowd-scene";
import { races, placeLabel, type RaceDefinition } from "./races";
import { RaceSession } from "./race-session";
import { buildRaceScene } from "./race-scene";
import { landmarks as cityLandmarks, cityStarts, practiceRails } from "./city-profile";
import { menus } from "./menus";
import { loadPreferences, bindPreferences, type Preferences } from "./settings";
import {
  architecture,
  streetDetails,
  arrivalDistrict,
} from "./environment";
import {
  buildings,
  cityAt,
  centers,
  inWorld,
  hash,
  activities,
  tokens,
  routeFor,
  type City,
  type Activity,
} from "./world";
import "./style.css";
import "./menus.css";
import "./navigation.css";
import "./touch.css";
import "./races.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
const uiArrow =
  '<svg class="ui-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13L13 3M3 3h10v10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
app.innerHTML = `<canvas id="scene" aria-label="Between Cities skating world"></canvas>
<div id="hud" class="hidden"><div class="topbar"><div class="brand">BETWEEN CITIES<small>INLINE / OPEN WORLD</small></div><div class="city"><strong id="city-name">Gdańsk</strong><span id="district-name">Baltic Lines</span></div></div>
<div class="telemetry"><div class="speed"><span id="speed">0</span><small>KM/H</small></div><div class="bar"><i id="charge"></i></div><div class="stance" id="stance">COAST</div></div>
<div class="combo"><b id="score"></b><span id="multiplier"></span><p id="trick"></p></div>
<div class="event hidden" id="event"></div><div id="toast" class="toast" role="status"></div>
<div class="hint" id="hint"><kbd>WASD</kbd> skate &nbsp; <kbd>Space</kbd> jump &nbsp; <kbd>E</kbd> rail assist &nbsp; <kbd>M</kbd> map &nbsp; <kbd>Esc</kbd> pause</div>
<div class="map-wrap"><canvas id="minimap" width="370" height="200"></canvas><small>GDANSK — WORLD LINK — RIYADH</small></div><div id="debug" class="debug hidden"></div></div>
${menus.replaceAll("↗", uiArrow).replaceAll("V0.3 / LOBBY UPDATE", "V0.12 / STREET RACES").replaceAll("An original inline skating experiment. Original procedural artwork and synthesized skate audio.", "Original city artwork and skating systems. Rider anatomy adapted from MakeHuman core assets (CC0).")}
<div id="help" class="overlay hidden"><div class="panel"><div class="eyebrow">Find your flow</div><h2>Learn the streets.</h2><div class="controls"><div><b>W / ↑ · S / ↓</b>Push / friction brake</div><div><b>A D / ← →</b>Carve left / right</div><div><b>Space</b>Jump on press · hold for height</div><div><b>Shift</b>Crouch, reduce air resistance</div><div><b>Land on a rail</b>Auto grind · Space pop off · S exit</div><div><b>Q · G</b>Hold manual · hold powerslide</div><div><b>Tap Z / C</b>180 left / right · tap twice for 360</div><div><b>Tap F / X</b>Safety grab / mute tweak · soul / royale on rails</div><div><b>Tap V / B</b>Spread eagle / stalefish grab in air</div><div><b>Mouse drag · H</b>Look around · controls</div><div><b>N · Ride with a local</b>Invite a nearby skater for 45 seconds</div><div><b>Enter · Race flag</b>Join a nearby race or event</div><div><b>R · M · Escape</b>Recover · map · pause</div><div><b>Controller</b>Left stick roll/steer · right stick look</div><div><b>Controller tricks</b>A jump · LB grind · RB manual · X grab<br>LT/RT tap 180 · left stick click slide · Y event · B recover · Start pause</div></div><p>Press Space to take off immediately. Hold briefly for a higher arc. Tap Z or C during the jump, then F or X to add style. A second spin tap adds another 180°. Jump onto a rail while moving along it to lock in automatically. Hold E for extra catch assistance. Space pops off, S releases; reaching the end also releases. F and X switch grind style. Land tricks to score; coast briefly to bank a combo.</p><p class="notice">Gravity: 9.81 m/s² · Rider mass: 75 kg · Drag, rolling resistance, lateral grip and rigid-body collisions</p><button class="primary" id="help-close">Got it</button></div></div>
<div id="map" class="overlay hidden"><div class="panel map-panel"><div class="eyebrow">One world, two perspectives</div><h2>Your next line.</h2><canvas class="map-large" id="world-map" width="900" height="420"></canvas><p class="map-label">Gdańsk ← skate through World Link → Riyadh. Choose an event below to travel to its starting point.</p><div class="challenge-list" id="challenge-list"></div><div class="actions"><button class="primary" id="map-close">Back to skating</button></div></div></div>
<div id="error" class="overlay hidden"><div class="panel"><h2>We couldn’t start the ride.</h2><p id="error-text"></p><button onclick="location.reload()">Try again</button></div></div>`;
const el = (id: string) => document.getElementById(id)!;
el("hud").insertAdjacentHTML("beforeend", `<aside id="spot-card" aria-label="Play a stunt spot"><small id="spot-kicker">NEW PLACES TO RIDE</small><strong id="spot-title"></strong><p id="spot-detail"></p><div class="spot-meter"><i id="spot-fill"></i></div><span id="spot-reward"></span><div class="spot-actions"><button id="spot-play">T · Ride the jump line</button><button id="spot-next">Try another</button><button id="spot-leave" hidden>End run</button></div></aside>`);
el("hud").insertAdjacentHTML("beforeend", `<aside id="race-card" class="hidden" aria-label="Street race"><small id="race-area"></small><strong id="race-title"></strong><div id="race-stats"></div><ol id="race-standings"></ol><p id="race-best"></p><div class="race-actions"><button id="race-join">Join race</button><button id="race-restart">Restart race</button><button id="race-leave">Leave race</button></div></aside><div id="race-countdown" class="hidden" role="status" aria-live="polite"></div>`);
el("outfit-status").insertAdjacentHTML("afterend", '<div class="headwear-review"><button id="headwear-detail" aria-pressed="false">Inspect headwear</button><label id="rider-turn-label" hidden>Turn rider<input id="rider-turn" aria-label="Turn rider" type="range" min="-180" max="180" value="0" step="1"></label></div>');
el("minimap").parentElement!.innerHTML =
  `<div class="map-heading"><span id="map-area">GDAŃSK</span><span class="map-controls"><button id="map-zoom-in" aria-label="Zoom minimap in">+</button><button id="map-zoom-out" aria-label="Zoom minimap out">−</button></span></div><canvas id="minimap" width="560" height="460" aria-label="Nearby streets, buildings, rails, and navigation"></canvas><div class="navigation-summary"><span id="nav-goal">FREE SKATE</span><strong id="nav-distance">M · SET A WAYPOINT</strong></div><div class="map-key"><span><i></i>EVENT</span><span><i></i>TOKEN</span><span id="map-zoom">220 m</span></div>`;
el("map-close").insertAdjacentHTML(
  "afterend",
  '<button id="waypoint-clear">Clear waypoint</button>',
);
el("world-map").setAttribute(
  "aria-label",
  "World map. Click a clear street to place a navigation waypoint.",
);
document.querySelector(".map-label")!.textContent =
  "Click a street or plaza to place a waypoint. The minimap guides you around buildings and across the bridge. Choose an event below to travel to its start.";
let preferences = loadPreferences();
const mobileDevice = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
type Save = {
  version: number;
  collected: string[];
  records: Record<string, number>;
  outfit: number;
  best: number;
  raceResults?: Record<string, { time: number; place: number; wins: number }>;
};
let save: Save = { version: 1, collected: [], records: {}, outfit: 0, best: 0 };
function validSave(v: unknown): v is Save {
  const s = v as Save;
  return (
    !!s &&
    s.version === 1 &&
    Array.isArray(s.collected) &&
    s.collected.every(
      (x) => typeof x === "string" && tokens.some((t) => t.id === x),
    ) &&
    s.records !== null &&
    typeof s.records === "object" &&
    Object.entries(s.records).every(
      ([k, v]) =>
        (activities.some((a) => a.id === k) || courses.some(c => c.id === k) || races.some(r => r.id === k)) && Number.isFinite(v) && v >= 0,
    ) &&
    Number.isInteger(s.outfit) &&
    s.outfit >= 0 &&
    s.outfit < 6 &&
    Number.isFinite(s.best) &&
    s.best >= 0 &&
    (s.raceResults === undefined || (s.raceResults !== null && typeof s.raceResults === "object" && Object.entries(s.raceResults).every(([id, result]) =>
      races.some(r => r.id === id) && result !== null && typeof result === "object" && Number.isFinite(result.time) && result.time > 0 && Number.isInteger(result.place) && result.place >= 1 && result.place <= 4 && Number.isInteger(result.wins) && result.wins >= 0)))
  );
}
try {
  const data = JSON.parse(localStorage.getItem("between-cities-v1") || "null");
  if (validSave(data)) save = data;
} catch {
  /* Session-only when storage is restricted. */
}
let saveFailed = false;
function persist() {
  try {
    localStorage.setItem("between-cities-v1", JSON.stringify(save));
  } catch {
    if (!saveFailed) toast("Storage unavailable. Export a save from pause.");
    saveFailed = true;
  }
}
let toastUntil = 0;
function toast(message: string) {
  el("toast").textContent = message;
  el("toast").classList.add("visible");
  toastUntil = performance.now() + 4000;
}

async function boot() {
  await RAPIER.init();
  const canvas = el("scene") as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobileDevice,
    powerPreference: "high-performance",
  });
  let automaticQuality = true,
    slowFrames = 0;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * 0.75);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  const skyDome = new Sky();
  skyDome.scale.setScalar(1400);
  skyDome.material.uniforms.turbidity.value = 3.5;
  skyDome.material.uniforms.rayleigh.value = 1.8;
  skyDome.material.uniforms.mieCoefficient.value = 0.004;
  skyDome.material.uniforms.mieDirectionalG.value = 0.8;
  skyDome.material.uniforms.sunPosition.value.set(-0.45, 0.75, 0.45);
  scene.add(skyDome);
  scene.background = new THREE.Color(0x9dbdc4);
  scene.fog = new THREE.Fog(0x9dbdc4, 160, 680);
  const camera = new THREE.PerspectiveCamera(
    59,
    innerWidth / innerHeight,
    0.1,
    1700,
  );
  const hemi = new THREE.HemisphereLight(0xdcebf4, 0x726852, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe7bf, 3.5);
  sun.position.set(-1040, 100, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -65;
  sun.shadow.camera.right = 65;
  sun.shadow.camera.top = 65;
  sun.shadow.camera.bottom = -65;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 250;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = STEP;
  const initialStart = cityStarts.gdansk;
  const skater = new Skater(world, initialStart.x, initialStart.z);
  skater.heading = initialStart.heading;
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: number, roughness = 0.85, metalness = 0) => {
    const key = `${color}-${roughness}-${metalness}`;
    if (!mats.has(key))
      mats.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
      );
    return mats.get(key)!;
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
  const sphereGeo = new THREE.SphereGeometry(1, 12, 8);
  const leafGeo = new THREE.BufferGeometry();
  const leafPositions: number[] = [],
    leafIndices: number[] = [];
  for (let i = 0; i <= 9; i++) {
    const t = i / 9,
      w = Math.sin(t * Math.PI) * 0.38 + 0.01,
      y = Math.sin(t * Math.PI) * 1.1 - t * t * 1.6;
    leafPositions.push(-w, y, t * 4.8, w, y, t * 4.8);
    if (i < 9) {
      const n = i * 2;
      leafIndices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  leafGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(leafPositions, 3),
  );
  leafGeo.setIndex(leafIndices);
  leafGeo.computeVertexNormals();
  const sharedGeometries = [boxGeo, cylGeo, sphereGeo, leafGeo];
  const collidersByGroup = new Map<THREE.Group, RAPIER.Collider[]>();
  function box(
    group: THREE.Group | THREE.Scene,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    solid = false,
    rotation = 0,
  ) {
    const mesh = new THREE.Mesh(boxGeo, material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.rotation.x = rotation;
    mesh.castShadow = h > 0.3;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (solid) {
      const desc = RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
        .setTranslation(x, y, z)
        .setFriction(0.05);
      if (rotation)
        desc.setRotation({
          x: Math.sin(rotation / 2),
          y: 0,
          z: 0,
          w: Math.cos(rotation / 2),
        });
      const collider = world.createCollider(desc);
      if (group instanceof THREE.Group) {
        const list = collidersByGroup.get(group) || [];
        list.push(collider);
        collidersByGroup.set(group, list);
      }
    }
    return mesh;
  }
  function cylinder(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: number,
  ) {
    const mesh = new THREE.Mesh(cylGeo, material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(r, h, r);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }
  // Static city floors remain present while visual districts stream around the rider.
  const bases = new THREE.Group();
  scene.add(bases);
  // Split the waterfront ground around a real canal opening; a physical bridge
  // in the arrival district keeps the main skating route continuous.
  box(bases, -1450, -0.3, 0, 700, 0.6, 1600, 0x969d8e, true);
  box(bases, -550, -0.3, 0, 700, 0.6, 1600, 0x969d8e, true);
  box(bases, -1000, -0.3, -357, 200, 0.6, 886, 0x969d8e, true);
  box(bases, -1000, -0.3, 455, 200, 0.6, 690, 0x969d8e, true);
  box(bases, 1000, -0.3, 0, 1600, 0.6, 1600, 0xcebf9e, true);
  box(bases, 0, -0.3, 0, 400, 0.6, 300, 0xb7b8a1, true);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(3200, 5000),
    material(0x709da7, 0.3, 0.2),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-1800, -4, 0);
  scene.add(sea);
  // Separate horizons: the Baltic ends west of the link; Riyadh has dry inland ground.
  const desert = new THREE.Mesh(new THREE.PlaneGeometry(4200, 5000), material(0xc9ad7b));
  desert.rotation.x = -Math.PI / 2;
  desert.position.set(2300, -3.8, 0);
  scene.add(desert);
  const horizon = new THREE.Group();
  scene.add(horizon);
  for (let i = 0; i < 16; i++) {
    const ridge = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), material(i % 2 ? 0xb4986e : 0xc5a477));
    ridge.position.set(250 + i * 110, 12 + hash(i, 4) * 15, i % 2 ? 1100 : -1100);
    ridge.scale.set(115 + hash(i, 3) * 70, 35 + hash(i, 8) * 50, 120);
    horizon.add(ridge);
  }
  // Shipyard cranes beyond the Baltic city's northern edge establish its industrial coast.
  for (const x of [-1500, -1250, -1000]) {
    box(horizon, x, 25, 860, 3, 50, 3, 0x795b43);
    box(horizon, x + 14, 48, 860, 65, 2, 2, 0x795b43);
    cylinder(horizon, x + 40, 33, 860, 0.12, 29, 0x3b4a49);
    box(horizon, x + 40, 18, 860, 2, 1.5, 2, 0x3b4a49);
  }
  const railGroups = new Map<THREE.Group, Rail[]>();
  function rail(
    g: THREE.Group,
    x: number,
    z: number,
    length: number,
    axis: "x" | "z" = "z",
  ) {
    const y = 0.8;
    const railCollider = box(
      g,
      x,
      y,
      z,
      axis === "x" ? length : 0.09,
      0.09,
      axis === "z" ? length : 0.09,
      0xe4e0cd,
      true,
    );
    railCollider.visible = false;
    const tube = cylinder(g, x, y, z, 0.045, length, 0xc7cfcb);
    tube.material = material(0xc7cfcb, 0.38, 0.65);
    if (axis === "z") tube.rotation.x = Math.PI / 2;
    else tube.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) {
      const post = box(
        g,
        x + (axis === "x" ? s * (length / 2 - 0.5) : 0),
        0.4,
        z + (axis === "z" ? s * (length / 2 - 0.5) : 0),
        0.08,
        0.8,
        0.08,
        0x586467,
        true,
      );
      post.visible = false;
      cylinder(
        g,
        x + (axis === "x" ? s * (length / 2 - 0.5) : 0),
        0.4,
        z + (axis === "z" ? s * (length / 2 - 0.5) : 0),
        0.04,
        0.8,
        0x63726f,
      );
    }
    const r: Rail = { x, z, length, y: y + 0.045, axis };
    const a = railGroups.get(g) || [];
    a.push(r);
    railGroups.set(g, a);
  }
  function tree(g: THREE.Group, x: number, z: number, city: City) {
    cylinder(g, x, 2.8, z, city === "gdansk" ? 0.24 : 0.3, 5.6, 0x786b51);
    if (city === "gdansk") {
      for (let i = 0; i < 5; i++) {
        const crown = new THREE.Mesh(
          sphereGeo,
          material([0x566d4e, 0x6c805a, 0x75865e][i % 3]),
        );
        crown.position.set(
          x + Math.sin(i * 2.4) * 1.3,
          5.8 + hash(x, z, i) * 1.7,
          z + Math.cos(i * 2.4) * 1.1,
        );
        crown.scale.set(1.9, 2 + hash(x, z, i), 1.8);
        crown.castShadow = true;
        g.add(crown);
      }
    } else {
      const leafMaterial = material(0x647844);
      leafMaterial.side = THREE.DoubleSide;
      for (let i = 0; i < 10; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMaterial);
        leaf.position.set(x, 6.1, z);
        leaf.rotation.y = (i * Math.PI) / 5 + hash(x, z);
        leaf.rotation.x = (i % 2) * 0.12;
        leaf.castShadow = true;
        g.add(leaf);
      }
      for (let h = 1; h < 5.8; h += 0.32)
        cylinder(g, x, h, z, 0.32, 0.07, 0x94816a);
    }
  }
  const chunks = new Map<string, THREE.Group>();
  function batchInstances(g: THREE.Group) {
    const batches = new Map<string, THREE.Mesh[]>();
    for (const child of [...g.children])
      if (
        child instanceof THREE.Mesh &&
        child.visible &&
        sharedGeometries.includes(child.geometry)
      ) {
        const key = `${child.geometry.uuid}-${(child.material as THREE.Material).uuid}`;
        const list = batches.get(key) || [];
        list.push(child);
        batches.set(key, list);
      }
    for (const list of batches.values()) {
      const instanced = new THREE.InstancedMesh(
        list[0].geometry,
        list[0].material,
        list.length,
      );
      list.forEach((m, i) => {
        m.updateMatrix();
        instanced.setMatrixAt(i, m.matrix);
        g.remove(m);
      });
      instanced.castShadow = true;
      instanced.receiveShadow = true;
      instanced.computeBoundingSphere();
      g.add(instanced);
    }
  }
  function createChunk(ix: number, iz: number, city: City) {
    const cx = centers[city] - 700 + ix * 200,
      cz = -700 + iz * 200;
    const g = new THREE.Group();
    scene.add(g);
    const kit = { box, cylinder, tree, rail, material };
    streetDetails(g, cx, cz, city, kit);
    for (const building of buildings(cx, cz, city))
      if (building.style === "modern") modernArchitecture(g, building, kit);
      else architecture(g, building, city, kit);
    batchInstances(g);
    return g;
  }
  const link = new THREE.Group();
  scene.add(link);
  for (let x = -180; x < 200; x += 40) {
    rail(link, x, -24, 25, "x");
    for (const z of [-100, 100]) {
      cylinder(link, x, 4, z, 0.4, 8, 0xbeb69d);
      box(link, x, 8, z, 18, 0.3, 15, 0xcbbd99);
    }
  }
  box(link, 0, 0.02, -145, 400, 0.04, 3, 0x5b786c);
  box(link, 0, 0.02, 145, 400, 0.04, 3, 0x5b786c);
  // Distant landmark silhouettes are cheap and remain visible outside the detailed cells.
  const landmarks = new THREE.Group();
  scene.add(landmarks);
  buildCityLandmarks(landmarks, { box, cylinder, tree, rail, material });
  let lastChunk = "";
  let chunkQueue: { key: string; x: number; z: number; city: City; distance: number }[] = [];
  function stream(force = false) {
    const p = skater.body.translation();
    const key = `${Math.floor(p.x / 200)}:${Math.floor(p.z / 200)}`;
    if (key === lastChunk && !force) return;
    lastChunk = key;
    chunkQueue = [];
    const needed = new Set<string>();
    for (const city of ["gdansk", "riyadh"] as const) {
      const ix = Math.floor((p.x - centers[city] + 800) / 200),
        iz = Math.floor((p.z + 800) / 200);
      for (let x = Math.max(0, ix - 1); x <= Math.min(7, ix + 1); x++)
        for (let z = Math.max(0, iz - 1); z <= Math.min(7, iz + 1); z++) {
          const k = `${city}-${x}-${z}`;
          needed.add(k);
          if (!chunks.has(k)) chunkQueue.push({ key: k, x, z, city,
            distance: Math.hypot(centers[city] - 700 + x * 200 - p.x, -700 + z * 200 - p.z) });
        }
    }
    chunkQueue.sort((a, b) => a.distance - b.distance);
    for (const [k, g] of chunks) {
      g.visible = needed.has(k);
      const [city, ix, iz] = k.split("-");
      const distant = Math.abs(centers[city as City] - 700 + Number(ix) * 200 - p.x) > 520 || Math.abs(-700 + Number(iz) * 200 - p.z) > 520;
      if (!needed.has(k) && distant) {
        for (const collider of collidersByGroup.get(g) || [])
          world.removeCollider(collider, true);
        collidersByGroup.delete(g);
        railGroups.delete(g);
        scene.remove(g);
        g.traverse((o) => {
          if (o instanceof THREE.InstancedMesh) o.dispose();
          if (o instanceof THREE.Mesh && !sharedGeometries.includes(o.geometry))
            o.geometry.dispose();
        });
        chunks.delete(k);
      }
    }
    // Teleports load their immediate collision neighborhood before simulation resumes.
    if (force) for (let i = 0; i < 4; i++) buildNextChunk();
  }
  function buildNextChunk() {
    const next = chunkQueue.shift();
    if (next) chunks.set(next.key, createChunk(next.x, next.z, next.city));
  }
  stream(true);
  const training = new THREE.Group();
  scene.add(training);
  for (const city of ["gdansk", "riyadh"] as const)
    arrivalDistrict(training, city, { box, cylinder, tree, rail, material });
  for (const r of practiceRails) rail(training, r.x, r.z, r.length, r.axis);
  // Articulated procedural rider: the physics capsule stays independent of the visual pose.
  batchInstances(training);
  batchInstances(link);
  batchInstances(landmarks);
  const spotScene = buildSpots(scene, world, { box, cylinder, tree, rail, material });
  const raceScene = buildRaceScene(scene);
  batchInstances(spotScene.group);
  const crowd = await createCrowd(scene, world, skater.body, mobileDevice);
  const localsButton = document.createElement("button");
  localsButton.id = "locals-ride";
  el("spot-card").querySelector(".spot-actions")!.append(localsButton);
  const crowdPlayer = () => ({ x: skater.body.translation().x, z: skater.body.translation().z, speed: skater.speed, heading: skater.heading, score: skater.banked + skater.combo });
  function inviteLocal() { toast(crowd.director.invite(crowdPlayer())); canvas.focus(); }
  localsButton.onclick = inviteLocal;
  const outfitColors = [
    0xc6d9a2, 0xd9936b, 0x8cb9c3, 0xb4a4c9, 0xe0cb7d, 0xe6e2d6,
  ];
  const avatar = await createRider(outfitColors[save.outfit]);
  const rider = avatar.group;
  scene.add(rider);
  // Collectibles and event markers are lightweight persistent instances.
  const tokenGeo = new THREE.TorusGeometry(0.7, 0.15, 6, 16);
  const tokenMat = new THREE.MeshStandardMaterial({
    color: 0xe6d391,
    emissive: 0x5b5125,
    metalness: 0.5,
    roughness: 0.3,
  });
  const tokenMeshes = tokens.map((t) => {
    const m = new THREE.Mesh(tokenGeo, tokenMat);
    m.position.set(t.x, 1.5, t.z);
    m.visible = !save.collected.includes(t.id);
    scene.add(m);
    return m;
  });
  const markerGeo = new THREE.TorusGeometry(1.8, 0.09, 6, 24);
  const markerMats = [0xaad6ca, 0xe7ba7b, 0xbcb1db].map(
    (color) => new THREE.MeshBasicMaterial({ color }),
  );
  const eventMeshes = activities.map((a) => {
    const m = new THREE.Mesh(
      markerGeo,
      markerMats[a.kind === "sprint" ? 0 : a.kind === "jam" ? 1 : 2],
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(a.x, 0.12, a.z);
    scene.add(m);
    return m;
  });
  const gate = new THREE.Mesh(
    new THREE.TorusGeometry(3.5, 0.12, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xd8edab }),
  );
  scene.add(gate);
  gate.visible = false;
  let active: {
    activity: Activity;
    time: number;
    gate: number;
    scoreStart: number;
    jumps: number;
  } | null = null;
  let nearest: Activity | undefined;
  let nearestRace: RaceDefinition | undefined;
  let raceSession: RaceSession | null = null;
  let lastCountdownLabel = "";
  let spotRun: SpotRun | null = null;
  let spotChoice = 0;
  let spotCity: City = "gdansk";
  const spotGates = Array.from({ length: 5 }, () => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.12, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffc580, transparent: true, opacity: 0.3 }));
    scene.add(m); m.visible = false; return m;
  });
  function stopSpot() {
    spotRun = null;
    for (const m of spotGates) m.visible = false;
    el("spot-card").classList.remove("celebrate");
  }
  function selectedCourse() { return courses.filter(c => c.spot.city === spotCity)[spotChoice]; }
  function startSpot(course: Course) {
    stopRace();
    stopSpot(); active = null; gate.visible = false; waypoint = null;
    el("event").classList.add("hidden");
    skater.bank();
    skater.reset(course.start.x, course.start.z);
    skater.heading = 0; lookYaw = 0;
    safe = { ...course.start };
    spotCity = course.spot.city; spotChoice = courses.filter(c => c.spot.city === spotCity).indexOf(course);
    spotRun = new SpotRun(course, skater.jumpCount, skater.banked);
    stream(true); closeMenus(); snapCamera();
    course.gates.forEach((g, i) => { spotGates[i].position.set(g.x, g.y + 1.2, g.z); spotGates[i].visible = true; });
    toast(`${course.name} · ${course.description}`);
  }
  el("spot-play").onclick = () => startSpot(spotRun?.course ?? selectedCourse());
  el("spot-next").onclick = () => { stopSpot(); spotChoice = (spotChoice + 1) % 3; };
  el("spot-leave").onclick = () => { stopSpot(); toast("Free skate · the whole spot is yours"); canvas.focus(); };
  function tickSpot() {
    if (!spotRun || !spotRun.isRunning()) return;
    const p = skater.body.translation();
    spotRun.tick({ ...p, grounded: skater.grounded, jumps: skater.jumpCount, score: skater.banked }, STEP);
    if (spotRun.status === "finished") {
      const c = spotRun.course, value = c.kind === "jam" ? skater.banked - spotRun.initialScore : spotRun.elapsed;
      const before = Math.min(6, 2 + Math.floor(Object.keys(save.records).length / 2));
      const old = save.records[c.id];
      if (old === undefined || (c.kind === "jam" ? value > old : value < old)) save.records[c.id] = value;
      const after = Math.min(6, 2 + Math.floor(Object.keys(save.records).length / 2));
      persist();
      el("spot-card").classList.add("celebrate");
      toast(`${spotRun.medal} · ${c.name}${after > before ? " · NEW JACKET UNLOCKED — Rider wardrobe" : " · Spot stamp saved"}`);
    } else if (spotRun.status === "failed") toast("Time’s up · T to retry, or try another line");
    spotGates.forEach((m, i) => {
      m.visible = spotRun!.status === "riding" && i < spotRun!.course.gates.length;
      m.material.color.setHex(i < spotRun!.gate ? 0x88dca6 : i === spotRun!.gate ? 0xe8ff70 : 0xffc580);
      m.material.opacity = i === spotRun!.gate ? 1 : 0.22;
    });
  }
  function updateSpotCard() {
    const city = cityAt(skater.body.translation().x);
    if (!spotRun && city !== spotCity) { spotCity = city; spotChoice = 0; }
    const c = spotRun?.course ?? selectedCourse(), running = spotRun?.status === "riding";
    el("spot-card").classList.toggle("hidden", !!active || !!raceSession || !!nearestRace);
    el("spot-kicker").textContent = spotRun?.status === "finished" ? `${spotRun.medal} MEDAL · STAMP EARNED` : spotRun?.status === "failed" ? "ONE MORE TRY?" : c.spot.name;
    el("spot-title").textContent = c.name;
    el("spot-detail").textContent = running
      ? `${Math.ceil(c.limit - spotRun!.elapsed)}s · ${c.kind === "jam" ? `${skater.banked - spotRun!.initialScore} / 300 banked points` : `${spotRun!.gate + 1}/${c.gates.length} · ${c.gates[spotRun!.gate].label}`}`
      : c.description;
    const count = Object.keys(save.records).length, stamps = courses.filter(c => save.records[c.id] !== undefined).length;
    el("spot-reward").textContent = `${stamps}/6 spot stamps · ${count >= 8 ? "All jacket colours unlocked" : `${2 - count % 2} more completion${count % 2 ? "" : "s"} unlock a jacket`}`;
    el("spot-fill").style.width = `${spotRun?.status === "finished" ? 100 : running ? c.kind === "jam" ? Math.min(100, (skater.banked - spotRun!.initialScore) / 3) : spotRun!.gate / c.gates.length * 100 : 0}%`;
    el("spot-play").textContent = `${mobileDevice ? "" : "T · "}${running ? "Restart" : spotRun ? "Ride again" : "Start this run"}`;
    el("spot-leave").hidden = !spotRun;
  }
  function startEvent(a: Activity) {
    stopRace();
    stopSpot();
    skater.reset(a.x, a.z);
    skater.heading = Math.PI;
    skater.bank();
    active = {
      activity: a,
      time: 0,
      gate: 0,
      scoreStart: skater.banked,
      jumps: skater.jumpCount,
    };
    gate.visible = a.kind !== "jam";
    toast(
      a.kind === "line"
        ? "Route challenge: jump at least once and clear the gates"
        : a.kind === "jam"
          ? "90 seconds. Link tricks and bank your score."
          : "Follow the green gates. Find your fastest line.",
    );
    closeMenus();
    snapCamera();
  }
  function finishEvent() {
    if (!active) return;
    skater.bank();
    const a = active.activity,
      score = skater.banked - active.scoreStart,
      value = a.kind === "jam" ? score : active.time;
    if (a.kind === "jam" && score < 200) {
      toast("Session finished · bank at least 200 points for bronze");
      active = null;
      gate.visible = false;
      el("event").classList.add("hidden");
      return;
    }
    const best = save.records[a.id];
    if (best === undefined || (a.kind === "jam" ? value > best : value < best))
      save.records[a.id] = value;
    const medal =
      a.kind === "jam"
        ? score >= 2000
          ? "GOLD"
          : score >= 800
            ? "SILVER"
            : "BRONZE"
        : value < 45
          ? "GOLD"
          : value < 75
            ? "SILVER"
            : "BRONZE";
    toast(
      `${medal} · ${a.kind === "jam" ? `${score} points` : `${value.toFixed(1)} s`} · ${a.district}`,
    );
    active = null;
    gate.visible = false;
    el("event").classList.add("hidden");
    persist();
  }
  function stopRace() {
    raceSession?.dispose(); raceSession = null;
    el("race-card").classList.add("hidden"); el("race-countdown").classList.add("hidden");
  }
  function startRace(definition: RaceDefinition) {
    stopRace(); stopSpot(); active = null; gate.visible = false; waypoint = null;
    el("event").classList.add("hidden");
    if (crowd.director.follower) crowd.director.invite(crowdPlayer());
    skater.bank(); raceSession = new RaceSession(world, skater, definition);
    safe = { ...definition.start }; lookYaw = 0;
    stream(true); closeMenus(); snapCamera();
    toast(`${definition.name} · 3 rivals · ${definition.laps === 1 ? "sprint" : `${definition.laps} laps`} · wait for GO`);
  }
  el("race-join").onclick = () => { if (nearestRace) startRace(nearestRace); };
  el("race-restart").onclick = () => { if (raceSession) startRace(raceSession.run.definition); };
  el("race-leave").onclick = () => { stopRace(); canvas.focus(); toast("Free skate · race left"); };
  function startNearby() {
    if (raceSession) { if (raceSession.run.status === "finished" || raceSession.run.status === "timeout") startRace(raceSession.run.definition); return; }
    if (nearestRace) startRace(nearestRace);
    else if (nearest) startEvent(nearest);
    else startSpot(spotRun?.course ?? selectedCourse());
  }
  function updateRaceCard() {
    const run = raceSession?.run, definition = run?.definition ?? nearestRace;
    el("race-card").classList.toggle("hidden", !definition);
    if (!definition) { el("race-countdown").classList.add("hidden"); return; }
    el("race-area").textContent = `${definition.area.toUpperCase()} · STREET RACE`;
    el("race-title").textContent = definition.name;
    el("race-join").hidden = !!run; el("race-restart").hidden = !run; el("race-leave").hidden = !run;
    const best = save.records[definition.id], result = save.raceResults?.[definition.id];
    el("race-best").textContent = `${best === undefined ? "No personal best yet" : `Best ${best.toFixed(2)}s`}${result ? ` · ${result.wins} win${result.wins === 1 ? "" : "s"}` : ""}`;
    if (!run) {
      el("race-stats").textContent = `You + 3 AI riders · ${definition.laps === 1 ? "Point-to-point sprint" : `${definition.laps} laps`} · Enter / Ride to join`;
      el("race-standings").replaceChildren(); el("race-countdown").classList.add("hidden"); return;
    }
    const finished = run.status === "finished", timeout = run.status === "timeout";
    const lap = Math.min(definition.laps, Math.floor(run.player.gate / definition.checkpoints.length) + 1);
    el("race-stats").innerHTML = `<b>${finished ? `${placeLabel(run.position)} FINISH` : timeout ? "TIME’S UP" : `${run.position} / 4`}</b><span>${(run.player.finish ?? run.elapsed).toFixed(2)}s · ${finished ? "RESULT SAVED" : timeout ? "Retry for a result" : `LAP ${lap}/${definition.laps} · CP ${Math.min(run.totalGates, run.player.gate + 1)}/${run.totalGates}`}</span>`;
    el("race-standings").replaceChildren(...run.standings().map((r, i) => {
      const row = document.createElement("li"); row.classList.toggle("race-you", r.id === "player");
      row.textContent = `${i + 1}. ${r.name} ${r.finish === null ? "" : `· ${r.finish.toFixed(2)}s`}`; return row;
    }));
    const label = run.locked ? String(Math.ceil(run.countdown)) : run.elapsed < 0.8 ? "GO!" : "";
    if (label !== lastCountdownLabel) { el("race-countdown").textContent = label; lastCountdownLabel = label; }
    el("race-countdown").classList.toggle("hidden", !label);
  }
  function recordRace() {
    if (!raceSession || raceSession.recorded || raceSession.run.status !== "finished") return;
    raceSession.recorded = true;
    const run = raceSession.run, time = run.player.finish!, id = run.definition.id;
    const old = save.records[id]; if (old === undefined || time < old) save.records[id] = time;
    save.raceResults ??= {};
    save.raceResults[id] = { time, place: run.position, wins: (save.raceResults[id]?.wins ?? 0) + Number(run.position === 1) };
    persist();
    toast(`${placeLabel(run.position)} · ${run.definition.name} · ${time.toFixed(2)}s${old === undefined || time < old ? " · PERSONAL BEST" : ""}`);
  }
  let playing = false,
    paused = true,
    helpReturn = "menu";
  let settingsReturn: "menu" | "pause" = "menu",
    wardrobeReturn: "menu" | "pause" = "menu",
    mapReturn: "menu" | "pause" | null = null;
  let selectedCity: City = "gdansk";
  let wardrobeDetail = false;
  function refreshLobby() {
    el("lobby-progress").textContent =
      `${save.collected.length} / 120 TOKENS  ·  ${Object.keys(save.records).length} / 46 CHALLENGES`;
    el("pause-best").textContent = save.best.toLocaleString();
    el("lobby-location").textContent =
      selectedCity === "gdansk" ? "GDAŃSK / MOTŁAWA QUAY" : "RIYADH / AL MASMAK · DEERA";
    el("featured-event").querySelector("strong")!.textContent =
      selectedCity === "gdansk" ? "MOTŁAWA DASH" : "OLAYA SPRINT";
    el("featured-event").querySelector(".card-detail")!.textContent = "Street race · Beat three local riders";
    for (const city of ["gdansk", "riyadh"] as const) {
      const selected = city === selectedCity;
      el(`select-${city}`).classList.toggle("selected", selected);
      el(`select-${city}`).setAttribute("aria-pressed", String(selected));
    }
  }
  function closeMenus() {
    touch.reset();
    [
      "menu",
      "pause",
      "help",
      "map",
      "settings-screen",
      "wardrobe-screen",
    ].forEach((id) => el(id).classList.add("hidden"));
    playing = true;
    paused = false;
    touch.show(true);
    camera.clearViewOffset();
    el("hud").classList.remove("hidden");
    keys.clear();
    actions.clear();
    canvas.focus();
  }
  function pause() {
    if (!playing) return;
    if (
      ["settings-screen", "wardrobe-screen", "menu", "help", "map"].some(
        (id) => !el(id).classList.contains("hidden"),
      )
    )
      return;
    paused = true;
    touch.show(false);
    keys.clear();
    actions.clear();
    el("pause").classList.remove("hidden");
    el("progress").textContent =
      `${save.collected.length}/120 route tokens · ${Object.keys(save.records).length}/46 challenges completed · Best combo ${save.best.toLocaleString()}`;
    persist();
    refreshLobby();
    el("resume").focus();
  }
  function travel(city: City) {
    stopRace();
    stopSpot();
    active = null;
    gate.visible = false;
    el("event").classList.add("hidden");
    const start = cityStarts[city];
    skater.reset(start.x, start.z);
    skater.heading = start.heading;
    safe = { x: start.x, z: start.z };
    stream(true);
    closeMenus();
    snapCamera();
    toast(
      cityStarts[city].name,
    );
  }
  el("play").onclick = () => {
    closeMenus();
    snapCamera();
    toast(mobileDevice ? "Thumbstick to skate · hold JUMP · tap a trick · drag the view to look" : "Space jump · rails auto-catch · Z/C spin · F/X/V/B stunts · T stunt spots");
    if (preferences.audio) el("audio").dispatchEvent(new Event("change"));
  };
  el("resume").onclick = closeMenus;
  el("gdansk").onclick = () => travel("gdansk");
  el("riyadh").onclick = () => travel("riyadh");
  function showHelp() {
    helpReturn = !el("settings-screen").classList.contains("hidden")
      ? "settings-screen"
      : !el("menu").classList.contains("hidden")
        ? "menu"
        : "pause";
    paused = true;
    el(helpReturn).classList.add("hidden");
    touch.show(false); actions.clear();
    el("help").classList.remove("hidden");
  }
  el("how").onclick = showHelp;
  el("help-open").onclick = showHelp;
  el("help-close").onclick = () => {
    el("help").classList.add("hidden");
    el(helpReturn).classList.remove("hidden");
    el(
      helpReturn === "settings-screen"
        ? "settings-controls"
        : helpReturn === "menu"
          ? "how"
          : "help-open",
    ).focus();
  };
  function showMap() {
    mapReturn = !el("menu").classList.contains("hidden")
      ? "menu"
      : !el("pause").classList.contains("hidden")
        ? "pause"
        : null;
    paused = true;
    keys.clear();
    ["pause", "menu"].forEach((id) => el(id).classList.add("hidden"));
    touch.show(false); actions.clear();
    el("map").classList.remove("hidden");
    drawMap(el("world-map") as HTMLCanvasElement, true);
  }
  el("map-open").onclick = showMap;
  function closeMap() {
    el("map").classList.add("hidden");
    if (mapReturn) {
      el(mapReturn).classList.remove("hidden");
      if (mapReturn === "menu") el("lobby-world").focus();
      else el("map-open").focus();
    } else closeMenus();
  }
  el("map-close").onclick = closeMap;
  el("lobby-world").onclick = showMap;
  function previewCity(city: City) {
    stopRace();
    stopSpot();
    selectedCity = city;
    const start = cityStarts[city];
    skater.reset(start.x, start.z);
    skater.heading = start.heading;
    safe = { x: start.x, z: start.z };
    stream(true);
    for (let i = 0; i < 30; i++) world.step();
    refreshLobby();
  }
  el("select-gdansk").onclick = () => previewCity("gdansk");
  el("select-riyadh").onclick = () => previewCity("riyadh");
  el("featured-event").onclick = () => {
    startRace(races.find(r => r.city === selectedCity && r.laps === 1)!);
  };
  function showLobby() {
    ["pause", "map", "help"].forEach((id) => el(id).classList.add("hidden"));
    paused = true;
    touch.show(false); actions.clear();
    keys.clear();
    active = null;
    gate.visible = false;
    el("event").classList.add("hidden");
    el("hud").classList.add("hidden");
    el("menu").classList.remove("hidden");
    previewCity(cityAt(skater.body.translation().x));
    el("play").focus();
  }
  el("return-lobby").onclick = showLobby;
  el("challenge-list").innerHTML =
    courses.map(c => `<button data-course="${c.id}">Ride: ${c.name}<small>${c.spot.city === "gdansk" ? "Gdańsk" : "Riyadh"} · ${c.spot.name}</small></button>`).join("") + cityLandmarks
      .map(
        (l) =>
          `<button data-landmark="${l.id}">Explore: ${l.name}<small>${l.city === "gdansk" ? "Gdańsk" : "Riyadh"} · landmark</small></button>`,
      )
      .join("") +
    activities
      .map(
        (a, i) =>
          `<button data-event="${i}">${a.district} · ${a.kind.toUpperCase()}<small>${a.city === "gdansk" ? "Gdańsk" : "Riyadh"} ${save.records[a.id] !== undefined ? "· completed" : ""}</small></button>`,
      )
      .join("");
  el("challenge-list").insertAdjacentHTML("afterbegin", races.map(r => `<button data-race="${r.id}">Race: ${r.name}<small>${r.city === "gdansk" ? "Gdańsk" : "Riyadh"} · ${r.laps === 1 ? "Sprint" : `${r.laps} laps`} · 3 rivals</small></button>`).join(""));
  el("challenge-list").onclick = (e) => {
    const raceButton = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-race]");
    if (raceButton) { startRace(races.find(r => r.id === raceButton.dataset.race)!); return; }
    const courseButton = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-course]");
    if (courseButton) { startSpot(courses.find(c => c.id === courseButton.dataset.course)!); return; }
    const landmarkButton = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-landmark]",
    );
    if (landmarkButton) {
      stopRace();
      stopSpot();
      const l = cityLandmarks.find(
        (l) => l.id === landmarkButton.dataset.landmark,
      )!;
      active = null;
      gate.visible = false;
      el("event").classList.add("hidden");
      skater.reset(l.spawn.x, l.spawn.z);
      skater.heading = Math.atan2(l.x - l.spawn.x, l.z - l.spawn.z);
      safe = { ...l.spawn };
      stream(true);
      closeMenus();
      snapCamera();
      toast(`${l.name} · ${l.city === "gdansk" ? "Gdańsk" : "Riyadh"}`);
      return;
    }
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-event]",
    );
    if (b) {
      const a = activities[Number(b.dataset.event)];
      streamDestination(a.x, a.z);
      startEvent(a);
    }
  };
  function streamDestination(x: number, z: number) {
    skater.reset(x, z);
    stream(true);
  }
  function showWardrobe() {
    wardrobeDetail = false;
    el("headwear-detail").setAttribute("aria-pressed", "false");
    el("headwear-detail").textContent = "Inspect headwear";
    el("rider-turn-label").setAttribute("hidden", "");
    (el("rider-turn") as HTMLInputElement).value = "0";
    wardrobeReturn = el("menu").classList.contains("hidden") ? "pause" : "menu";
    el(wardrobeReturn).classList.add("hidden");
    el("wardrobe-screen").classList.remove("hidden");
    paused = true;
    touch.show(false); actions.clear();
    keys.clear();
    const available = Math.min(
      6,
      2 + Math.floor(Object.keys(save.records).length / 2),
    );
    const names = [
      "Sage",
      "Terracotta",
      "Coastal blue",
      "Heather",
      "Ochre",
      "Chalk",
    ];
    el("outfit-swatches").innerHTML = outfitColors
      .map(
        (color, i) =>
          `<button aria-label="${names[i]} jacket${i >= available ? " — locked" : ""}" aria-pressed="${i === save.outfit}" data-outfit="${i}" style="background:#${color.toString(16).padStart(6, "0")}" ${i >= available ? "disabled" : ""}></button>`,
      )
      .join("");
    el("outfit-status").textContent =
      `${available} / 6 colours unlocked. Complete two different events or spot challenges to unlock another.`;
  }
  el("wardrobe").onclick = showWardrobe;
  el("lobby-rider").onclick = showWardrobe;
  el("lobby-customize").onclick = showWardrobe;
  el("headwear-detail").onclick = () => {
    wardrobeDetail = !wardrobeDetail;
    el("headwear-detail").setAttribute("aria-pressed", String(wardrobeDetail));
    el("headwear-detail").textContent = wardrobeDetail ? "View full outfit" : "Inspect headwear";
    el("rider-turn-label").toggleAttribute("hidden", !wardrobeDetail);
  };
  el("outfit-swatches").onclick = (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-outfit]",
    );
    if (!button || button.disabled) return;
    save.outfit = Number(button.dataset.outfit);
    avatar.setOutfit(outfitColors[save.outfit]);
    persist();
    el("outfit-swatches")
      .querySelectorAll("button")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
  };
  function closeWardrobe() {
    el("wardrobe-screen").classList.add("hidden");
    el(wardrobeReturn).classList.remove("hidden");
  }
  el("wardrobe-back").onclick = closeWardrobe;
  function applyPreferences(next: Preferences) {
    preferences = next;
    automaticQuality = next.quality === "auto";
    slowFrames = 0;
    renderer.setPixelRatio(
      (Math.min(devicePixelRatio, mobileDevice && next.quality === "auto" ? 1.25 : 1.5) * next.resolution) / 100,
    );
    renderer.shadowMap.enabled = next.shadows && !(mobileDevice && next.quality === "auto");
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMappingExposure = (0.95 * next.brightness) / 100;
    document.documentElement.style.setProperty(
      "--hud-scale",
      String(next.hudScale / 100),
    );
    document.body.classList.toggle("high-contrast", next.contrast);
    document.body.classList.toggle("hud-off", !next.showHud);
  }
  const settingsUI = bindPreferences(
    preferences,
    (p) => {
      applyPreferences(p);
      if (p.audio) el("audio").dispatchEvent(new Event("change"));
    },
    () => {
      el(settingsReturn).classList.remove("hidden");
      el(
        settingsReturn === "menu" ? "lobby-settings" : "pause-settings",
      ).focus();
    },
  );
  function showSettings() {
    settingsReturn = el("menu").classList.contains("hidden") ? "pause" : "menu";
    el(settingsReturn).classList.add("hidden");
    paused = true;
    touch.show(false); actions.clear();
    keys.clear();
    settingsUI.open();
  }
  el("lobby-settings").onclick = showSettings;
  el("pause-settings").onclick = showSettings;
  el("settings-controls").onclick = showHelp;
  el("fullscreen").onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else
      document.documentElement
        .requestFullscreen()
        .catch(() => toast("Fullscreen unavailable in this embed"));
  };
  el("export").onclick = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(save)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "between-cities-save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  el("import").onclick = () => (el("save-file") as HTMLInputElement).click();
  el("save-file").onchange = async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      if (f.size > 1000000) throw Error();
      const data = JSON.parse(await f.text());
      if (!validSave(data)) throw Error();
      save = data;
      persist();
      avatar.setOutfit(outfitColors[save.outfit]);
      tokenMeshes.forEach(
        (m, i) => (m.visible = !save.collected.includes(tokens[i].id)),
      );
      toast("Save imported");
    } catch {
      toast("Invalid save. Your current progress is safe.");
    }
  };
  const keys = new Set<string>();
  const actions = new ActionBuffer();
  const touch = createTouchControls(actions, {
    pause, map: showMap, recover,
    event: startNearby,
    toast,
  });
  if (touch.enabled) {
    el("help").querySelector(".controls")!.insertAdjacentHTML("afterbegin", "<div><b>Phone thumbstick</b>Up to push · sideways to turn · down to brake</div><div><b>Jump + tricks</b>Hold JUMP; tap 180, Grab or Tweak with another finger</div><div><b>More · drag view</b>Extra tricks and held moves · drag empty space to look</div>");
    el("help").querySelector("p")!.textContent = "Use both thumbs: keep pushing with the stick while you jump and tap tricks. Rails catch automatically. The More tray has spread eagle, stalefish, crouch, manual, slide and rail assist. Ride opens a nearby challenge; Map lets you choose any stunt spot. Portrait and landscape both work.";
  }
  let lookPointer: number | null = null, pointerX = 0, pointerY = 0;
  let dragging = false,
    lookYaw = 0,
    lookPitch = 0.18,
    lastLook = 0;
  canvas.tabIndex = 0;
  window.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && paused) {
      const panel = [
        ...document.querySelectorAll<HTMLElement>(
          ".shell:not(.hidden),.overlay:not(.hidden)",
        ),
      ].at(-1);
      const focusable = panel
        ? [
            ...panel.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input,select,a[href]",
            ),
          ].filter((x) => x.tabIndex >= 0 && x.getClientRects().length)
        : [];
      if (focusable.length) {
        const i = focusable.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          focusable.at(-1)!.focus();
        } else if (!e.shiftKey && (i === focusable.length - 1 || i < 0)) {
          e.preventDefault();
          focusable[0].focus();
        }
      }
      return;
    }
    if (
      (e.target as HTMLElement).matches("input,select,button") &&
      e.code !== "Escape"
    )
      return;
    if (e.code === "Escape") {
      e.preventDefault();
      if (!el("settings-screen").classList.contains("hidden")) {
        settingsUI.close();
        return;
      }
      if (!el("wardrobe-screen").classList.contains("hidden")) {
        closeWardrobe();
        return;
      }
      if (!el("help").classList.contains("hidden")) {
        el("help-close").click();
        return;
      }
      if (!el("map").classList.contains("hidden")) {
        closeMap();
        return;
      }
      if (!el("menu").classList.contains("hidden")) return;
      if (!playing) return;
      if (paused) {
        closeMenus();
      } else pause();
      return;
    }
    if (e.code === "KeyM" && playing && !e.repeat) {
      if (paused) closeMenus();
      else showMap();
      return;
    }
    if (paused) return;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
    keys.add(e.code);
    if (!e.repeat) {
      if (e.code === "Space") actions.pressJump();
      if (e.code === "KeyZ") actions.trick("left");
      if (e.code === "KeyC") actions.trick("right");
      if (e.code === "KeyF") actions.trick("grab");
      if (e.code === "KeyX") actions.trick("tweak");
      if (e.code === "KeyV") actions.trick("star");
      if (e.code === "KeyB") actions.trick("stale");
      if (e.code === "KeyH") { pause(); showHelp(); }
      if (e.code === "KeyT") startSpot(spotRun?.course ?? selectedCourse());
      if (e.code === "KeyN") inviteLocal();
    }
    if (e.code === "KeyR" && !e.repeat) recover();
    if (e.code === "Enter" && !e.repeat && (nearest || nearestRace || raceSession)) startNearby();
    if (e.code === "F3") {
      e.preventDefault();
      el("debug").classList.toggle("hidden");
    }
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
    if (e.code === "Space" && !paused) actions.releaseJump();
  });
  window.addEventListener("blur", () => {
    dragging = false;
    lookPointer = null;
    actions.clear();
    keys.clear();
    pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (!paused && lookPointer === null) {
      e.preventDefault();
      lookPointer = e.pointerId; pointerX = e.clientX; pointerY = e.clientY;
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
    }
  });
  const stopLook = (e: PointerEvent) => { if (e.pointerId === lookPointer) { dragging = false; lookPointer = null; } };
  canvas.addEventListener("pointerup", stopLook);
  canvas.addEventListener("pointercancel", stopLook);
  canvas.addEventListener("lostpointercapture", stopLook);
  canvas.addEventListener("pointermove", (e) => {
    if (dragging && e.pointerId === lookPointer && !paused) {
      const dx = e.clientX - pointerX, dy = e.clientY - pointerY;
      pointerX = e.clientX; pointerY = e.clientY;
      lookYaw -= dx * 0.004 * preferences.sensitivity;
      lookPitch = THREE.MathUtils.clamp(
        lookPitch +
          dy *
            0.003 *
            preferences.sensitivity *
            (preferences.invert ? -1 : 1),
        -0.1,
        0.7,
      );
      lastLook = performance.now();
    }
  });
  let previousPadJump = false,
    previousPadLeft = false,
    previousPadRight = false,
    previousPadGrab = false,
    previousStart = false,
    previousY = false,
    previousB = false;
  const readGamepad = createGamepadReader();
  const dead = (n: number) =>
    Math.abs(n) < preferences.deadzone
      ? 0
      : ((Math.abs(n) - preferences.deadzone) / (1 - preferences.deadzone)) *
        Math.sign(n);
  function controls() {
    const c = idle();
    c.throttle = keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0;
    c.brake = keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0;
    c.steer =
      Number(keys.has("KeyA") || keys.has("ArrowLeft")) -
      Number(keys.has("KeyD") || keys.has("ArrowRight"));
    c.jump = keys.has("Space");
    c.crouch = keys.has("ShiftLeft") || keys.has("ShiftRight");
    c.grind = keys.has("KeyE");
    c.manual = keys.has("KeyQ");
    c.slide = keys.has("KeyG");
    c.throttle = Math.max(c.throttle, touch.state.throttle);
    c.brake = Math.max(c.brake, touch.state.brake);
    c.steer = Math.max(-1, Math.min(1, c.steer + touch.state.steer));
    c.jump ||= touch.state.jump; c.crouch ||= touch.state.crouch;
    c.grind ||= touch.state.grind; c.manual ||= touch.state.manual; c.slide ||= touch.state.slide;
    const pad = readGamepad();
    if (pad) {
      const btn = (i: number) => pad.buttons[i]?.pressed || false;
      c.throttle = Math.max(c.throttle, -dead(pad.axes[1] || 0));
      c.brake = Math.max(c.brake, dead(pad.axes[1] || 0));
      c.steer -= dead(pad.axes[0] || 0);
      c.jump ||= btn(0);
      if (!paused && btn(0) && !previousPadJump) actions.pressJump();
      if (!paused && !btn(0) && previousPadJump) actions.releaseJump();
      previousPadJump = btn(0);
      c.grind ||= btn(4);
      c.manual ||= btn(5);
      if (!paused && btn(2) && !previousPadGrab) actions.trick("grab");
      if (!paused && btn(6) && !previousPadLeft) actions.trick("left");
      if (!paused && btn(7) && !previousPadRight) actions.trick("right");
      previousPadGrab = btn(2); previousPadLeft = btn(6); previousPadRight = btn(7);
      c.slide ||= btn(10);
      if (btn(9) && !previousStart) {
        if (!el("settings-screen").classList.contains("hidden"))
          settingsUI.close();
        else if (paused) closeMenus();
        else pause();
      }
      previousStart = btn(9);
      if (btn(3) && !previousY && (nearest || nearestRace || raceSession) && !paused) startNearby();
      previousY = btn(3);
      if (btn(1) && !previousB && !paused) recover();
      previousB = btn(1);
      if (
        !paused &&
        Math.abs(dead(pad.axes[2] || 0)) + Math.abs(dead(pad.axes[3] || 0)) >
          0.01
      ) {
        lookYaw -= dead(pad.axes[2] || 0) * 0.035 * preferences.sensitivity;
        lookPitch = THREE.MathUtils.clamp(
          lookPitch +
            dead(pad.axes[3] || 0) *
              0.02 *
              preferences.sensitivity *
              (preferences.invert ? -1 : 1),
          -0.1,
          0.7,
        );
        lastLook = performance.now();
      }
    }
    c.jumpPressed = actions.jumpPressed;
    c.jumpRelease = actions.jumpReleased;
    c.tricks = [...actions.tricks];
    return c;
  }
  let safe = { x: initialStart.x, z: initialStart.z },
    safeTimer = 0;
  function recover() {
    if (raceSession) { startRace(raceSession.run.definition); return; }
    if (spotRun?.status === "riding") { startSpot(spotRun.course); return; }
    skater.reset(safe.x, safe.z);
    lookYaw = 0;
    actions.clear();
    snapCamera();
    toast("Recovered to your last safe position");
  }
  const target = new THREE.Vector3(),
    desired = new THREE.Vector3();
  const cameraShape = new RAPIER.Ball(0.24);
  let cameraGroundY = skater.body.translation().y;
  function snapCamera() {
    const p = skater.body.translation();
    cameraGroundY = p.y;
    camera.position.set(
      p.x - Math.sin(skater.heading) * 6.2,
      p.y + 1.65 + lookPitch * 2.5,
      p.z - Math.cos(skater.heading) * 6.2,
    );
    camera.lookAt(p.x, p.y + 0.7, p.z);
    camera.fov = preferences.fov;
    camera.updateProjectionMatrix();
  }
  snapCamera();
  const navigation = new NavigationMap();
  let waypoint: Goal | null = null;
  function mapState(): MapState {
    const p = skater.body.translation();
    let goal = waypoint;
    if (active && active.activity.kind !== "jam") {
      const g = routeFor(active.activity)[active.gate];
      if (g) goal = { ...g, label: "NEXT CHECKPOINT" };
    }
    if (spotRun?.status === "riding" && spotRun.course.kind !== "jam") {
      const g = spotRun.course.gates[spotRun.gate];
      goal = { x: g.x, z: g.z, label: "NEXT STUNT GATE" };
    }
    if (raceSession && (raceSession.run.status === "countdown" || raceSession.run.status === "racing")) {
      const g = raceSession.run.target(); goal = { ...g, label: "NEXT RACE CHECKPOINT" };
    }
    return {
      position: p,
      heading: skater.heading,
      speed: skater.speed,
      collected: save.collected,
      records: save.records,
      racers: raceSession?.rivals.map(r => ({ ...r.skater.body.translation() })) ?? [],
      rails: [...railGroups.values()].flat(),
      goal,
    };
  }
  function drawMap(c: HTMLCanvasElement, large = false) {
    const state = mapState();
    navigation.update(state);
    navigation.render(c, state, large);
    if (!large) {
      el("nav-goal").textContent = state.goal?.label || "FREE SKATE";
      el("nav-distance").textContent = state.goal
        ? Math.round(
            Math.hypot(
              state.goal.x - state.position.x,
              state.goal.z - state.position.z,
            ),
          ) + " m"
        : "M · SET A WAYPOINT";
      el("map-zoom").textContent = Math.round(navigation.radius * 2) + " m";
      el("map-area").textContent =
        Math.abs(state.position.x) < 200
          ? "WORLD LINK"
          : state.position.x < 0
            ? "GDAŃSK"
            : "RIYADH";
    }
  }
  el("map-zoom-in").onclick = () => {
    navigation.setZoom(-30);
    canvas.focus();
  };
  el("map-zoom-out").onclick = () => {
    navigation.setZoom(30);
    canvas.focus();
  };
  el("waypoint-clear").onclick = () => {
    waypoint = null;
    drawMap(el("world-map") as HTMLCanvasElement, true);
  };
  el("world-map").addEventListener("click", (e) => {
    const point = navigation.worldPoint(
      el("world-map") as HTMLCanvasElement,
      e.clientX,
      e.clientY,
    );
    if (!point) {
      toast("Choose a street, path, or plaza");
      return;
    }
    waypoint = { ...point, label: "YOUR WAYPOINT" };
    drawMap(el("world-map") as HTMLCanvasElement, true);
  });
  let audioContext: AudioContext | undefined, noiseGain: GainNode | undefined;
  el("audio").onchange = () => {
    if ((el("audio") as HTMLInputElement).checked && !audioContext) {
      audioContext = new AudioContext();
      const buffer = audioContext.createBuffer(
        1,
        audioContext.sampleRate * 2,
        audioContext.sampleRate,
      );
      const d = buffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 700;
      noiseGain = audioContext.createGain();
      source
        .connect(filter)
        .connect(noiseGain)
        .connect(audioContext.destination);
      source.start();
    }
    audioContext?.resume();
  };
  applyPreferences(preferences);
  const previousPosition = new THREE.Vector3().copy(skater.body.translation()),
    interpolatedPosition = new THREE.Vector3();
  let accumulator = 0,
    last = performance.now(),
    simTime = 0,
    frames = 0,
    lastBanked = 0,
    fps = 60;
  function frame(now: number) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (automaticQuality) {
      slowFrames = Math.max(0, slowFrames + (elapsed > 0.045 ? 1 : -0.4));
      if (slowFrames > 6) {
        automaticQuality = false;
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * 0.5);
        renderer.shadowMap.enabled = false;
        renderer.setSize(innerWidth, innerHeight);
      }
    }
    const c = controls();
    touch.show(playing && !paused);
    // Stream one cell per rendered frame, never repeatedly inside a physics catch-up loop.
    stream();
    buildNextChunk();
    if (!paused) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        const rails = [...railGroups.values()].flat();
        skater.tick(raceSession?.run.locked ? idle() : c, rails);
        raceSession?.beforeStep();
        spotScene.tick(simTime + STEP);
        actions.clear();
        c.jumpPressed = false;
        c.jumpRelease = false;
        c.tricks = [];
        previousPosition.copy(skater.body.translation());
        world.step();
        simTime += STEP;
        raceSession?.afterStep(); recordRace();
        tickSpot();
        accumulator -= STEP;
        const p = skater.body.translation();
        if (waypoint && Math.hypot(p.x - waypoint.x, p.z - waypoint.z) < 5) {
          waypoint = null;
          toast("Waypoint reached");
        }
        if (!inWorld(p.x, p.z) || p.y < -2) recover();
        safeTimer += STEP;
        if (safeTimer > 2 && skater.grounded && skater.speed < 10) {
          safe = { x: p.x, z: p.z };
          safeTimer = 0;
        }
        if (active) {
          active.time += STEP;
          const a = active.activity;
          if (a.kind === "jam") {
            if (active.time >= 90) finishEvent();
          } else {
            const route = routeFor(a),
              g = route[active.gate];
            gate.position.set(g.x, 3, g.z);
            if (Math.hypot(p.x - g.x, p.z - g.z) < 6) {
              active.gate++;
              if (active.gate === route.length) {
                if (a.kind === "line" && skater.jumpCount === active.jumps) {
                  toast("Add a jump to complete this line. Try again.");
                  active = null;
                  gate.visible = false;
                  el("event").classList.add("hidden");
                } else finishEvent();
              }
            }
          }
        }
      }
    } else accumulator = 0;
    const physicalPosition = skater.body.translation();
    interpolatedPosition.copy(physicalPosition);
    if (!paused && previousPosition.distanceTo(interpolatedPosition) < 3)
      interpolatedPosition.lerpVectors(
        previousPosition,
        interpolatedPosition,
        accumulator / STEP,
      );
    const p = interpolatedPosition,
      speed = skater.speed;
    skyDome.position.copy(camera.position);
    nearestRace = !active && spotRun?.status !== "riding" && !raceSession ? races.find(r => Math.hypot(p.x - r.start.x, p.z - r.start.z) < 11) : undefined;
    raceScene.update(raceSession?.run ?? null, p.x, p.z);
    crowd.update(simTime, crowdPlayer(), raceSession?.visuals(simTime) ?? []);
    const local = crowd.director.nearbyRider(crowdPlayer());
    localsButton.textContent = crowd.director.follower ? `Riding with ${crowd.director.follower.name} · End` : local ? `${mobileDevice ? "" : "N · "}Ride with ${local.name}` : "Meet a local rider";
    localsButton.disabled = !local && !crowd.director.follower;
    localsButton.hidden = mobileDevice && spotRun?.status === "riding";
    spotScene.animate(simTime);
    updateSpotCard();
    updateRaceCard();
    const rideButton = document.querySelector<HTMLButtonElement>('#touch-controls [data-command="event"]');
    if (rideButton) rideButton.textContent = raceSession?.run.status === "finished" ? "Replay" : nearestRace || raceSession ? "Race" : "Ride";
    rider.position.set(p.x, p.y - 0.83, p.z);
    rider.rotation.y =
      skater.heading +
      skater.airRotation +
      skater.landingYawOffset +
      (skater.switchStance ? Math.PI : 0);

    const cinematic =
      !el("menu").classList.contains("hidden") ||
      !el("wardrobe-screen").classList.contains("hidden") ||
      (!el("settings-screen").classList.contains("hidden") &&
        settingsReturn === "menu");
    rider.rotation.y = cinematic
      ? 0
      : skater.heading +
        skater.airRotation +
        skater.landingYawOffset +
        (skater.switchStance ? Math.PI : 0);
    avatar.animate(
      skater,
      c,
      paused ? 0 : elapsed,
      (x, z) => {
        const origin = { x, y: skater.body.translation().y + 1, z };
        const hit = world.castRay(
          new RAPIER.Ray(origin, { x: 0, y: -1, z: 0 }),
          3,
          true,
          undefined,
          undefined,
          skater.collider,
          skater.body,
        );
        return hit ? origin.y - hit.timeOfImpact : null;
      },
      cinematic,
    );
    if (cinematic) {
      const drift = preferences.reducedMotion
        ? 0
        : Math.sin(now * 0.00012) * 0.15;
      camera.setViewOffset(
        innerWidth,
        innerHeight,
        -innerWidth * 0.2,
        0,
        innerWidth,
        innerHeight,
      );
      const wardrobe = !el("wardrobe-screen").classList.contains("hidden");
      const detail = wardrobe && wardrobeDetail;
      camera.position.set(
        p.x + (detail ? 0.65 : wardrobe ? 1.4 : 2.4) + (detail ? 0 : drift),
        p.y + (detail ? 1.06 : wardrobe ? 1.25 : 1.35),
        p.z + (detail ? 1.35 : wardrobe ? 2.7 : 3.7),
      );
      camera.lookAt(p.x, p.y + (detail ? 0.82 : wardrobe ? 0.7 : 0.3), p.z);
      camera.fov = detail ? 32 : wardrobe ? 40 : 43;
      camera.updateProjectionMatrix();
      rider.rotation.y = detail ? THREE.MathUtils.degToRad(Number((el("rider-turn") as HTMLInputElement).value)) : 0;
    } else if (playing) {
      camera.clearViewOffset();
      if (preferences.autoCenter && !dragging && now - lastLook > 2500)
        lookYaw = THREE.MathUtils.damp(lookYaw, 0, 2, elapsed);
      const yaw = skater.heading + lookYaw,
        dynamic = preferences.motion && !preferences.reducedMotion;
      const distance = 6.2 + (dynamic ? speed * 0.085 : 0);
      if (skater.grounded || skater.grinding)
        cameraGroundY = THREE.MathUtils.damp(cameraGroundY, p.y, 9, elapsed);
      const followY = cameraGroundY + (p.y - cameraGroundY) * 0.35;
      target.set(p.x, p.y + 0.65, p.z);
      desired.set(
        p.x - Math.sin(yaw) * distance,
        followY + 1.65 + lookPitch * 2.5,
        p.z - Math.cos(yaw) * distance,
      );
      camera.position.lerp(desired, 1 - Math.exp(-elapsed * 7));
      // Test the actual smoothed position with a volume. Pull inward immediately;
      // smoothing an obstructed camera through a wall caused visible clipping.
      const delta = camera.position.clone().sub(target);
      const length = delta.length();
      if (length > 0.001) {
        delta.divideScalar(length);
        const hit = world.castShape(target, { x: 0, y: 0, z: 0, w: 1 }, delta,
          cameraShape, 0.02, length, true, undefined, undefined, skater.collider, skater.body);
        if (hit) camera.position.copy(target).addScaledVector(delta, Math.max(0.05, hit.time_of_impact - 0.04));
      }
      camera.lookAt(target);
      camera.fov = THREE.MathUtils.damp(
        camera.fov,
        preferences.fov + (dynamic ? speed * 0.45 : 0),
        2,
        elapsed,
      );
      camera.updateProjectionMatrix();
    }
    const blend = THREE.MathUtils.smoothstep(p.x, -180, 180);
    const sky = new THREE.Color(0x9dbdc4).lerp(
      new THREE.Color(0xd9c3a0),
      blend,
    );
    (scene.background as THREE.Color).copy(sky);
    (scene.fog as THREE.Fog).color.copy(sky);
    skyDome.material.uniforms.turbidity.value = THREE.MathUtils.lerp(3, 9, blend);
    skyDome.material.uniforms.rayleigh.value = THREE.MathUtils.lerp(2.8, 0.7, blend);
    skyDome.material.uniforms.mieCoefficient.value = THREE.MathUtils.lerp(0.003, 0.015, blend);
    skyDome.material.uniforms.sunPosition.value.set(-0.45, THREE.MathUtils.lerp(0.8, 0.42, blend), 0.45);
    hemi.color.setHex(blend > 0.5 ? 0xf6dfba : 0xd5e6ff);
    hemi.groundColor.setHex(blend > 0.5 ? 0x9c794b : 0x627b78);
    sun.intensity = THREE.MathUtils.lerp(2.2, 3.6, blend);
    sun.color.setHex(blend > 0.5 ? 0xffd49a : 0xe5efff);
    sun.position.set(p.x - 60, THREE.MathUtils.lerp(110, 55, blend), p.z + 60);
    sun.target.position.set(p.x, 0, p.z);
    nearest = activities.find((a) => Math.hypot(p.x - a.x, p.z - a.z) < 7);
    tokenMeshes.forEach((m, i) => {
      if (save.collected.includes(tokens[i].id)) {
        m.visible = false;
        return;
      }
      const t = tokens[i],
        d = Math.hypot(p.x - t.x, p.z - t.z);
      m.visible = d < 260;
      if (m.visible) {
        m.rotation.y = simTime;
        m.position.y = 1.5 + Math.sin(simTime * 2 + i) * 0.2;
        if (!paused && d < 1.8 && p.y < 4) {
          save.collected.push(t.id);
          m.visible = false;
          persist();
          toast(`Route token · ${save.collected.length} / 120`);
        }
      }
    });
    eventMeshes.forEach(
      (m, i) =>
        (m.visible =
          !active &&
          Math.hypot(p.x - activities[i].x, p.z - activities[i].z) < 240),
    );
    if (noiseGain)
      noiseGain.gain.setTargetAtTime(
        !paused && preferences.audio
          ? (((Math.min(0.12, speed * 0.008) * preferences.master) / 100) *
              preferences.effects) /
              100
          : 0,
        audioContext!.currentTime,
        0.1,
      );
    if (now > toastUntil) el("toast").classList.remove("visible");
    {
      el("speed").textContent = String(Math.round(speed * 3.6));
      el("charge").style.width = `${(skater.charge / 0.6) * 100}%`;
      el("stance").textContent = skater.grinding
        ? "GRIND"
        : !skater.grounded
          ? "AIR"
          : skater.manualActive
            ? "MANUAL"
            : skater.slideAmount > 0.3
              ? "POWERSLIDE"
            : c.brake
              ? "BRAKE"
              : c.crouch
                ? "TUCK"
                : c.throttle
                  ? "PUSH"
                  : "COAST";
      el("city-name").textContent =
        Math.abs(p.x) < 200 ? "World Link" : p.x < 0 ? "Gdańsk" : "Riyadh";
      el("district-name").textContent =
        Math.abs(p.x) < 200
          ? "Two cities. One ride."
          : p.x < 0
            ? "Baltic Lines"
            : "Olaya & heritage landmarks";
      el("score").textContent = skater.combo
        ? Math.round(skater.combo).toLocaleString()
        : "";
      el("multiplier").textContent = skater.combo
        ? `×${skater.multiplier.toFixed(2)}`
        : "";
      el("trick").textContent = skater.liveTrick || (skater.combo ? skater.lastTrick : "");
      el("hint").innerHTML =
        nearestRace ? `<kbd>Enter / Y</kbd> JOIN ${nearestRace.name}` : nearest && !active && !raceSession
          ? `<kbd>Enter / Y</kbd> ${nearest.district} · ${nearest.kind.toUpperCase()}`
          : "<kbd>WASD</kbd> skate · <kbd>Space</kbd> jump · <kbd>Z/C</kbd> 180 · <kbd>F/X/V/B</kbd> stunts · <kbd>E</kbd> rail assist · <kbd>H</kbd> controls · <kbd>M</kbd> map";
      if (active) {
        el("event").classList.remove("hidden");
        el("event").innerHTML =
          `<small>${active.activity.kind.toUpperCase()}</small><strong>${active.activity.district}</strong>${active.activity.kind === "jam" ? `${Math.ceil(90 - active.time)}s left · ${skater.banked - active.scoreStart} banked points` : `${active.time.toFixed(1)}s · gate ${active.gate + 1}/5`}`;
      }
      if (frames++ % 3 === 0) drawMap(el("minimap") as HTMLCanvasElement);
      fps = THREE.MathUtils.lerp(fps, 1 / Math.max(0.001, elapsed), 0.1);
      el("debug").textContent =
        `${Math.round(fps)} fps · ${renderer.info.render.calls} calls\n${chunks.size} chunks · ${Math.round(renderer.info.render.triangles / 1000)}k tris\nx ${p.x.toFixed(1)} z ${p.z.toFixed(1)} y ${p.y.toFixed(2)}\n${skater.grounded ? "grounded" : "airborne"} · ${speed.toFixed(2)} m/s`;
    }
    if (skater.banked > lastBanked) {
      const earned = skater.banked - lastBanked;
      lastBanked = skater.banked;
      if (earned > save.best) {
        save.best = earned;
        persist();
      }
      toast(`Combo banked · ${earned.toLocaleString()}`);
    }
    renderer.render(scene, camera);
  }
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    pause();
    toast("Graphics context lost. Reload to restore; progress is saved.");
  });
  el("play").removeAttribute("disabled");
  el("play").innerHTML =
    `<span class="play-triangle" aria-hidden="true"></span><span>Find your line</span><span class="button-arrow">${uiArrow}</span>`;
  document
    .querySelectorAll<HTMLButtonElement>("[data-ready]")
    .forEach((button) => (button.disabled = false));
  refreshLobby();
  el("loading").textContent = "READY TO RIDE · SOLO SESSION";
  // Read-only diagnostics let browser checks verify real physics and world transitions.
  Object.assign(window, {
    __skate: {
      get state() {
        const p = skater.body.translation();
        return {
          position: { ...p },
          speed: skater.speed,
          grounded: skater.grounded,
          grinding: skater.grinding ? { ...skater.grinding } : null,
          grindingDistance: skater.grindingDistance,
          spot: spotRun ? { id: spotRun.course.id, gate: spotRun.gate, elapsed: spotRun.elapsed, status: spotRun.status, medal: spotRun.medal } : null,
          spotStamps: courses.filter(c => save.records[c.id] !== undefined).length,
          crowd: crowd.diagnostics,
          race: raceSession ? { id: raceSession.run.definition.id, status: raceSession.run.status, countdown: raceSession.run.countdown, elapsed: raceSession.run.elapsed, position: raceSession.run.position, gate: raceSession.run.player.gate, totalGates: raceSession.run.totalGates, finish: raceSession.run.player.finish, standings: raceSession.run.standings().map(r => ({ id: r.id, name: r.name, gate: r.gate, finish: r.finish, position: { ...r.position } })) } : null,
          nearbyRace: nearestRace?.id ?? null,
          raceResults: { ...(save.raceResults ?? {}) },
          touch: { enabled: touch.enabled, ...touch.state },
          cameraLook: { yaw: lookYaw, pitch: lookPitch },
          grindStyle: skater.grindStyle,
          riderVertices: avatar.vertexCount,
          appearance: avatar.appearance,
          landmarks: cityLandmarks.length,
          surface: skater.surface,
          navigation: {
            radius: navigation.radius,
            goal: mapState().goal,
            routePoints: navigation.route.length,
          },
          chunks: chunks.size,
          jumps: skater.jumpCount,
          verticalSpeed: skater.body.linvel().y,
          airRotation: skater.airRotation,
          liveTrick: skater.liveTrick,
          lastTrick: skater.lastTrick,
          combo: skater.combo,
          banked: skater.banked,
          simTime,
          heading: skater.heading,
          queuedChunks: chunkQueue.length,
          paused,
          preferences: { ...preferences },
          rendering: {
            fps: Math.round(fps),
            drawCalls: renderer.info.render.calls,
            pixelRatio: renderer.getPixelRatio(),
            shadows: renderer.shadowMap.enabled,
            exposure: renderer.toneMappingExposure,
            fov: camera.fov,
          },
          collected: save.collected.length,
        };
      },
      travel,
    },
  });
  requestAnimationFrame(frame);
}
boot().catch((error) => {
  console.error(error);
  el("error").classList.remove("hidden");
  el("error-text").textContent =
    `${error instanceof Error ? error.message : String(error)}. Try a current desktop browser with WebGL2 enabled.`;
});
