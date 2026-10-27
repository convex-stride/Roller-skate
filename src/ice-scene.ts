import * as THREE from "three";
import { iceRinks, iceVenueAt, rinkSolids, VENUE_WIDTH, VENUE_LENGTH } from "./ice-rinks";
import { sign, type StreetKit } from "./environment";
import { surface, glazing } from "./world-materials";
import { hash } from "./world";

function iceMaterial() {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 1024;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#d4e7ed"; c.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 17000; i++) {
    const x = hash(i, 27) * 512, y = hash(i, 28) * 1024, length = 2 + hash(i, 29) * 15;
    c.strokeStyle = i % 3 ? "rgba(255,255,255,.13)" : "rgba(96,139,155,.09)"; c.lineWidth = .5;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + length, y + hash(i, 30) * 9 - 4); c.stroke();
  }
  c.strokeStyle = "#a76b7a"; c.lineWidth = 3;
  for (const y of [60, 512, 964]) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
  c.strokeStyle = "#578ea7"; c.lineWidth = 6;
  for (const y of [328, 696]) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
  c.lineWidth = 2; c.beginPath(); c.arc(256, 512, 78, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = "#b57c85";
  for (const x of [130, 382]) for (const y of [190, 834]) { c.beginPath(); c.arc(x, y, 60, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = "#799fab"; c.textAlign = "center"; c.font = "bold 22px sans-serif"; c.fillText("LAYAN’S SKATE", 256, 506); c.font = "12px sans-serif"; c.fillText("OPEN ICE · SKATE TOGETHER", 256, 529);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, color: 0xffffff, roughness: .22, metalness: .18, envMapIntensity: .4, emissive: 0x17313e, emissiveIntensity: .3 });
}
function iceGeometry() {
  const s = new THREE.Shape(); s.moveTo(-15, -24); s.lineTo(-15, 24); s.quadraticCurveTo(-15, 30, -9, 30); s.lineTo(9, 30); s.quadraticCurveTo(15, 30, 15, 24); s.lineTo(15, -24); s.quadraticCurveTo(15, -30, 9, -30); s.lineTo(-9, -30); s.quadraticCurveTo(-15, -30, -15, -24);
  const geometry = new THREE.ShapeGeometry(s, 16), p = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 30 + .5, p.getY(i) / 60 + .5);
  return geometry;
}

/** Six persistent physical arenas; only nearby arena art and indoor lights render. */
export function buildIceArenas(scene: THREE.Scene, k: StreetKit, mobile: boolean, batch: (g: THREE.Group) => void) {
  const sheetGeometry = iceGeometry(), sheetMaterial = iceMaterial();
  const glass = new THREE.MeshStandardMaterial({ color: 0xb7d9e7, transparent: true, opacity: .16, roughness: .15, metalness: .1, depthWrite: false });
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xe1f6ff });
  const groups = iceRinks.map(r => {
    const g = new THREE.Group(); scene.add(g);
    const { x, z } = r;
    const floor = k.box(g, x, .02, z, VENUE_WIDTH, .12, VENUE_LENGTH, 0x9faeb1, true); floor.material = surface("stone", 0xb7bfc0);
    const ice = new THREE.Mesh(sheetGeometry, sheetMaterial); ice.rotation.x = -Math.PI / 2; ice.position.set(x, .091, z); ice.receiveShadow = true; g.add(ice);
    const stands: ReturnType<typeof rinkSolids> = [];
    for (const s of rinkSolids(r)) {
      if (s.kind === "board") {
        const collider = k.box(g, s.x, s.y, s.z, s.w, s.h, s.d, 0xffffff, true); collider.visible = false;
        k.box(g, s.x, .605, s.z, s.w, 1.05, s.d, 0xe1e7e6);
        k.box(g, s.x, .18, s.z, s.w + .03, .16, s.d + .03, r.color);
        k.box(g, s.x, 1.14, s.z, s.w + .04, .08, s.d + .04, r.color);
        k.box(g, s.x, 1.88, s.z, s.w * .9, 1.4, s.d * .9, 0xb7d9e7).material = glass;
      } else {
        const mass = k.box(g, s.x, s.y, s.z, s.w, s.h, s.d, s.kind === "wall" ? 0x9ba6ab : 0x6a7b84, true);
        mass.material = surface(s.kind === "wall" ? "plaster" : "stone", s.kind === "wall" ? 0xb4bbbe : 0x9ca7a8);
        if (s.kind === "stand") stands.push(s);
      }
    }
    for (const s of stands) {
      const lateral = s.w < s.d, count = lateral ? 24 : 14;
      for (let n = 0; n < count; n++) {
        if (lateral && (n === 11 || n === 12)) continue; // Central stair aisle.
        const sx = lateral ? s.x : s.x - s.w / 2 + 1 + n * (s.w - 2) / (count - 1);
        const sz = lateral ? s.z - 27 + n * 54 / (count - 1) : s.z;
        k.box(g, sx, s.y + s.h / 2 + .3, sz, .7, .14, .7, n % 5 ? r.color : 0xcbd6d7);
        const back = k.box(g, sx + (lateral ? Math.sign(s.x - x) * .33 : 0), s.y + s.h / 2 + .65, sz + (lateral ? 0 : .33), lateral ? .12 : .7, .65, lateral ? .7 : .12, n % 5 ? r.color : 0xcbd6d7);
        back.castShadow = !mobile;
      }
    }
    // Mall shop fronts frame the broad entrance without blocking the ice gate.
    for (const side of [-1, 1]) {
      const sx = x + side * 26;
      k.box(g, sx, 2.1, z - 39.06, 14, 3.5, .12, 0x678e9a).material = glazing(0x648a96);
      sign(g, side < 0 ? "SKATE HIRE · ICE BLADES" : "CAFÉ · LOCKERS", sx, 4.9, z - 39.15, 12, Math.PI, "#294854");
      sign(g, side < 0 ? "SKATE HIRE" : "RINK CAFÉ", sx, 3.4, z - 30.9, 10, 0, "#294854");
      k.box(g, sx, 2, z - 30.95, 13, 3.2, .1, 0x536e78).material = glazing(0x728e9a);
      for (let n = 0; n < 4; n++) k.box(g, sx - 5 + n * 3.2, 1.7, z - 30.8, .12, 3.1, .14, 0xc8c3ad);
    }
    k.box(g, x, 10.8, z, 73, .5, 89, 0x71838d);
    for (const dx of [-24, -12, 0, 12, 24]) {
      k.box(g, x + dx, 9.8, z, .28, .35, 87, 0x4a6573);
      for (const dz of [-18, 18]) k.box(g, x + dx, 9.5, z + dz, 5, .08, .7, 0xe1f6ff).material = lampMaterial;
    }
    for (const dz of [-38, -20, 0, 20, 38]) k.box(g, x, 10.3, z + dz, 71, .3, .25, 0x4a6573);
    sign(g, r.name.toLocaleUpperCase(), x, 7.3, z - 44.4, 30, Math.PI, "#244453");
    sign(g, "PUBLIC ICE · LAYAN & TAQEE", x, 7.6, z + 31, 17, Math.PI, "#183645");
    sign(g, "OPEN ICE · ENTRY →", x - 11, 2.4, z - 44.4, 9, Math.PI, "#426d78");
    batch(g); return g;
  });
  const lights = Array.from({ length: mobile ? 1 : 2 }, () => {
    const l = new THREE.PointLight(0xc5e9ff, 0, 50, 2); l.castShadow = false; scene.add(l); return l;
  });
  return {
    groups,
    update(x: number, z: number) {
      groups.forEach((g, i) => { const r = iceRinks[i]; g.visible = Math.hypot(x - r.x, z - r.z) < 330; });
      const r = iceVenueAt(x, z, 7);
      lights.forEach((l, i) => { l.intensity = r ? 420 : 0; if (r) l.position.set(r.x, 8, r.z + (mobile ? 0 : i === 0 ? -17 : 17)); });
    },
  };
}
