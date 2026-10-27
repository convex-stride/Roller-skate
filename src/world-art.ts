import * as THREE from "three";
import { hash } from "./world";

/** Prefilter two bounded outdoor panoramas once; solar highlights cannot overflow mobile half floats. */
export function cityReflections(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const targets = [0, 1].map(city => {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 256;
    const c = canvas.getContext("2d")!, sky = c.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, city ? "#8babb9" : "#7095b5");
    sky.addColorStop(.38, city ? "#c6c7b6" : "#b6cedc");
    sky.addColorStop(.49, city ? "#e4d7b8" : "#e0e6df");
    sky.addColorStop(.53, city ? "#978570" : "#717e76");
    sky.addColorStop(1, city ? "#504c43" : "#394541");
    c.fillStyle = sky; c.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 36; i++) {
      const x = i * 15, h = 2 + hash(i, city + 1) * (city ? 22 : 9);
      c.fillStyle = city ? "#929793" : "#7d8e91"; c.fillRect(x, 132 - h, 10, h);
    }
    const sun = c.createRadialGradient(190, city ? 100 : 75, 0, 190, city ? 100 : 75, 24);
    sun.addColorStop(0, "rgba(255,249,229,1)"); sun.addColorStop(.1, "rgba(255,249,229,.9)"); sun.addColorStop(1, "rgba(255,249,229,0)");
    c.fillStyle = sun; c.fillRect(155, 40, 70, 100);
    const texture = new THREE.CanvasTexture(canvas); texture.mapping = THREE.EquirectangularReflectionMapping; texture.colorSpace = THREE.SRGBColorSpace;
    const target = pmrem.fromEquirectangular(texture); texture.dispose(); return target;
  });
  pmrem.dispose();
  return { gdansk: targets[0].texture, riyadh: targets[1].texture };
}

/** Leaf sprays create a broken, light-filtering crown instead of opaque spheres. */
export function balticFoliage() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  const c = canvas.getContext("2d")!;
  for (let i = 0; i < 24; i++) {
    const x = 15 + hash(i, 5) * 98, y = 12 + hash(i, 6) * 103;
    const tone = 115 + hash(i, 7) * 100;
    c.fillStyle = `rgb(${tone - 15},${tone},${tone - 35})`;
    c.beginPath(); c.ellipse(x, y, 5 + hash(i, 8) * 4, 10 + hash(i, 9) * 6, hash(i, 10) * 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(233,240,188,.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x, y + 6); c.stroke();
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 2;
  const material = new THREE.MeshStandardMaterial({ map, color: 0x83915d, alphaTest: .45, side: THREE.DoubleSide, roughness: .9 });
  // Shared geometry: each spray has its own angle, and all trees instance it.
  const positions: number[] = [], uvs: number[] = [];
  for (let i = 0; i < 90; i++) {
    const a = hash(i, 1) * Math.PI * 2, b = Math.acos(hash(i, 2) * 2 - 1), r = Math.cbrt(hash(i, 3)) * 2.3;
    const center = new THREE.Vector3(Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r * 1.05, Math.sin(b) * Math.sin(a) * r);
    const rotation = new THREE.Euler(hash(i, 4) * 3, a, hash(i, 11) * 3);
    const corners = [new THREE.Vector3(-.72, -.72, 0), new THREE.Vector3(.72, -.72, 0), new THREE.Vector3(.72, .72, 0), new THREE.Vector3(-.72, .72, 0)].map(p => p.applyEuler(rotation).add(center));
    for (const n of [0, 1, 2, 0, 2, 3]) { positions.push(...corners[n].toArray()); uvs.push(...[[0, 0], [1, 0], [1, 1], [0, 1]][n]); }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); geometry.computeVertexNormals();
  return { geometry, material };
}
