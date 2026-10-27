import * as THREE from "three";
import { hash, type City } from "./world";

export const nightAmount = { value: 0 };
type Lamp = { x: number; y: number; z: number; color: number; groundY: number };
const bulbs = new Map<City, THREE.MeshStandardMaterial>();
const bulbGeometry = new THREE.SphereGeometry(1, 8, 6);
export const nightGeometries = [bulbGeometry];

/** Positions live on their owning chunk so unloading a district also removes its lamps. */
export function streetLamp(group: THREE.Group, x: number, y: number, z: number, city: City, groundY = .13) {
  const color = city === "gdansk" ? 0xffcc88 : 0xffdfb0;
  if (!bulbs.has(city)) bulbs.set(city, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0 }));
  const bulb = new THREE.Mesh(bulbGeometry, bulbs.get(city)!);
  bulb.position.set(x, y, z); bulb.scale.set(.27, .12, .27); group.add(bulb);
  const lamps: Lamp[] = group.userData.nightLamps ??= [];
  lamps.push({ x, y, z, color, groundY });
}

export class NightLighting {
  readonly sky = new THREE.Group();
  private lights: THREE.PointLight[];
  private pools: THREE.InstancedMesh;
  private nextUpdate = 0;
  private lastPosition = new THREE.Vector3(Infinity, 0, Infinity);
  private active: Lamp[] = [];
  private transform = new THREE.Object3D();
  constructor(scene: THREE.Scene, mobile: boolean) {
    // A fixed, small light budget avoids a new shadow map for every street light.
    this.lights = Array.from({ length: mobile ? 2 : 4 }, () => {
      const light = new THREE.PointLight(0xffd39b, 0, 32, 2); light.castShadow = false; scene.add(light); return light;
    });
    const starPositions: number[] = [];
    for (let i = 0; i < 480; i++) {
      const angle = hash(i, 10) * Math.PI * 2, y = .09 + hash(i, 11) * .91, radius = Math.sqrt(1 - y * y);
      starPositions.push(Math.cos(angle) * radius * 850, y * 850, Math.sin(angle) * radius * 850);
    }
    const stars = new THREE.BufferGeometry(); stars.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    this.sky.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xc9dcff, size: mobile ? 1.5 : 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: .7, depthWrite: false })));
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const c = canvas.getContext("2d")!, glow = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    glow.addColorStop(0, "rgba(255,255,255,.44)"); glow.addColorStop(.25, "rgba(255,255,255,.25)"); glow.addColorStop(.65, "rgba(255,255,255,.08)"); glow.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = glow; c.fillRect(0, 0, 128, 128);
    const poolMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), color: 0xffcf8e, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), poolMaterial, 40);
    this.pools.count = 0; this.pools.frustumCulled = false; scene.add(this.pools);
    const moonCanvas = document.createElement("canvas"); moonCanvas.width = moonCanvas.height = 128;
    const m = moonCanvas.getContext("2d")!;
    const moonGlow = m.createRadialGradient(64, 64, 26, 64, 64, 64);
    moonGlow.addColorStop(0, "rgba(186,213,255,.25)"); moonGlow.addColorStop(1, "rgba(186,213,255,0)");
    m.fillStyle = moonGlow; m.fillRect(0, 0, 128, 128); m.fillStyle = "#d9e4ee"; m.beginPath(); m.arc(64, 64, 29, 0, Math.PI * 2); m.fill();
    for (let i = 0; i < 30; i++) {
      const x = 44 + hash(i, 16) * 40, y = 44 + hash(i, 17) * 40;
      m.fillStyle = "rgba(92,119,150,.14)"; m.beginPath(); m.arc(x, y, 1 + hash(i, 18) * 5, 0, Math.PI * 2); m.fill();
    }
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(moonCanvas), fog: false, depthWrite: false, toneMapped: false }));
    moon.position.set(-280, 260, -600); moon.scale.set(55, 55, 1); this.sky.add(moon);
    this.sky.visible = false; scene.add(this.sky);
  }
  update(enabled: boolean, position: THREE.Vector3Like, camera: THREE.Vector3, groups: THREE.Group[], elapsed: number) {
    const changed = this.sky.visible !== enabled;
    this.sky.visible = enabled; this.sky.position.copy(camera); nightAmount.value = enabled ? 1 : 0;
    for (const bulb of bulbs.values()) bulb.emissiveIntensity = enabled ? 3 : 0;
    this.pools.visible = enabled;
    if (!enabled) { for (const light of this.lights) light.intensity = 0; return; }
    this.nextUpdate -= elapsed;
    if (changed || this.nextUpdate <= 0 || this.lastPosition.distanceToSquared(position) > 900) {
      this.nextUpdate = .4; this.lastPosition.copy(position);
      this.active = groups.filter(g => g.visible).flatMap(g => (g.userData.nightLamps ?? []) as Lamp[])
        .filter(l => Math.hypot(l.x - position.x, l.z - position.z) < 150)
        .sort((a, b) => Math.hypot(a.x - position.x, a.z - position.z) - Math.hypot(b.x - position.x, b.z - position.z)).slice(0, 40);
      this.pools.count = this.active.length;
      this.active.forEach((l, i) => {
        this.transform.position.set(l.x, l.groundY, l.z); this.transform.rotation.set(-Math.PI / 2, 0, 0); this.transform.scale.set(23, 23, 1); this.transform.updateMatrix(); this.pools.setMatrixAt(i, this.transform.matrix);
      });
      this.pools.instanceMatrix.needsUpdate = true;
      this.lights.forEach((light, i) => {
        const lamp = this.active[i]; light.intensity = lamp ? 130 : 0;
        if (lamp) { light.position.set(lamp.x, lamp.y - .25, lamp.z); light.color.setHex(lamp.color); }
      });
    }
  }
  get diagnostics() { return { enabled: this.sky.visible, streetLamps: this.sky.visible ? this.active.length : 0, pointLights: this.lights.filter(l => l.intensity > 0).length }; }
}
