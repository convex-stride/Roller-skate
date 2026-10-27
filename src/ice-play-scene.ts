import * as THREE from "three";
import type { IceGame } from "./ice-games";

export function createIcePlayScene(scene: THREE.Scene) {
  const portal = new THREE.InstancedMesh(new THREE.TorusGeometry(1.35, .075, 7, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }), 8);
  portal.frustumCulled = false; portal.visible = false; scene.add(portal);
  const path: THREE.Vector3[] = [], trailPositions = new Float32Array(180 * 3), trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3).setUsage(THREE.DynamicDrawUsage)); trailGeometry.setDrawRange(0, 0);
  const trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: 0x75f5ef, transparent: true, opacity: .9, blending: THREE.AdditiveBlending })); trail.frustumCulled = false; scene.add(trail);
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  const c = canvas.getContext("2d")!, gradient = c.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,.12)"); gradient.addColorStop(.7, "rgba(255,255,255,.08)"); gradient.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = gradient; c.fillRect(0, 0, 128, 128);
  const spotlight = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), color: 0x6ce3ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  spotlight.rotation.x = -Math.PI / 2; spotlight.visible = false; scene.add(spotlight);
  const particlePositions = new Float32Array(120 * 3), particleColors = new Float32Array(120 * 3), velocity: THREE.Vector3[] = [];
  for (let i = 0; i < 120; i++) { const a = i * 2.399; velocity.push(new THREE.Vector3(Math.sin(a) * (1 + i % 4), 2 + i % 6 * .5, Math.cos(a) * (1 + i % 4))); const color = new THREE.Color([0x9df2f4, 0xf9ce6f, 0xe796cb, 0xe5f8ff][i % 4]); particleColors.set([color.r, color.g, color.b], i * 3); }
  const particleGeometry = new THREE.BufferGeometry(); particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage)); particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
  const confetti = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ vertexColors: true, size: .08, transparent: true, depthWrite: false })); confetti.frustumCulled = false; confetti.visible = false; scene.add(confetti);
  let lastGame: IceGame | null = null, burst = 4;
  const origin = new THREE.Vector3(), dummy = new THREE.Object3D(), color = new THREE.Color();
  return {
    celebrate(x: number, z: number) { burst = 0; origin.set(x, 2.5, z); confetti.visible = true; },
    update(game: IceGame | null, position: THREE.Vector3Like, time: number, elapsed: number) {
      if (game !== lastGame) { path.length = 0; lastGame = game; }
      portal.visible = !!game && game.mode === "slalom" && game.status === "playing";
      spotlight.visible = !!game && game.mode !== "slalom" && game.status === "playing";
      if (spotlight.visible) { spotlight.position.set(position.x, .102, position.z); spotlight.material.color.setHex(game!.mode === "duet" ? 0xe7a3e3 : 0x6ce3ff); }
      if (portal.visible) {
        game!.gates.forEach((p, i) => { dummy.position.set(p.x, 1.4, p.z); dummy.rotation.set(0, Math.atan2(position.x - p.x, position.z - p.z), 0); dummy.scale.setScalar(i === game!.stage ? 1 + Math.sin(time * 3) * .06 : .72); dummy.updateMatrix(); portal.setMatrixAt(i, dummy.matrix); portal.setColorAt(i, color.setHex(i < game!.stage ? 0x81e8a6 : i === game!.stage ? 0xffdf7d : 0x66c8ee)); });
        portal.instanceMatrix.needsUpdate = true; portal.instanceColor!.needsUpdate = true;
        if (!path.length || Math.hypot(path[path.length - 1].x - position.x, path[path.length - 1].z - position.z) > .25) { path.push(new THREE.Vector3(position.x, .105, position.z)); if (path.length > 180) path.shift(); }
      }
      trail.visible = portal.visible;
      if (trail.visible) { path.forEach((p, i) => p.toArray(trailPositions, i * 3)); trailGeometry.setDrawRange(0, path.length); trailGeometry.getAttribute("position").needsUpdate = true; }
      burst += elapsed;
      if (confetti.visible) {
        for (let i = 0; i < velocity.length; i++) { particlePositions[i * 3] = origin.x + velocity[i].x * burst; particlePositions[i * 3 + 1] = origin.y + velocity[i].y * burst - 4.9 * burst * burst; particlePositions[i * 3 + 2] = origin.z + velocity[i].z * burst; }
        particleGeometry.getAttribute("position").needsUpdate = true; confetti.visible = burst < 2.3;
      }
    },
  };
}
