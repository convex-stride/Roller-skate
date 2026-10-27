import * as THREE from "three";
export const FIREWORK_MESSAGE = "I LOVE YOU LAYAN";
const hash = (x: number, z: number) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
export function fireworksLayout(position: { x: number; z: number }, time: number, mobile = false, heading = 0) {
  const cell = 300, cx = Math.floor(position.x / cell), cz = Math.floor(position.z / cell);
  const anchors: { x: number; z: number; distance: number; seed: number }[] = [];
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    const x = (cx + dx + .5) * cell, z = (cz + dz + .5) * cell, distance = Math.hypot(x - position.x, z - position.z);
    // A ring keeps the fireworks above the skyline without putting text over the rider.
    if (distance > 200 && distance < 660) anchors.push({ x, z, distance, seed: hash(cx + dx, cz + dz) });
  }
  const nearest = [...anchors].sort((a, b) => a.distance - b.distance);
  const angle = (p: typeof anchors[number]) => Math.abs(Math.atan2(Math.sin(Math.atan2(p.x - position.x, p.z - position.z) - heading), Math.cos(Math.atan2(p.x - position.x, p.z - position.z) - heading)));
  const lead = [...anchors].sort((a,b) => angle(a) - angle(b) || a.distance - b.distance)[0];
  return [lead, ...nearest.filter(p => p !== lead)].slice(0, mobile ? 4 : 8).map(p => ({ ...p, y: 48 + p.seed * 13, age: ((time + p.seed * 10) % 10 + 10) % 10, shape: Math.floor(p.seed * 4) }));
}
export function fireworkSpark(shape: number, index: number, count: number, seed: number) {
  const a = index / count * Math.PI * 2, spread = .7 + hash(index, seed) * .3;
  if (shape === 0) return { x: 16 * Math.sin(a) ** 3, y: 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a), z: Math.sin(index * 2.4) * 2 };
  if (shape === 1) return { x: Math.cos(a) * 19, y: Math.sin(a) * 19, z: Math.sin(index * 2.4) * 3 };
  const y = 1 - 2 * (index + .5) / count, radius = Math.sqrt(1 - y * y), theta = index * 2.39996;
  return { x: Math.cos(theta) * radius * 22 * spread, y: y * (shape === 2 ? 22 : 13) * spread, z: Math.sin(theta) * radius * 22 * spread };
}

/** One bounded particle draw and a small set of world-space text sprites. No new lights. */
export class LoveFireworks {
  readonly group = new THREE.Group();
  private particles: THREE.Points;
  private labels: THREE.Sprite[];
  private positions: Float32Array;
  private colors: Float32Array;
  private count: number;
  private active = 0;
  private messageCount = 0;
  private leadMessage = false;
  constructor(scene: THREE.Scene, readonly mobile: boolean) {
    this.count = mobile ? 72 : 112;
    const capacity = (mobile ? 4 : 8) * this.count;
    this.positions = new Float32Array(capacity * 3); this.colors = new Float32Array(capacity * 3);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage)); geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    const glowCanvas = document.createElement("canvas"); glowCanvas.width = glowCanvas.height = 32;
    const c = glowCanvas.getContext("2d")!, gradient = c.createRadialGradient(16, 16, 0, 16, 16, 16); gradient.addColorStop(0, "white"); gradient.addColorStop(.22, "#ffffffc0"); gradient.addColorStop(1, "#ffffff00"); c.fillStyle = gradient; c.fillRect(0, 0, 32, 32);
    this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(glowCanvas), size: mobile ? 7 : 6, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    this.particles.frustumCulled = false; this.group.add(this.particles);
    const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 160;
    const text = canvas.getContext("2d")!; text.font = "bold 83px Arial"; text.textAlign = "center"; text.textBaseline = "middle"; text.shadowColor = "#ff65bd"; text.shadowBlur = 20; text.fillStyle = "#fff1d5"; text.fillText(FIREWORK_MESSAGE, 512, 83, 970);
    const map = new THREE.CanvasTexture(canvas);
    this.labels = Array.from({ length: mobile ? 4 : 8 }, () => { const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, toneMapped: false })); sprite.scale.set(110, 17.2, 1); sprite.visible = false; this.group.add(sprite); return sprite; });
    this.group.visible = false; scene.add(this.group);
  }
  update(enabled: boolean, position: THREE.Vector3Like, time: number, reducedMotion: boolean, heading = 0) {
    this.group.visible = enabled; this.active = this.messageCount = 0; this.leadMessage = false;
    if (!enabled) return;
    const anchors = fireworksLayout(position, time, this.mobile, heading), palette = [[1, .25, .6], [1, .72, .2], [.3, 1, .9], [.65, .45, 1]];
    this.labels.forEach(s => { s.visible = false; });
    for (let slot = 0; slot < anchors.length; slot++) {
      const p = anchors[slot], burst = p.age - 1.2, fade = Math.max(0, 1 - Math.max(0, burst - 1.5) / 5.6), color = palette[p.shape];
      this.active++;
      const yaw = Math.atan2(position.x - p.x, position.z - p.z), cosine = Math.cos(yaw), sine = Math.sin(yaw);
      const label = this.labels[slot];
      // Reduced motion keeps a stationary sky message and removes launches/bursts.
      const opacity = reducedMotion ? .82 : Math.min(1, Math.max(0, (p.age - 2) * 2), Math.max(0, (9.3 - p.age) * 1.2));
      label.visible = opacity > .01; label.material.opacity = opacity; label.position.set(p.x, p.y + 5, p.z);
      if (label.visible) this.messageCount++;
      if (slot === 0) this.leadMessage = label.visible;
      for (let i = 0; i < this.count; i++) {
        const at = (slot * this.count + i) * 3, spark = fireworkSpark(p.shape, i, this.count, p.seed), expansion = 1 - Math.exp(-Math.max(0, burst) * 2.6);
        const launching = p.age < 1.2, visible = !reducedMotion && (launching ? i < 8 : fade > 0), alpha = visible ? launching ? (1 - i / 8) : fade * (.65 + hash(i, p.seed) * .35) : 0;
        this.positions[at] = p.x + (launching ? 0 : (spark.x * cosine + spark.z * sine) * expansion);
        this.positions[at + 1] = launching ? 10 + (p.y - 10) * (p.age / 1.2) - i * 1.4 : p.y + spark.y * expansion - Math.max(0, burst) ** 2 * .45;
        this.positions[at + 2] = p.z + (launching ? 0 : (-spark.x * sine + spark.z * cosine) * expansion);
        for (let channel = 0; channel < 3; channel++) this.colors[at + channel] = color[channel] * alpha;
      }
    }
    this.particles.visible = !reducedMotion;
    this.particles.geometry.setDrawRange(0, anchors.length * this.count); this.particles.geometry.getAttribute("position").needsUpdate = true; this.particles.geometry.getAttribute("color").needsUpdate = true;
  }
  get diagnostics() { return { enabled: this.group.visible, message: FIREWORK_MESSAGE, launchSites: this.active, visibleMessages: this.messageCount, leadMessage: this.leadMessage, particleBudget: this.labels.length * this.count, particlesVisible: this.group.visible && this.particles.visible }; }
}
