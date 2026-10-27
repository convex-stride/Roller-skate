import * as THREE from "three";
import { races, type RaceRun } from "./races";

export function buildRaceScene(scene: THREE.Scene) {
  const checkerCanvas = document.createElement("canvas"); checkerCanvas.width = checkerCanvas.height = 64;
  const c = checkerCanvas.getContext("2d")!;
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { c.fillStyle = (x + y) % 2 ? "#182f36" : "#f3eed7"; c.fillRect(x * 8, y * 8, 8, 8); }
  const checks = new THREE.CanvasTexture(checkerCanvas); checks.colorSpace = THREE.SRGBColorSpace;
  const checkMaterial = new THREE.MeshStandardMaterial({ map: checks, roughness: 0.8 });
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xe5b071, roughness: 0.7 });
  const poleGeometry = new THREE.BoxGeometry(0.16, 4.4, 0.16);
  const markerGeometry = new THREE.TorusGeometry(3.5, 0.12, 6, 32);
  const portals: { group: THREE.Group; x: number; z: number }[] = [];
  function arch(x: number, z: number, heading: number, name: string) {
    const g = new THREE.Group(); g.position.set(x, 0.16, z); g.rotation.y = heading; scene.add(g);
    for (const side of [-1, 1]) { const p = new THREE.Mesh(poleGeometry, poleMaterial); p.position.set(side * 4, 2.2, 0); g.add(p); }
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.6, 0.2), checkMaterial); crossbar.position.y = 4.4; g.add(crossbar);
    const label = document.createElement("canvas"); label.width = 512; label.height = 80;
    const ctx = label.getContext("2d")!; ctx.fillStyle = "#17353b"; ctx.fillRect(0, 0, 512, 80); ctx.fillStyle = "#f4e7c5"; ctx.font = "bold 27px Arial"; ctx.textAlign = "center"; ctx.fillText(name.toUpperCase(), 256, 50);
    const texture = new THREE.CanvasTexture(label); texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: texture });
    for (const side of [-1, 1]) { const text = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 1.2), mat); text.position.set(0, 3.55, side * 0.13); if (side < 0) text.rotation.y = Math.PI; g.add(text); }
    const ring = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: 0xf5c47b })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.035; g.add(ring);
    portals.push({ group: g, x, z });
  }
  for (const race of races) {
    arch(race.start.x, race.start.z, race.heading, race.name);
    if (race.laps === 1) {
      const finish = race.checkpoints.at(-1)!;
      arch(finish.x, finish.z, race.heading, "FINISH");
    }
  }
  const guides = Array.from({ length: 4 }, () => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.13, 6, 32), new THREE.MeshBasicMaterial({ color: 0xe8ff80, transparent: true })); scene.add(m); m.visible = false; return m;
  });
  return {
    update(run: RaceRun | null, x: number, z: number) {
      for (const p of portals) p.group.visible = Math.hypot(p.x - x, p.z - z) < 220;
      guides.forEach((m, i) => {
        m.visible = !!run && (run.status === "countdown" || run.status === "racing") && i < run.definition.checkpoints.length;
        if (!m.visible || !run) return;
        const gate = run.definition.checkpoints[i], before = i === 0 ? run.definition.start : run.definition.checkpoints[i - 1];
        m.position.set(gate.x, 2.85, gate.z); m.rotation.y = Math.atan2(gate.x - before.x, gate.z - before.z);
        const current = run.player.gate % run.definition.checkpoints.length;
        m.material.color.setHex(i === current ? 0xe8ff80 : 0x97cbd9); m.material.opacity = i === current ? 1 : 0.18;
      });
    },
  };
}
