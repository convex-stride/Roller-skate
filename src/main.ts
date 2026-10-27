import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { cityReflections, balticFoliage } from "./world-art";
import { NightLighting, nightGeometries } from "./night";
import { iceRinks, iceAt, iceVenueAt, rinkArrival, rinkEntrance } from "./ice-rinks";
import { buildIceArenas } from "./ice-scene";
import { figureMoves } from "./figure-skating";
import type { FigureAction } from "./input";
import { IceGame, recordIceWin, validIceRecords, type IceGameMode, type IceRecords } from "./ice-games";
import { createIcePlayUI } from "./ice-play-ui";
import { createIcePlayScene } from "./ice-play-scene";
import { surface, waterMaterial, waterTime } from "./world-materials";
import { RAPIER, Skater, STEP, idle, type Rail } from "./physics";
import { ActionBuffer, createGamepadReader } from "./input";
import { createTouchControls } from "./touch";
import { createRider } from "./rider";
import { NavigationMap, type Goal, type MapState } from "./navigation";
import { buildCityLandmarks, modernArchitecture } from "./landmarks";
import { courses, spots, SpotRun, type Course } from "./spots";
import { buildSpots } from "./spot-scene";
import { createCrowd } from "./crowd-scene";
import { races, placeLabel, type RaceDefinition } from "./races";
import { RaceSession } from "./race-session";
import { buildRaceScene } from "./race-scene";
import { decorateDistrict } from "./district-scene";
import { quests, QuestRun, questXP, validQuestSnapshot, type QuestDefinition, type QuestSnapshot } from "./quests";
import { buildQuestScene } from "./quest-scene";
import { streetBankGeometry } from "./street-bank";
import { Companion, type PartnerMode } from "./companion";
import { destinations, destinationFor, destinationNear, type Destination } from "./destinations";
import { landmarks as cityLandmarks, cityStarts, practiceRails } from "./city-profile";
import { menus } from "./menus";
import { loadPreferences, bindPreferences, type Preferences } from "./settings";
import {
  architecture,
  streetDetails,
  arrivalDistrict,
  buildingGeometries,
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
import "./quests.css";
import "./companion.css";
import "./ice.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
const uiArrow =
  '<svg class="ui-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13L13 3M3 3h10v10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
app.innerHTML = `<canvas id="scene" aria-label="Layan's Skate skating world"></canvas>
<div id="hud" class="hidden"><div class="topbar"><div class="brand">LAYAN'S SKATE<small>INLINE / OPEN WORLD</small></div><div class="city"><strong id="city-name">Gdańsk</strong><span id="district-name">Baltic Lines</span></div></div>
<div class="telemetry"><div class="speed"><span id="speed">0</span><small>KM/H</small></div><div class="bar"><i id="charge"></i></div><div class="stance" id="stance">COAST</div></div>
<div class="combo"><b id="score"></b><span id="multiplier"></span><p id="trick"></p></div>
<div class="event hidden" id="event"></div><div id="toast" class="toast" role="status"></div>
<div class="hint" id="hint"><kbd>WASD</kbd> skate &nbsp; <kbd>Space</kbd> jump &nbsp; <kbd>E</kbd> rail assist &nbsp; <kbd>M</kbd> map &nbsp; <kbd>Esc</kbd> pause</div>
<div class="map-wrap"><canvas id="minimap" width="370" height="200"></canvas><small>GDANSK — WORLD LINK — RIYADH</small></div><div id="debug" class="debug hidden"></div></div>
${menus.replaceAll("↗", uiArrow).replaceAll("V0.3 / LOBBY UPDATE", "V0.21 / FIGURE FLOW").replaceAll("An original inline skating experiment. Original procedural artwork and synthesized skate audio.", "Original city artwork and skating systems. Rider anatomy adapted from MakeHuman core assets (CC0).")}
<div id="help" class="overlay hidden"><div class="panel"><div class="eyebrow">Find your flow</div><h2>Learn the streets.</h2><div class="controls"><div><b>W / ↑ · S / ↓</b>Push / friction brake</div><div><b>A D / ← →</b>Carve left / right</div><div><b>Space</b>Jump on press · hold for height</div><div><b>Shift</b>Crouch, reduce air resistance</div><div><b>Land on a rail</b>Auto grind · Space pop off · S exit</div><div><b>Q · G</b>Hold manual · hold powerslide</div><div><b>Tap Z / C</b>180 left / right · tap twice for 360</div><div><b>Tap F / X</b>Safety grab / mute tweak · soul / royale on rails</div><div><b>Tap V / B</b>Spread eagle / stalefish grab in air</div><div><b>Mouse drag · H</b>Look around · controls</div><div><b>N · Ride with a local</b>Invite a nearby skater for 45 seconds</div><div><b>Enter · Race flag</b>Join a nearby race or event</div><div><b>R · M · Escape</b>Recover · map · pause</div><div><b>Controller</b>Left stick roll/steer · right stick look</div><div><b>Controller tricks</b>A jump · LB grind · RB manual · X grab<br>LT/RT tap 180 · left stick click slide · Y event · B recover · Start pause</div></div><p>Press Space to take off immediately. Hold briefly for a higher arc. Tap Z or C during the jump, then F or X to add style. A second spin tap adds another 180°. Jump onto a rail while moving along it to lock in automatically. Hold E for extra catch assistance. Space pops off, S releases; reaching the end also releases. F and X switch grind style. Land tricks to score; coast briefly to bank a combo.</p><p class="notice">Gravity: 9.81 m/s² · Rider mass: 75 kg · Drag, rolling resistance, lateral grip and rigid-body collisions</p><button class="primary" id="help-close">Got it</button></div></div>
<div id="map" class="overlay hidden"><div class="panel map-panel"><div class="eyebrow">One world, two perspectives</div><h2>Your next line.</h2><canvas class="map-large" id="world-map" width="900" height="420"></canvas><p class="map-label">Gdańsk ← skate through World Link → Riyadh. Choose an event below to travel to its starting point.</p><div class="challenge-list" id="challenge-list"></div><div class="actions"><button class="primary" id="map-close">Back to skating</button></div></div></div>
<div id="error" class="overlay hidden"><div class="panel"><h2>We couldn’t start the ride.</h2><p id="error-text"></p><button onclick="location.reload()">Try again</button></div></div>`;
const el = (id: string) => document.getElementById(id)!;
el("hud").insertAdjacentHTML("beforeend", `<aside id="quest-card" class="hidden" aria-label="Neighbourhood quest"><small id="quest-area"></small><strong id="quest-title"></strong><p id="quest-dialogue"></p><b id="quest-objective"></b><span id="quest-progress"></span><small id="quest-xp"></small><div class="quest-actions"><button id="quest-accept">Accept quest</button><button id="quest-interact">Interact</button><button id="quest-abandon">Abandon quest</button><button id="quest-close">Close</button></div></aside>`);
el("hud").insertAdjacentHTML("beforeend", `<aside id="ice-card" class="hidden" aria-label="Ice arena"><small>MALL ICE · STADIUM SEATING</small><strong id="ice-name"></strong><span id="ice-status"></span><div class="ice-actions"><button id="ice-play">Moves & games</button><button id="ice-enter">Enter ice</button><button id="ice-partner">Skate with Taqee</button><button id="ice-exit">Mall entrance</button></div></aside>`);
el("help").querySelector(".controls")!.insertAdjacentHTML("beforeend", "<div><b>J · Neighbourhood quests</b>Find local jobs · Enter / Y to accept or interact</div>");
el("quest-interact").insertAdjacentHTML("afterend", '<button id="quest-bank" hidden>Ride bank</button>');
document.querySelectorAll(".rider-profile > span:last-child").forEach(node => { node.innerHTML = "LAYAN<small>FREESTYLE RIDER</small>"; });
document.querySelector(".rider-caption strong")!.textContent = "LAYAN / INLINE";
el("app").insertAdjacentHTML("beforeend", `<button id="partner-toggle" class="hidden" aria-controls="partner-panel" aria-expanded="false">Call Taqee</button><aside id="partner-panel" class="hidden" aria-label="Taqee companion commands"><h3>Taqee & Layan</h3><p id="partner-status"></p><div class="partner-actions"><button data-partner="call">Come here</button><button data-partner="follow">Follow me</button><button data-partner="pairs">Ice skating partner</button><button data-partner="guide">Lead the way</button><button data-partner="tricks">Practise tricks</button><button data-partner="cheer">Cheer me on</button><button data-partner="wait">Wait here</button><button data-partner="race">Race me</button><button data-partner="quest">Find a quest</button><button data-partner="dismiss">See you later</button><button data-partner="close">Close</button></div></aside>`);
el("help").querySelector(".controls")!.insertAdjacentHTML("beforeend", "<div><b>P · Call Taqee</b>Follow, guide, tricks, wait or race together</div>");
el("help").querySelector(".controls")!.insertAdjacentHTML("beforeend", "<div><b>1 / 2 / 3 / 4 · flips</b>Front / back / left side / right side. Tap again for a double.</div><div><b>Controller D-pad</b>Up frontflip · down backflip · left/right side flip</div>");
el("help").querySelector("p")!.insertAdjacentText("beforeend", " Flip buttons hop automatically from the ground. Hold Jump for more height. Combine a flip with Z/C and a grab. Doubles need extra airtime from a bank; unfinished rotations can bail.");
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
el("map-zoom").insertAdjacentHTML("beforebegin", '<span class="quest-key"><i></i>QUEST</span>');
document.querySelector(".map-label")!.textContent =
  `All ${quests.length} quests are marked in gold (green when complete). Select a marker or destination for a route. Focus on a city for more detail. Blue is Taqee.`;
el("world-map").insertAdjacentHTML("beforebegin", `<div class="map-tools" aria-label="Map view"><button data-map-city="world" aria-pressed="true">Both cities</button><button data-map-city="gdansk" aria-pressed="false">Gdańsk</button><button data-map-city="riyadh" aria-pressed="false">Riyadh</button></div>`);
document.querySelector('[aria-label="Map view"]')!.insertAdjacentHTML("beforeend", '<button id="map-pin-mode" aria-pressed="false">Pin a spot</button>');
el("challenge-list").insertAdjacentHTML("beforebegin", `<section id="map-selection" class="hidden" aria-label="Selected destination"><strong id="map-selected-name"></strong><span id="map-route-detail"></span><div class="actions"><button id="map-follow-route">Follow route</button><button id="map-partner-guide">Ask Taqee to lead</button><button id="map-selected-travel">Travel here</button></div></section><div class="map-tools"><button id="map-route-mode" aria-pressed="true">Guide me</button><button id="map-travel-mode" aria-pressed="false">Fast travel</button><input id="map-search" type="search" aria-label="Search map destinations" placeholder="Find quests, parks, places…"></div>`);
let preferences = loadPreferences();
const mobileDevice = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
type Save = {
  version: number;
  collected: string[];
  records: Record<string, number>;
  outfit: number;
  best: number;
  raceResults?: Record<string, { time: number; place: number; wins: number }>;
  completedQuests?: string[];
  questProgress?: QuestSnapshot;
  partnerActive?: boolean;
  iceRecords?: IceRecords;
  partnerRaceResults?: Record<string, { time: number; place: number; wins: number; best?: number }>;
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
    (s.completedQuests === undefined || (Array.isArray(s.completedQuests) && new Set(s.completedQuests).size === s.completedQuests.length && s.completedQuests.every(id => quests.some(q => q.id === id)))) &&
    (s.questProgress === undefined || validQuestSnapshot(s.questProgress)) &&
    (s.iceRecords === undefined || validIceRecords(s.iceRecords)) &&
    (s.partnerActive === undefined || typeof s.partnerActive === "boolean") &&
    (s.partnerRaceResults === undefined || (s.partnerRaceResults !== null && typeof s.partnerRaceResults === "object" && Object.entries(s.partnerRaceResults).every(([id, result]) => races.some(r => r.id === id) && !!result && Number.isFinite(result.time) && result.time > 0 && Number.isInteger(result.place) && result.place >= 1 && result.place <= 2 && Number.isInteger(result.wins) && result.wins >= 0 && (result.best === undefined || (Number.isFinite(result.best) && result.best > 0))))) &&
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
const completionCount = () => Object.keys(save.records).length + (save.completedQuests?.length ?? 0) + Object.keys(save.iceRecords ?? {}).length;
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
  const reflections = cityReflections(renderer);
  scene.environment = reflections.gdansk;
  scene.environmentIntensity = .48;
  const skyDome = new Sky();
  skyDome.scale.setScalar(1400);
  skyDome.material.uniforms.turbidity.value = 3.5;
  skyDome.material.uniforms.rayleigh.value = 1.8;
  skyDome.material.uniforms.mieCoefficient.value = 0.004;
  skyDome.material.uniforms.mieDirectionalG.value = 0.8;
  skyDome.material.uniforms.sunPosition.value.set(-0.45, 0.75, 0.45).multiplyScalar(450000);
  scene.add(skyDome);
  scene.background = new THREE.Color(0x9dbdc4);
  scene.fog = new THREE.Fog(0x9dbdc4, 160, 680);
  const camera = new THREE.PerspectiveCamera(
    59,
    innerWidth / innerHeight,
    0.1,
    1700,
  );
  const hemi = new THREE.HemisphereLight(0xdcebf4, 0x726852, .8);
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
  sun.shadow.normalBias = .035;
  scene.add(sun, sun.target);
  const nightLighting = new NightLighting(scene, mobileDevice);
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
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
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
  const foliage = balticFoliage();
  const sharedGeometries: THREE.BufferGeometry[] = [boxGeo, cylGeo, sphereGeo, leafGeo, foliage.geometry, ...buildingGeometries, ...nightGeometries];
  const streetBankMeshes = new Map<string, THREE.BufferGeometry>();
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
    waterMaterial(),
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
    const trunk = cylinder(g, x, 2.8, z, city === "gdansk" ? 0.24 : 0.3, 5.6, 0x786b51);
    trunk.material = surface("timber", 0x887c68);
    if (city === "gdansk") {
      const crown = new THREE.Mesh(foliage.geometry, foliage.material);
      crown.position.set(x, 6.5 + hash(x, z) * .7, z);
      crown.rotation.y = hash(x, z) * Math.PI * 2;
      crown.scale.setScalar(1 + hash(x, z, 4) * .25);
      crown.castShadow = true; crown.receiveShadow = true; g.add(crown);
      for (const side of [-1, 1]) {
        const branch = cylinder(g, x + side * .45, 4.8, z, .12, 2.1, 0x786b51);
        branch.rotation.z = side * .55;
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
  function batchInstances(g: THREE.Group, allGeometry = false) {
    const batches = new Map<string, THREE.Mesh[]>();
    for (const child of [...g.children])
      if (
        child instanceof THREE.Mesh &&
        child.visible &&
        (allGeometry || sharedGeometries.includes(child.geometry))
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
    decorateDistrict(g, cx, cz, city, kit, (group, p) => {
      const data = streetBankGeometry(p), key = `${p.w}:${p.d}:${p.h}`;
      if (!streetBankMeshes.has(key)) {
        const local = streetBankGeometry({ ...p, x: 0, z: 0 }), geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(local.vertices, 3)); geometry.setIndex(new THREE.BufferAttribute(local.indices, 1)); geometry.computeVertexNormals();
        streetBankMeshes.set(key, geometry); sharedGeometries.push(geometry);
      }
      const bank = new THREE.Mesh(streetBankMeshes.get(key)!, material(city === "gdansk" ? 0x809c9f : 0xb7a387)); bank.position.set(p.x, 0, p.z); bank.castShadow = true; bank.receiveShadow = true; group.add(bank);
      const collider = world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices, data.indices).setFriction(0.05));
      const colliders = collidersByGroup.get(group) ?? []; colliders.push(collider); collidersByGroup.set(group, colliders);
    });
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
  batchInstances(landmarks, true);
  const spotScene = buildSpots(scene, world, { box, cylinder, tree, rail, material });
  const raceScene = buildRaceScene(scene);
  const questScene = buildQuestScene(scene);
  spotScene.groups.forEach(g => batchInstances(g));
  batchInstances(spotScene.group);
  const iceScene = buildIceArenas(scene, { box, cylinder, tree, rail, material }, mobileDevice, g => batchInstances(g));
  const crowd = await createCrowd(scene, world, skater.body, mobileDevice);
  const companion = new Companion(world, skater);
  const iceEffects = createIcePlayScene(scene);
  let iceRun: IceGame | null = null, iceAwarded = false;
  const emptyIceRecords: IceRecords = {};
  let restorePartner = !!save.partnerActive;
  const partnerLabelCanvas = document.createElement("canvas"); partnerLabelCanvas.width = 256; partnerLabelCanvas.height = 64;
  const partnerLabelContext = partnerLabelCanvas.getContext("2d")!; partnerLabelContext.fillStyle = "#16363ee8"; partnerLabelContext.fillRect(0, 0, 256, 64); partnerLabelContext.fillStyle = "#bce9f7"; partnerLabelContext.font = "bold 30px Arial"; partnerLabelContext.textAlign = "center"; partnerLabelContext.fillText("TAQEE", 128, 44);
  const partnerLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(partnerLabelCanvas), depthTest: true })); partnerLabel.scale.set(1.6, 0.4, 1); partnerLabel.visible = false; scene.add(partnerLabel);
  function togglePartner() {
    iceUI.close();
    if (!companion.active) { companion.call(); save.partnerActive = companion.active; persist(); }
    const open = el("partner-panel").classList.contains("hidden");
    el("partner-panel").classList.toggle("hidden", !open); el("partner-toggle").setAttribute("aria-expanded", String(open));
  }
  el("partner-toggle").onclick = togglePartner;
  el("partner-panel").onclick = e => {
    const command = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-partner]")?.dataset.partner;
    if (!command) return;
    if (raceSession?.duet && command !== "race" && command !== "close") stopRace();
    if (command === "close") { el("partner-panel").classList.add("hidden"); el("partner-toggle").setAttribute("aria-expanded", "false"); }
    else if (command === "dismiss") { companion.dismiss(); save.partnerActive = false; persist(); el("partner-status").textContent = "Taqee: Call me whenever you want to skate again, Layan."; }
    else if (command === "call") { companion.call(); save.partnerActive = companion.active; persist(); }
    else if (command === "race") {
      companion.call(); save.partnerActive = companion.active; persist();
      const p = skater.body.translation();
      const race = [...races].filter(r => r.city === cityAt(p.x)).sort((a, b) => Math.hypot(a.start.x - p.x, a.start.z - p.z) - Math.hypot(b.start.x - p.x, b.start.z - p.z))[0];
      startRace(race, true); el("partner-panel").classList.add("hidden");
    } else if (command === "quest") {
      const p = skater.body.translation(), q = [...quests].filter(q => !save.completedQuests?.includes(q.id)).sort((a, b) => Math.hypot(a.anchor.x - p.x, a.anchor.z - p.z) - Math.hypot(b.anchor.x - p.x, b.anchor.z - p.z))[0];
      if (q) { setDestination({ ...q.anchor, label: `${q.title} · ${q.giver}` }); companion.command("guide", waypoint); }
      else companion.message = "We’ve helped everyone! Pick a park for a celebration skate.";
    } else { companion.command(command as PartnerMode, mapState().goal); save.partnerActive = companion.active; persist(); }
    if (command !== "dismiss") el("partner-status").textContent = `Taqee: ${companion.message}`;
    save.partnerActive = companion.active; persist();
    canvas.focus();
  };
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
  let nearestQuest: QuestDefinition | undefined;
  let focusedQuest: QuestDefinition | null = null;
  let dismissedQuest: string | null = null;
  let questRun: QuestRun | null = save.questProgress ? new QuestRun(quests.find(q => q.id === save.questProgress!.id)!, skater.banked, save.questProgress) : null;
  let nearestRace: RaceDefinition | undefined;
  let raceSession: RaceSession | null = null;
  let lastCountdownLabel = "";
  let spotRun: SpotRun | null = null;
  let spotChoice = 0;
  let spotCity: City = "gdansk";
  let suggestedPark: string | null = null;
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
  el("spot-next").onclick = () => { stopSpot(); spotChoice = (spotChoice + 1) % courses.filter(c => c.spot.city === spotCity).length; };
  el("spot-leave").onclick = () => { stopSpot(); toast("Free skate · the whole spot is yours"); canvas.focus(); };
  function tickSpot() {
    if (!spotRun || !spotRun.isRunning()) return;
    const p = skater.body.translation();
    spotRun.tick({ ...p, grounded: skater.grounded, jumps: skater.jumpCount, score: skater.banked }, STEP);
    if (spotRun.status === "finished") {
      const c = spotRun.course, value = c.kind === "jam" ? skater.banked - spotRun.initialScore : spotRun.elapsed;
      const before = Math.min(6, 2 + Math.floor(completionCount() / 2));
      const old = save.records[c.id];
      if (old === undefined || (c.kind === "jam" ? value > old : value < old)) save.records[c.id] = value;
      const after = Math.min(6, 2 + Math.floor(completionCount() / 2));
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
    const p = skater.body.translation();
    const nearbyPark = spots.find(s => Math.abs(p.x - s.x) < s.size[0] / 2 + 10 && Math.abs(p.z - s.z) < s.size[1] / 2 + 10);
    if (!nearbyPark) suggestedPark = null;
    if (!spotRun && nearbyPark && suggestedPark !== nearbyPark.id) {
      spotCity = nearbyPark.city; spotChoice = courses.filter(c => c.spot.city === spotCity).findIndex(c => c.spot.id === nearbyPark.id); suggestedPark = nearbyPark.id;
    }
    const c = spotRun?.course ?? selectedCourse(), running = spotRun?.status === "riding";
    el("spot-card").classList.toggle("hidden", (!spotRun && !nearbyPark) || !!active || !!raceSession || !!nearestRace || (spotRun?.status !== "riding" && (!!focusedQuest || !!nearestQuest || !!questRun)));
    el("spot-kicker").textContent = spotRun?.status === "finished" ? `${spotRun.medal} MEDAL · STAMP EARNED` : spotRun?.status === "failed" ? "ONE MORE TRY?" : c.spot.name;
    el("spot-title").textContent = c.name;
    el("spot-detail").textContent = running
      ? `${Math.ceil(c.limit - spotRun!.elapsed)}s · ${c.kind === "jam" ? `${skater.banked - spotRun!.initialScore} / 300 banked points` : `${spotRun!.gate + 1}/${c.gates.length} · ${c.gates[spotRun!.gate].label}`}`
      : c.description;
    const count = completionCount(), stamps = courses.filter(c => save.records[c.id] !== undefined).length;
    el("spot-reward").textContent = `${stamps}/${courses.length} spot stamps · ${count >= 8 ? "All jacket colours unlocked" : `${2 - count % 2} more completion${count % 2 ? "" : "s"} unlock a jacket`}`;
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
  function startRace(definition: RaceDefinition, duet = false) {
    stopRace(); stopSpot(); active = null; gate.visible = false; waypoint = null;
    el("event").classList.add("hidden");
    if (crowd.director.follower) crowd.director.invite(crowdPlayer());
    skater.bank(); raceSession = new RaceSession(world, skater, definition, duet);
    safe = { ...definition.start }; lookYaw = 0;
    stream(true); closeMenus(); snapCamera();
    toast(`${definition.name} · ${duet ? "Layan vs Taqee" : "3 rivals"} · ${definition.laps === 1 ? "sprint" : `${definition.laps} laps`} · wait for GO`);
  }
  function visitPark(id: string) {
    const park = spots.find(s => s.id === id)!;
    const course = courses.find(c => c.spot.id === id)!;
    stopRace(); stopSpot(); active = null; gate.visible = false; waypoint = null;
    el("event").classList.add("hidden");
    spotCity = park.city; spotChoice = courses.filter(c => c.spot.city === spotCity).findIndex(c => c.id === course.id); suggestedPark = park.id;
    skater.reset(course.start.x, course.start.z); skater.heading = 0; safe = { ...course.start }; lookYaw = 0;
    stream(true); closeMenus(); snapCamera();
    toast(`${park.name} · ${park.layout.toUpperCase()} PARK · free skate or start a session`);
  }
  function visitRink(id: string, entrance = false) {
    const rink = iceRinks.find(r => r.id === id)!;
    iceRun = null; iceUI.close();
    stopRace(); stopSpot(); active = null; gate.visible = false; waypoint = null; focusedQuest = null;
    el("event").classList.add("hidden");
    const point = entrance ? rinkEntrance(rink) : rinkArrival(rink);
    skater.bank(); skater.reset(point.x, point.z); skater.heading = 0; safe = { ...point }; lookYaw = 0; lookPitch = .1;
    stream(true); closeMenus(); snapCamera();
    toast(entrance ? `${rink.name} · Walk through the entrance to reach the ice` : `${rink.name} · Ice blades fitted · Glide, jump, or invite Taqee`);
  }
  function performFigure(id: FigureAction) {
    const p = skater.body.translation();
    if (!iceAt(p.x, p.z) || !skater.grounded) { toast("Start figure moves with your blades on the ice."); return; }
    if (skater.figure.action) return;
    actions.trick(id); iceUI.close(); canvas.focus();
  }
  function startIceGame(mode: IceGameMode) {
    const p = skater.body.translation(), rink = iceAt(p.x, p.z);
    if (!rink) { toast("Enter the ice to start an arena game."); return; }
    visitRink(rink.id);
    if (mode === "duet") { companion.call(); companion.command("pairs"); save.partnerActive = companion.active; persist(); }
    iceRun = new IceGame(rink, mode, skater.figure.completed, companion.skater?.figure.completed ?? 0); iceAwarded = false;
    el("partner-panel").classList.add("hidden");
    toast(`${iceRun.title} · ${mode === "slalom" ? "Follow the gold gates" : "Use Perform element to build your routine"}`);
  }
  function tickIceGame() {
    if (!iceRun) return;
    const p = skater.body.translation(), partner = companion.skater;
    iceRun.tick({ ...p, onIce: iceAt(p.x, p.z)?.id === iceRun.rink.id, grounded: skater.grounded, figure: skater.figure.lastResult,
      partner: partner ? { ...partner.body.translation(), active: true, generation: companion.spawnId, figure: partner.figure.lastResult } : null }, STEP);
    if (iceRun.status === "won" && !iceAwarded) {
      iceAwarded = true; save.iceRecords = recordIceWin(save.iceRecords ?? {}, iceRun);
      skater.combo += 300; skater.bank(); persist(); refreshLobby(); iceEffects.celebrate(p.x, p.z); toast(iceRun.message);
    }
  }
  el("ice-play").onclick = () => { el("partner-panel").classList.add("hidden"); iceUI.open(); };
  el("ice-enter").onclick = () => { const p = skater.body.translation(), r = iceVenueAt(p.x, p.z, 8); if (r) visitRink(r.id); };
  el("ice-exit").onclick = () => { const p = skater.body.translation(), r = iceVenueAt(p.x, p.z, 8); if (r) visitRink(r.id, true); };
  el("ice-partner").onclick = () => {
    const p = skater.body.translation(), r = iceVenueAt(p.x, p.z, 8); if (!r) return;
    if (!iceAt(p.x, p.z)) visitRink(r.id);
    companion.call(); companion.command("pairs"); save.partnerActive = companion.active; persist();
    toast(`Taqee: ${companion.message}`); canvas.focus();
  };
  el("race-join").onclick = () => { if (nearestRace) startRace(nearestRace); };
  el("race-restart").onclick = () => { if (raceSession) startRace(raceSession.run.definition, raceSession.duet); };
  el("race-leave").onclick = () => { stopRace(); canvas.focus(); toast("Free skate · race left"); };
  function startNearby() {
    if (raceSession) { if (raceSession.run.status === "finished" || raceSession.run.status === "timeout") startRace(raceSession.run.definition, raceSession.duet); return; }
    const p = skater.body.translation(), rink = iceVenueAt(p.x, p.z, 8);
    if (iceRun?.targetMove) { performFigure(iceRun.targetMove); return; }
    if (rink) { if (iceAt(p.x, p.z)) el("ice-partner").click(); else visitRink(rink.id); return; }
    if (focusedQuest || (nearestQuest && !questRun)) { acceptQuest(focusedQuest ?? nearestQuest!); return; }
    if (questRun) { interactQuest(); return; }
    if (nearestRace) startRace(nearestRace);
    else if (nearest) startEvent(nearest);
    else startSpot(spotRun?.course ?? selectedCourse());
  }
  const questPlayer = () => ({ ...skater.body.translation(), speed: skater.speed, score: skater.banked, flipId: skater.flipLandings, flipKind: skater.lastLandedFlip });
  function visitQuest(definition: QuestDefinition) {
    stopRace(); stopSpot(); active = null; gate.visible = false; waypoint = null;
    el("event").classList.add("hidden");
    focusedQuest = questRun?.definition.id === definition.id ? null : definition;
    skater.reset(definition.anchor.x, definition.anchor.z - 5); skater.heading = 0; lookYaw = 0;
    safe = { x: definition.anchor.x, z: definition.anchor.z - 5 };
    stream(true); closeMenus(); snapCamera(); toast(`${definition.giver} · ${definition.area}`);
  }
  function acceptQuest(definition: QuestDefinition) {
    if (Math.hypot(skater.body.translation().x - definition.anchor.x, skater.body.translation().z - definition.anchor.z) > 8) { toast("Skate closer to the quest giver"); return; }
    focusedQuest = null; dismissedQuest = null; questRun = new QuestRun(definition, skater.banked); save.questProgress = questRun.snapshot(); persist();
    questRun.syncFlip(skater.flipLandings);
    toast(`${definition.giver}: ${definition.kind === "delivery" ? "Bundle collected. Follow the first delivery marker." : definition.kind === "collect" ? "Find the three supply crates, then return here." : definition.kind === "discover" ? "Stop and inspect each marked place." : definition.kind === "flip" ? "Land two different flip styles nearby, then come back." : "Bank 300 points nearby, then come back."}`); canvas.focus();
  }
  function interactQuest() {
    if (!questRun) return;
    if (questRun.stage === "failed") { acceptQuest(questRun.definition); return; }
    if (questRun.stage === "complete") return;
    const result = questRun.interact(questPlayer());
    if (result === "slow") toast("Slow down before interacting");
    else if (result === "far") toast("Follow the quest marker and get within 5 m");
    else if (result === "waiting") toast(questRun.definition.kind === "flip" ? "Land two different flip styles here · 1–4 or phone Backflip / More" : "Land and bank 300 points in this courtyard");
    else if (result === "collected") {
      const point = questRun.definition.objectives[questRun.visited.at(-1)!];
      toast(point.detail ?? (questRun.stage === "return" ? `All done here · return to ${questRun.definition.giver}` : `${point.label} · ${questRun.visited.length}/3 ${questRun.definition.kind === "delivery" ? "deliveries made" : "supplies recovered"}`));
    }
    else if (result === "complete") {
      const before = completionCount(), q = questRun.definition;
      save.completedQuests ??= [];
      const fresh = !save.completedQuests.includes(q.id);
      if (fresh) save.completedQuests.push(q.id);
      delete save.questProgress;
      const unlocked = Math.min(6, 2 + Math.floor(completionCount() / 2)) > Math.min(6, 2 + Math.floor(before / 2));
      toast(`${q.giver}: Thank you! · ${fresh ? `+${q.reward} XP` : "Quest replay completed"}${unlocked ? " · NEW JACKET COLOUR" : ""}`);
    }
    if (result !== "complete") save.questProgress = questRun.snapshot();
    persist(); canvas.focus();
  }
  el("quest-accept").onclick = () => { const q = focusedQuest ?? nearestQuest ?? questRun?.definition; if (q) acceptQuest(q); };
  el("quest-interact").onclick = interactQuest;
  el("quest-bank").onclick = () => {
    const q = focusedQuest ?? questRun?.definition ?? nearestQuest;
    if (!q || q.kind !== "flip") return;
    skater.bank(); skater.reset(q.anchor.x + 9, q.anchor.z - 1); skater.heading = 0; lookYaw = 0;
    safe = { x: q.anchor.x + 9, z: q.anchor.z - 1 }; stream(true); snapCamera(); canvas.focus();
    toast(mobileDevice ? "Push up the bank · hold JUMP near the top · tap Backflip twice for a double" : "Push up the bank · hold Space + Shift near the top · tap a flip key twice for a double");
  };
  el("quest-abandon").onclick = () => { questRun = null; delete save.questProgress; persist(); toast("Quest left · you can accept it again from its giver"); canvas.focus(); };
  el("quest-close").onclick = () => { dismissedQuest = (focusedQuest ?? questRun?.definition ?? nearestQuest)?.id ?? null; focusedQuest = null; if (questRun?.stage === "complete") questRun = null; canvas.focus(); };
  function tickQuest() {
    if (!questRun) return;
    if (raceSession || active || spotRun?.status === "riding") { questRun.syncScore(skater.banked, skater.flipLandings); return; }
    const stage = questRun.stage;
    questRun.tick(questPlayer(), STEP);
    if (questRun.stage !== "complete") save.questProgress = questRun.snapshot();
    if (stage !== questRun.stage) { persist(); toast(questRun.stage === "failed" ? "Delivery time expired · return to the giver to retry" : `Challenge complete · return to ${questRun.definition.giver}`); }
  }
  function updateQuestCard() {
    const q = focusedQuest ?? questRun?.definition ?? nearestQuest;
    const suspended = !!raceSession || !!active || spotRun?.status === "riding";
    el("quest-card").classList.toggle("hidden", !q || suspended);
    if (!q || suspended) return;
    const run = !focusedQuest && questRun?.definition.id === q.id ? questRun : null;
    el("quest-area").textContent = `${q.area.toUpperCase()} · ${run?.stage === "complete" ? "QUEST COMPLETE" : "LOCAL QUEST"}`;
    el("quest-title").textContent = q.title;
    el("quest-dialogue").textContent = run ? `${q.giver} · ${run.stage === "complete" ? "Thanks for helping the neighbourhood!" : run.stage === "failed" ? "Come back and we can try that delivery run again." : run.stage === "return" ? "Come back when you’re ready to hand everything in." : q.kind === "style" ? "Keep the tricks in this courtyard and bank your combo." : "Follow the markers. Stop before you interact."}` : q.request;
    const target = run?.goal(skater.body.translation()), distance = target ? Math.round(Math.hypot(target.x - skater.body.translation().x, target.z - skater.body.translation().z)) : 0;
    el("quest-objective").textContent = !run ? save.completedQuests?.includes(q.id) ? "Already completed · replay for practice" : `Reward: ${q.reward} XP · Accept at the quest giver` : run.stage === "complete" ? "Reward saved · explore another district" : run.stage === "failed" ? "Return to the quest giver to retry" : run.stage === "return" ? `Return to ${q.giver} · ${distance} m` : q.kind === "style" ? `${Math.min(300, Math.floor(run.stylePoints))}/300 banked points` : `${q.kind === "delivery" ? "Deliver" : q.kind === "collect" ? "Recover" : "Inspect"} · ${run.visited.length}/3 done · ${distance} m`;
    if (run?.stage === "objectives" && q.kind === "flip") { el("quest-objective").textContent = `${run.flipTypes.length}/2 different flips landed · tap 1–4 / phone Backflip + More`; el("quest-dialogue").textContent = `${q.giver}: Try front, back or side flips. Use the bank for height. Land on your wheels!`; }
    el("quest-progress").textContent = run && q.limit !== null && run.stage !== "complete" ? `${Math.max(0, Math.ceil(q.limit - run.elapsed))}s remaining` : "";
    el("quest-xp").textContent = `${questXP(save.completedQuests ?? [])} XP · ${save.completedQuests?.length ?? 0}/${quests.length} local quests complete`;
    el("quest-accept").hidden = !!run; el("quest-interact").hidden = !run || run.stage === "complete";
    el("quest-accept").textContent = focusedQuest && questRun && questRun.stage !== "complete" ? "Switch to this quest" : save.completedQuests?.includes(q.id) ? "Replay quest" : "Accept quest";
    el("quest-interact").textContent = run?.stage === "return" ? "Hand in quest" : run?.stage === "failed" ? "Retry quest" : q.kind === "discover" ? "Inspect" : q.kind === "delivery" ? "Deliver" : q.kind === "collect" ? "Collect" : "Check progress";
    el("quest-abandon").hidden = !run || run.stage === "complete"; el("quest-close").hidden = !!run && run.stage !== "complete";
    el("quest-bank").hidden = q.kind !== "flip" || run?.stage === "return" || run?.stage === "failed";
    if (mobileDevice && q.kind === "flip") { el("quest-accept").textContent = "Accept"; if (run?.stage === "objectives") el("quest-interact").textContent = "Check"; el("quest-bank").textContent = "Bank"; el("quest-abandon").textContent = "Leave"; }
    else el("quest-abandon").textContent = "Abandon quest";
  }
  function updateRaceCard() {
    const run = raceSession?.run, definition = run?.definition ?? nearestRace;
    el("race-card").classList.toggle("hidden", !definition);
    if (!definition) { el("race-countdown").classList.add("hidden"); return; }
    el("race-area").textContent = `${definition.area.toUpperCase()} · STREET RACE`;
    el("race-title").textContent = definition.name;
    el("race-join").hidden = !!run; el("race-restart").hidden = !run; el("race-leave").hidden = !run;
    const result = raceSession?.duet ? save.partnerRaceResults?.[definition.id] : save.raceResults?.[definition.id];
    const best = raceSession?.duet ? save.partnerRaceResults?.[definition.id]?.best ?? result?.time : save.records[definition.id];
    el("race-best").textContent = `${best === undefined ? "No personal best yet" : `Best ${best.toFixed(2)}s`}${result ? ` · ${result.wins} win${result.wins === 1 ? "" : "s"}` : ""}`;
    if (!run) {
      el("race-stats").textContent = `Layan + 3 local riders · ${definition.laps === 1 ? "Point-to-point sprint" : `${definition.laps} laps`} · Enter / Ride to join`;
      el("race-standings").replaceChildren(); el("race-countdown").classList.add("hidden"); return;
    }
    const finished = run.status === "finished", timeout = run.status === "timeout";
    const lap = Math.min(definition.laps, Math.floor(run.player.gate / definition.checkpoints.length) + 1);
    el("race-stats").innerHTML = `<b>${finished ? `${placeLabel(run.position)} FINISH` : timeout ? "TIME’S UP" : `${run.position} / ${run.entrants.length}`}</b><span>${raceSession?.duet ? "LAYAN VS TAQEE · " : ""}${(run.player.finish ?? run.elapsed).toFixed(2)}s · ${finished ? "RESULT SAVED" : timeout ? "Retry for a result" : `LAP ${lap}/${definition.laps} · CP ${Math.min(run.totalGates, run.player.gate + 1)}/${run.totalGates}`}</span>`;
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
    if (raceSession.duet) {
      save.partnerRaceResults ??= {};
      const previous = save.partnerRaceResults[id];
      save.partnerRaceResults[id] = { time, place: run.position, wins: (previous?.wins ?? 0) + Number(run.position === 1), best: Math.min(previous?.best ?? previous?.time ?? time, time) };
      persist(); toast(`${placeLabel(run.position)} · Layan vs Taqee · ${time.toFixed(2)}s`); return;
    }
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
      `${save.collected.length} / 120 TOKENS  ·  ${completionCount()} / ${activities.length + courses.length + races.length + quests.length + 18} CHALLENGES`;
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
      `${save.collected.length}/120 route tokens · ${completionCount()}/${activities.length + courses.length + races.length + quests.length + 18} challenges completed · Best combo ${save.best.toLocaleString()}`;
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
    toast(mobileDevice ? "Tap Backflip to hop + flip · More has front/side flips · hold JUMP for height" : "1–4 hop + flip · Space for height · Z/C spin · F grab · J → Flip challenges");
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
    refreshQuestList();
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
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    const destination = button ? destinationFor(button) : undefined;
    if (destination && !mapTravel && !e.altKey) { setDestination({ x: destination.x, z: destination.z, label: destination.label }, destination); return; }
    selectedDestination = null; el("map-selection").classList.add("hidden");
    const questButton = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-quest]");
    if (questButton) { visitQuest(quests.find(q => q.id === questButton.dataset.quest)!); return; }
    const parkButton = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-park]");
    if (parkButton) { visitPark(parkButton.dataset.park!); return; }
    const rinkButton = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-rink]");
    if (rinkButton) { visitRink(rinkButton.dataset.rink!); return; }
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
      lookYaw = 0;
      lookPitch = l.h > 45 ? -.12 : .1;
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
  el("challenge-list").insertAdjacentHTML("afterbegin", spots.map(s => `<button data-park="${s.id}">Park: ${s.name}<small>${s.city === "gdansk" ? "Gdańsk" : "Riyadh"} · ${s.layout.toUpperCase()} · free skate</small></button>`).join(""));
  el("challenge-list").insertAdjacentHTML("afterbegin", iceRinks.map(r => `<button data-rink="${r.id}">Ice arena: ${r.name}<small>${r.city === "gdansk" ? "Gdańsk" : "Riyadh"} · ${r.theme} · Taqee pairs skating</small></button>`).join(""));
  el("challenge-list").insertAdjacentHTML("afterbegin", quests.map(q => `<button data-quest="${q.id}"></button>`).join(""));
  function refreshQuestList() {
    el("challenge-list").querySelectorAll<HTMLButtonElement>("[data-quest]").forEach(button => {
      const q = quests.find(q => q.id === button.dataset.quest)!;
      button.textContent = `Quest: ${q.title} · ${q.giver}`;
      if (q.kind === "flip") button.dataset.flip = q.id;
      const detail = document.createElement("small"); detail.textContent = `${q.city === "gdansk" ? "Gdańsk" : "Riyadh"} · ${q.area} · ${save.completedQuests?.includes(q.id) ? "COMPLETED" : `+${q.reward} XP`}`; button.append(detail);
    });
  }
  refreshQuestList();
  el("challenge-list").insertAdjacentHTML("beforebegin", `<nav class="map-filters" aria-label="Map destinations">${[["all", "All"], ["quest", "Quests"], ["flip", "Flip challenges"], ["park", "Skate parks"], ["rink", "Ice arenas"], ["race", "Races"], ["course", "Sessions"], ["landmark", "Landmarks"], ["event", "Events"]].map(([value, label]) => `<button data-map-filter="${value}" aria-pressed="${value === "all"}">${label}</button>`).join("")}</nav>`);
  document.querySelectorAll<HTMLButtonElement>("[data-map-filter]").forEach(button => button.onclick = () => {
    mapFilter = button.dataset.mapFilter!;
    document.querySelectorAll<HTMLButtonElement>("[data-map-filter]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    filterDestinations();
  });
  function filterDestinations() {
    const search = (el("map-search") as HTMLInputElement).value.trim().toLocaleLowerCase();
    el("challenge-list").querySelectorAll<HTMLButtonElement>("button").forEach(b => { b.hidden = (mapFilter !== "all" && b.dataset[mapFilter] === undefined) || (!!search && !b.textContent!.toLocaleLowerCase().includes(search)); });
  }
  el("map-search").oninput = filterDestinations;
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
      2 + Math.floor(completionCount() / 2),
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
      `${available} / 6 colours unlocked. Complete two different events, sessions, races or quests to unlock another.`;
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
    a.download = "layans-skate-save.json";
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
      questRun = save.questProgress ? new QuestRun(quests.find(q => q.id === save.questProgress!.id)!, skater.banked, save.questProgress) : null;
      questRun?.syncFlip(skater.flipLandings);
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
  const iceUI = createIcePlayUI({ move: performFigure, game: startIceGame, stop: () => { iceRun = null; canvas.focus(); }, partner: () => { companion.call(); companion.command("pairs"); save.partnerActive = companion.active; persist(); } });
  const touch = createTouchControls(actions, {
    pause, map: showMap, recover,
    event: startNearby, figure: () => iceUI.open(),
    toast,
  });
  if (touch.enabled) {
    el("help").querySelector(".controls")!.insertAdjacentHTML("afterbegin", "<div><b>Phone thumbstick</b>Up to push · sideways to turn · down to brake</div><div><b>Jump + tricks</b>Hold JUMP; tap 180, Grab or Tweak with another finger</div><div><b>More · drag view</b>Extra tricks and held moves · drag empty space to look</div>");
    el("help").querySelector("p")!.textContent = "Use both thumbs: keep pushing with the stick while you jump and tap tricks. Rails catch automatically. The More tray has spread eagle, stalefish, crouch, manual, slide and rail assist. Ride opens a nearby challenge; Map lets you choose any stunt spot. Portrait and landscape both work.";
    el("help").querySelector("p")!.insertAdjacentText("beforeend", " Tap Backflip to hop and flip. More has front and side flips. Hold JUMP for height, then tap a flip twice for a double off a bank.");
  }
  el("help").querySelector(".controls")!.insertAdjacentHTML("beforeend", "<div><b>I · Figure on phone</b>Ice moves, games and medals</div><div><b>5–9 · 0 / L / K</b>Spins & glides · Axel / Salchow / toe loop</div>");
  el("help").querySelector("p")!.insertAdjacentText("beforeend", " On ice, open Figure or press I for eight assisted figure moves and three arena games. Taqee mirrors moves in pairs mode. Brake cancels an element. Arena medals use game scoring.");
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
      if (iceUI.opened) { iceUI.close(); canvas.focus(); return; }
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
      const figure = figureMoves.find(m => m.key === e.key.toUpperCase());
      if (figure) performFigure(figure.id);
      if (e.code === "KeyI") iceUI.open();
      if (e.code === "Space") actions.pressJump();
      if (e.code === "KeyZ") actions.trick("left");
      if (e.code === "KeyC") actions.trick("right");
      if (e.code === "KeyF") actions.trick("grab");
      if (e.code === "KeyX") actions.trick("tweak");
      if (e.code === "KeyV") actions.trick("star");
      if (e.code === "KeyB") actions.trick("stale");
      if (e.code === "Digit1") actions.trick("frontflip");
      if (e.code === "Digit2") actions.trick("backflip");
      if (e.code === "Digit3") actions.trick("leftflip");
      if (e.code === "Digit4") actions.trick("rightflip");
      if (e.code === "KeyH") { pause(); showHelp(); }
      if (e.code === "KeyT") startSpot(spotRun?.course ?? selectedCourse());
      if (e.code === "KeyN") inviteLocal();
      if (e.code === "KeyP") togglePartner();
      if (e.code === "KeyJ") { (el("map-search") as HTMLInputElement).value = ""; showMap(); document.querySelector<HTMLButtonElement>('[data-map-filter="quest"]')!.click(); }
    }
    if (e.code === "KeyR" && !e.repeat) recover();
    if (e.code === "Enter" && !e.repeat && (nearest || nearestRace || raceSession || questRun || nearestQuest || focusedQuest)) startNearby();
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
  window.addEventListener("pagehide", persist);
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
        -0.6,
        0.7,
      );
      lastLook = performance.now();
    }
  });
  let previousPadJump = false,
    previousPadLeft = false,
    previousPadRight = false,
    previousPadGrab = false,
    previousPadUp = false, previousPadDown = false, previousPadFlipLeft = false, previousPadFlipRight = false,
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
      if (!paused && btn(12) && !previousPadUp) actions.trick("frontflip");
      if (!paused && btn(13) && !previousPadDown) actions.trick("backflip");
      if (!paused && btn(14) && !previousPadFlipLeft) actions.trick("leftflip");
      if (!paused && btn(15) && !previousPadFlipRight) actions.trick("rightflip");
      previousPadUp = btn(12); previousPadDown = btn(13); previousPadFlipLeft = btn(14); previousPadFlipRight = btn(15);
      c.slide ||= btn(10);
      if (btn(9) && !previousStart) {
        if (iceUI.opened) { iceUI.close(); canvas.focus(); }
        else if (!el("settings-screen").classList.contains("hidden"))
          settingsUI.close();
        else if (paused) closeMenus();
        else pause();
      }
      previousStart = btn(9);
      if (btn(3) && !previousY && (nearest || nearestRace || raceSession || questRun || nearestQuest || focusedQuest) && !paused) startNearby();
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
          -0.6,
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
    if (iceRun?.status === "playing") { iceRun.status = "failed"; iceRun.message = "Recovered. Play again for a fresh routine."; }
    if (raceSession) { startRace(raceSession.run.definition, raceSession.duet); return; }
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
      p.y + 1.65 + Math.max(-.2, lookPitch) * 2.5,
      p.z - Math.cos(skater.heading) * 6.2,
    );
    camera.lookAt(p.x, p.y + .65 + Math.max(0, -lookPitch) * 8, p.z);
    camera.fov = preferences.fov;
    camera.updateProjectionMatrix();
  }
  snapCamera();
  const navigation = new NavigationMap();
  let waypoint: Goal | null = null;
  let mapTravel = false, pinMode = false, mapFilter = "all";
  let selectedDestination: Destination | null = null;
  const routeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xb5eeea, transparent: true, opacity: 0.7 })); routeLine.frustumCulled = false; scene.add(routeLine);
  let shownRoute: typeof navigation.route | null = null;
  function setDestination(goal: Goal, destination: Destination | null = null) {
    stopRace(); stopSpot(); active = null; gate.visible = false; el("event").classList.add("hidden"); focusedQuest = null;
    waypoint = { x: goal.x, z: goal.z, label: goal.label }; selectedDestination = destination;
    el("map-selection").classList.remove("hidden"); el("map-selected-name").textContent = goal.label;
    drawMap(el("world-map") as HTMLCanvasElement, true);
    const p = skater.body.translation(), metres = Math.round(Math.hypot(goal.x - p.x, goal.z - p.z));
    el("map-route-detail").textContent = navigation.route.length ? `${metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${metres} m`} · follow the mint route and destination marker` : "No clear ground route from here. Move onto a path or choose Travel here.";
    toast(`Route selected · ${goal.label}`);
  }
  function setMapTravel(travel: boolean) { mapTravel = travel; el("map-route-mode").setAttribute("aria-pressed", String(!travel)); el("map-travel-mode").setAttribute("aria-pressed", String(travel)); }
  el("map-route-mode").onclick = () => setMapTravel(false); el("map-travel-mode").onclick = () => setMapTravel(true);
  el("map-pin-mode").onclick = () => { pinMode = !pinMode; el("map-pin-mode").setAttribute("aria-pressed", String(pinMode)); };
  el("map-follow-route").onclick = () => { if (waypoint) { closeMenus(); toast(`Follow the route · ${waypoint.label}`); } };
  el("map-partner-guide").onclick = () => { companion.command("guide", waypoint); save.partnerActive = companion.active; persist(); closeMenus(); toast(`Taqee: ${companion.message}`); };
  el("map-selected-travel").onclick = () => {
    if (!waypoint) return;
    if (selectedDestination) { const d = selectedDestination, previous = mapTravel; mapTravel = true; el("challenge-list").querySelector<HTMLButtonElement>(`[data-${d.kind}="${d.key}"]`)!.click(); mapTravel = previous; }
    else { const goal = waypoint; skater.reset(goal.x, goal.z); safe = { x: goal.x, z: goal.z }; waypoint = null; stream(true); closeMenus(); snapCamera(); }
  };
  document.querySelectorAll<HTMLButtonElement>("[data-map-city]").forEach(button => button.onclick = () => {
    navigation.cityFocus = button.dataset.mapCity === "world" ? null : button.dataset.mapCity as City;
    const map = el("world-map") as HTMLCanvasElement; map.height = navigation.cityFocus ? 900 : 420; map.classList.toggle("city-focus", !!navigation.cityFocus);
    document.querySelectorAll<HTMLButtonElement>("[data-map-city]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    drawMap(el("world-map") as HTMLCanvasElement, true);
  });
  function mapState(): MapState {
    const p = skater.body.translation();
    let goal: Goal | null = null;
    if (questRun) { const point = questRun.goal(p); if (point) goal = { ...point, label: questRun.stage === "return" ? `RETURN TO ${questRun.definition.giver.toUpperCase()}` : point.label ?? questRun.definition.title }; }
    if (waypoint) goal = waypoint;
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
    if (iceRun?.goal) goal = iceRun.goal;
    return {
      position: p,
      heading: skater.heading,
      speed: skater.speed,
      collected: save.collected,
      records: save.records,
      completedQuests: save.completedQuests ?? [],
      partner: companion.active ? companion.state.position : null,
      racers: raceSession?.rivals.map(r => ({ ...r.skater.body.translation() })) ?? [],
      rails: [...railGroups.values()].flat(),
      goal,
    };
  }
  function drawMap(c: HTMLCanvasElement, large = false) {
    const state = mapState();
    navigation.update(state);
    navigation.render(c, state, large);
    if (shownRoute !== navigation.route) { shownRoute = navigation.route; routeLine.geometry.dispose(); routeLine.geometry = new THREE.BufferGeometry().setFromPoints(navigation.route.map(p => new THREE.Vector3(p.x, 0.1, p.z))); }
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
    waypoint = null; selectedDestination = null; el("map-selection").classList.add("hidden");
    drawMap(el("world-map") as HTMLCanvasElement, true);
  };
  el("world-map").addEventListener("click", (e) => {
    const map = el("world-map") as HTMLCanvasElement, raw = navigation.mapPoint(map, e.clientX, e.clientY);
    const hitRadius = (mobileDevice ? 18 : 10) * map.width / map.getBoundingClientRect().width / navigation.largeScale(map);
    const near = destinationNear(raw.x, raw.z, hitRadius);
    if (!pinMode && !e.shiftKey && near) { setDestination({ x: near.x, z: near.z, label: near.label }, near); return; }
    const point = navigation.worldPoint(
      el("world-map") as HTMLCanvasElement,
      e.clientX,
      e.clientY,
    );
    if (!point) {
      toast("Choose a street, path, or plaza");
      return;
    }
    setDestination({ ...point, label: "YOUR WAYPOINT" });
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
        companion.tick(mapState().goal, !!raceSession);
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
        tickQuest(); tickIceGame();
        accumulator -= STEP;
        const p = skater.body.translation();
        if (waypoint && Math.hypot(p.x - waypoint.x, p.z - waypoint.z) < 5) {
          waypoint = null; selectedDestination = null; el("map-selection").classList.add("hidden");
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
    if (restorePartner && skater.grounded) { restorePartner = false; companion.call(); }
    if (dismissedQuest && Math.hypot(p.x - quests.find(q => q.id === dismissedQuest)!.anchor.x, p.z - quests.find(q => q.id === dismissedQuest)!.anchor.z) > 14) dismissedQuest = null;
    if (focusedQuest && Math.hypot(p.x - focusedQuest.anchor.x, p.z - focusedQuest.anchor.z) > 14) focusedQuest = null;
    nearestQuest = !active && !raceSession && spotRun?.status !== "riding" ? quests.find(q => q.id !== dismissedQuest && Math.hypot(p.x - q.anchor.x, p.z - q.anchor.z) < 11) : undefined;
    nearestRace = !active && !questRun && !focusedQuest && spotRun?.status !== "riding" && !raceSession ? races.find(r => Math.hypot(p.x - r.start.x, p.z - r.start.z) < 11) : undefined;
    raceScene.update(raceSession?.run ?? null, p.x, p.z);
    const questActors = questScene.update(simTime, p.x, p.z, save.completedQuests ?? [], questRun, !raceSession && !active && spotRun?.status !== "riding");
    const partnerActor = companion.visual(simTime);
    crowd.update(simTime, crowdPlayer(), [...(partnerActor ? [partnerActor] : []), ...(raceSession?.visuals(simTime) ?? []), ...questActors]);
    const partnerPosition = raceSession?.duet ? raceSession.rivals[0]?.skater.body.translation() : partnerActor ? companion.state.position : null;
    partnerLabel.visible = !!partnerPosition && playing && !paused;
    if (partnerPosition) {
      partnerLabel.position.set(partnerPosition.x, partnerPosition.y + 1.45, partnerPosition.z);
      const depth = -partnerLabel.position.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const width = Math.min(1.6, (mobileDevice ? 85 : 100) * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(.1, depth) / innerHeight);
      partnerLabel.scale.set(width, width / 4, 1); partnerLabel.visible &&= depth > .5;
    }
    el("partner-toggle").classList.toggle("hidden", !playing || paused);
    el("partner-toggle").textContent = companion.active ? `Taqee · ${companion.mode}` : "Call Taqee";
    if (paused) el("partner-panel").classList.add("hidden");
    else if (companion.active) el("partner-status").textContent = `Taqee: ${companion.message}`;
    el("partner-toggle").setAttribute("aria-expanded", String(!el("partner-panel").classList.contains("hidden")));
    document.querySelectorAll<HTMLButtonElement>("[data-partner]").forEach(b => b.setAttribute("aria-pressed", String(companion.active && b.dataset.partner === companion.mode)));
    routeLine.visible = !!mapState().goal && playing && !paused;
    const local = crowd.director.nearbyRider(crowdPlayer());
    localsButton.textContent = crowd.director.follower ? `Riding with ${crowd.director.follower.name} · End` : local ? `${mobileDevice ? "" : "N · "}Ride with ${local.name}` : "Meet a local rider";
    localsButton.disabled = !local && !crowd.director.follower;
    localsButton.hidden = mobileDevice && spotRun?.status === "riding";
    spotScene.animate(simTime, p.x, p.z);
    iceScene.update(p.x, p.z);
    const currentRink = iceVenueAt(p.x, p.z, 8), onIce = !!iceAt(p.x, p.z);
    const visibleIceRun = iceRun?.rink.id === currentRink?.id ? iceRun : null;
    iceUI.update(currentRink, onIce, skater.figure.view, visibleIceRun, save.iceRecords ?? emptyIceRecords, paused);
    touch.setIce(onIce); iceEffects.update(iceRun, p, simTime, paused ? 0 : elapsed);
    el("ice-play").hidden = !onIce;
    el("ice-card").classList.toggle("hidden", !currentRink || paused || !!active || !!raceSession || !!visibleIceRun || iceUI.opened);
    if (currentRink) {
      el("ice-name").textContent = currentRink.name;
      el("ice-status").textContent = skater.figure.action ? skater.figure.message : onIce ? companion.active && companion.mode === "pairs" ? "Layan + Taqee · pairs skating" : "Ice blades fitted · smooth gliding" : "Skate hire · cafés · ice ahead";
      el("ice-enter").hidden = onIce;
      el("ice-partner").textContent = companion.active && companion.mode === "pairs" ? "Recall Taqee" : "Skate with Taqee";
    }
    updateSpotCard();
    updateRaceCard();
    updateQuestCard();
    if (currentRink) for (const id of ["spot-card", "quest-card", "race-card"]) el(id).classList.add("hidden");
    if (!el("partner-panel").classList.contains("hidden")) for (const id of ["spot-card", "quest-card", "race-card", "ice-card", "ice-run-card"]) el(id).classList.add("hidden");
    const rideButton = document.querySelector<HTMLButtonElement>('#touch-controls [data-command="event"]');
    if (rideButton) rideButton.textContent = currentRink ? iceRun?.targetMove ? "Move" : onIce ? "Partner" : "Ice" : raceSession?.run.status === "finished" ? "Replay" : nearestRace || raceSession ? "Race" : questRun ? "Interact" : nearestQuest || focusedQuest ? "Quest" : "Ride";
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
        (skater.switchStance ? Math.PI : 0) + skater.figure.rotation;
    rider.rotation.order = "YXZ";
    rider.rotation.x = cinematic ? 0 : skater.airPitch + skater.landingPitchOffset;
    rider.rotation.z = cinematic ? 0 : skater.airRoll + skater.landingRollOffset;
    if (!cinematic) {
      const rotatedHip = new THREE.Vector3(0, 0.9, 0).applyQuaternion(rider.quaternion);
      rider.position.set(p.x - rotatedHip.x, p.y + 0.07 - rotatedHip.y, p.z - rotatedHip.z);
    }
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
      target.set(p.x, p.y + .65 + Math.max(0, -lookPitch) * 8, p.z);
      desired.set(
        p.x - Math.sin(yaw) * distance,
        followY + 1.65 + Math.max(-.2, lookPitch) * 2.5,
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
    const night = preferences.nightMode;
    waterTime.value = simTime;
    scene.environment = night ? (blend > .5 ? reflections.nightRiyadh : reflections.nightGdansk) : (blend > .5 ? reflections.riyadh : reflections.gdansk);
    scene.environmentIntensity = night ? .7 : THREE.MathUtils.lerp(.48, .6, blend);
    skyDome.visible = !night;
    nightLighting.update(night, p, camera.position, [training, ...chunks.values()], elapsed);
    const sky = new THREE.Color(0x9dbdc4).lerp(
      new THREE.Color(0xd9c3a0),
      blend,
    );
    if (night) sky.setHex(blend > .5 ? 0x101421 : 0x080f21);
    (scene.background as THREE.Color).copy(sky);
    (scene.fog as THREE.Fog).color.copy(sky);
    skyDome.material.uniforms.turbidity.value = THREE.MathUtils.lerp(3, 9, blend);
    skyDome.material.uniforms.rayleigh.value = THREE.MathUtils.lerp(2.8, 1.2, blend);
    skyDome.material.uniforms.mieCoefficient.value = THREE.MathUtils.lerp(0.003, 0.015, blend);
    skyDome.material.uniforms.sunPosition.value.set(-0.45, THREE.MathUtils.lerp(0.8, 0.42, blend), 0.45).multiplyScalar(450000);
    skyDome.material.uniforms.cloudCoverage.value = THREE.MathUtils.lerp(.3, .04, blend);
    hemi.intensity = night ? .5 : .8;
    hemi.color.setHex(night ? 0xa4bde2 : blend > 0.5 ? 0xf6dfba : 0xd5e6ff);
    hemi.groundColor.setHex(night ? 0x182336 : blend > 0.5 ? 0x9c794b : 0x627b78);
    sun.intensity = night ? .65 : THREE.MathUtils.lerp(2.2, 3.6, blend);
    sun.color.setHex(night ? 0xa9c4ff : blend > 0.5 ? 0xffd49a : 0xe5efff);
    sun.position.set(p.x - 60, night ? 85 : THREE.MathUtils.lerp(110, 55, blend), p.z + (night ? -110 : 60));
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
        onIce ? "<kbd>I</kbd> Figure moves & games · <kbd>5–9</kbd> spins / glides · <kbd>0 / L / K</kbd> jumps · <kbd>S</kbd> cancel · <kbd>M</kbd> map" : nearestRace ? `<kbd>Enter / Y</kbd> JOIN ${nearestRace.name}` : nearest && !active && !raceSession
          ? `<kbd>Enter / Y</kbd> ${nearest.district} · ${nearest.kind.toUpperCase()}`
          : "<kbd>WASD</kbd> skate · <kbd>Space</kbd> jump · <kbd>1–4</kbd> flips · <kbd>Z/C</kbd> spin · <kbd>F</kbd> grab · <kbd>J</kbd> quests · <kbd>H</kbd> controls · <kbd>M</kbd> map";
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
          riderName: "Layan",
          companion: companion.state,
          rink: iceVenueAt(p.x, p.z) ? { id: iceVenueAt(p.x, p.z)!.id, onIce: !!iceAt(p.x, p.z) } : null,
          iceArenas: iceRinks.length,
          figure: skater.figure.view, iceGame: iceRun?.view ?? null, iceRecords: { ...save.iceRecords },
          position: { ...p },
          speed: skater.speed,
          grounded: skater.grounded,
          grinding: skater.grinding ? { ...skater.grinding } : null,
          grindingDistance: skater.grindingDistance,
          spot: spotRun ? { id: spotRun.course.id, gate: spotRun.gate, elapsed: spotRun.elapsed, status: spotRun.status, medal: spotRun.medal } : null,
          spotStamps: courses.filter(c => save.records[c.id] !== undefined).length,
          parks: spots.length,
          park: spots.find(s => Math.abs(p.x - s.x) < s.size[0] / 2 + 10 && Math.abs(p.z - s.z) < s.size[1] / 2 + 10)?.id ?? null,
          quest: questRun ? { ...questRun.snapshot(), goal: questRun.goal(p), targets: questRun.targets() } : null,
          nearbyQuest: (focusedQuest ?? nearestQuest)?.id ?? null,
          completedQuests: [...(save.completedQuests ?? [])],
          questXP: questXP(save.completedQuests ?? []),
          questCount: quests.length,
          crowd: crowd.diagnostics,
          race: raceSession ? { id: raceSession.run.definition.id, status: raceSession.run.status, countdown: raceSession.run.countdown, elapsed: raceSession.run.elapsed, position: raceSession.run.position, gate: raceSession.run.player.gate, totalGates: raceSession.run.totalGates, finish: raceSession.run.player.finish, standings: raceSession.run.standings().map(r => ({ id: r.id, name: r.name, gate: r.gate, finish: r.finish, position: { ...r.position } })) } : null,
          nearbyRace: nearestRace?.id ?? null,
          raceResults: { ...(save.raceResults ?? {}) },
          partnerRaceResults: { ...(save.partnerRaceResults ?? {}) },
          touch: { enabled: touch.enabled, ...touch.state },
          cameraLook: { yaw: lookYaw, pitch: lookPitch },
          grindStyle: skater.grindStyle,
          riderVertices: avatar.vertexCount,
          appearance: avatar.appearance,
          landmarks: cityLandmarks.length,
          surface: skater.surface,
          navigation: {
            cityFocus: navigation.cityFocus,
            selected: selectedDestination?.id ?? null,
            fastTravel: mapTravel,
            radius: navigation.radius,
            goal: mapState().goal,
            routePoints: navigation.route.length,
            route: navigation.route.map(point => ({ ...point })),
          },
          chunks: chunks.size,
          jumps: skater.jumpCount,
          verticalSpeed: skater.body.linvel().y,
          airRotation: skater.airRotation,
          airPitch: skater.airPitch,
          airRoll: skater.airRoll,
          flipKind: skater.flipKind,
          flipLandings: skater.flipLandings,
          lastLandedFlip: skater.lastLandedFlip,
          landingQuality: skater.lastLandingQuality,
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
            textures: renderer.info.memory.textures,
            triangles: renderer.info.render.triangles,
            lightProbe: scene.environment === reflections.gdansk || scene.environment === reflections.nightGdansk ? "gdansk" : "riyadh",
            night: nightLighting.diagnostics,
            fov: camera.fov,
          },
          collected: save.collected.length,
        };
      },
      travel,
      get destinations() { return destinations.map(d => ({ ...d, ...(d.marker ? { marker: { ...d.marker } } : {}) })); },
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
