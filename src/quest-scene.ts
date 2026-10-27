import * as THREE from "three";
import { quests, type QuestRun } from "./quests";
import type { CrowdPerson } from "./crowd";

export function buildQuestScene(scene: THREE.Scene) {
  const icon = document.createElement("canvas"); icon.width = icon.height = 64;
  const ctx = icon.getContext("2d")!; ctx.fillStyle = "#f0c879"; ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#18383e"; ctx.font = "bold 48px Arial"; ctx.textAlign = "center"; ctx.fillText("!", 32, 49);
  const texture = new THREE.CanvasTexture(icon); texture.colorSpace = THREE.SRGBColorSpace;
  const markers = quests.map(q => {
    const group = new THREE.Group(); group.position.set(q.anchor.x - 2.5, 0, q.anchor.z + 2); scene.add(group);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.5, 6), new THREE.MeshStandardMaterial({ color: 0x647a67 })); pole.position.y = 1.25; group.add(pole);
    const label = document.createElement("canvas"); label.width = 512; label.height = 256;
    const c = label.getContext("2d")!; c.fillStyle = q.city === "gdansk" ? "#365f65" : "#876a45"; c.fillRect(0, 0, 512, 256); c.strokeStyle = "#ead5a0"; c.lineWidth = 8; c.strokeRect(12, 12, 488, 232);
    c.textAlign = "center"; c.fillStyle = "#fff0c6"; c.font = "bold 32px Arial"; c.fillText(q.giver.toUpperCase(), 256, 70, 460);
    c.font = "27px Arial"; c.fillText(q.title, 256, 136, 460); c.font = "bold 25px Arial"; c.fillText(`${q.kind.toUpperCase()} · ${q.reward} XP`, 256, 203, 460);
    const labelTexture = new THREE.CanvasTexture(label); labelTexture.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.08), new THREE.MeshBasicMaterial({ map: labelTexture })); board.position.y = 1.9; group.add(board);
    const courtRing = new THREE.Mesh(new THREE.RingGeometry(q.kind === "style" ? 5.8 : 2.6, q.kind === "style" ? 6 : 2.72, 40), new THREE.MeshBasicMaterial({ color: q.kind === "style" ? 0xd2aecc : q.city === "gdansk" ? 0xa4cfd0 : 0xe6cb92, depthWrite: false }));
    courtRing.rotation.x = -Math.PI / 2; courtRing.position.set(2.5, 0.055, -2); group.add(courtRing);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: true }); const badge = new THREE.Sprite(material); badge.position.y = 3; badge.scale.setScalar(0.9); group.add(badge);
    return { group, badge, material, quest: q };
  });
  const targets = Array.from({ length: 3 }, () => {
    const group = new THREE.Group(); scene.add(group);
    const material = new THREE.MeshStandardMaterial({ color: 0xe4e993, emissive: 0x63752c, emissiveIntensity: 0.45 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), material); box.position.y = 0.65; group.add(box);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.08, 5, 24), new THREE.MeshBasicMaterial({ color: 0xd9ef9b })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; group.add(ring);
    return { group, box, ring, material };
  });
  function actor(id: number, name: string, x: number, z: number, time: number, playerX: number, playerZ: number, action: CrowdPerson["action"]): CrowdPerson {
    return { id, name, x, z, role: "vendor", route: [], next: 0, heading: Math.atan2(playerX - x, playerZ - z), speed: 0, phase: 0, age: time, wait: 1, reaction: 0, action, distance: Math.hypot(x - playerX, z - playerZ), ground: 0, following: false, stuck: 0, traveled: 0 };
  }
  return {
    update(time: number, x: number, z: number, completed: string[], run: QuestRun | null, showTargets: boolean) {
      const actors: CrowdPerson[] = [];
      markers.forEach((m, i) => {
        const d = Math.hypot(m.quest.anchor.x - x, m.quest.anchor.z - z); m.group.visible = d < 180;
        m.material.color.setHex(completed.includes(m.quest.id) ? 0x8fd6a1 : 0xffffff); m.badge.position.y = 3 + Math.sin(time * 1.8 + i) * 0.1;
        if (d < 100) actors.push(actor(12000 + i, m.quest.giver, m.quest.anchor.x + 1.3, m.quest.anchor.z, time, x, z, d < 10 && run?.definition.id !== m.quest.id ? "wave" : "talk"));
      });
      const points = showTargets && run ? run.targets() : [];
      targets.forEach((m, i) => {
        m.group.visible = !!points[i]; if (!points[i]) return;
        m.group.position.set(points[i].x, 0, points[i].z); m.box.rotation.y = time * 0.5;
        m.box.position.y = 0.8 + Math.sin(time * 2) * 0.1;
        m.box.visible = run?.definition.kind !== "style";
        m.ring.scale.setScalar(run?.definition.kind === "style" && run.stage === "objectives" ? 25 : 1);
        m.material.color.setHex(run?.definition.kind === "discover" ? 0x9dcbd3 : 0xe4e993);
      });
      if (run?.definition.kind === "delivery" && run.stage === "objectives" && showTargets) {
        const p = run.goal({ x, z }); if (p && Math.hypot(p.x - x, p.z - z) < 100) actors.push(actor(13000, "Neighbour", p.x + 1.2, p.z, time, x, z, "talk"));
      }
      return actors.sort((a, b) => a.distance - b.distance).slice(0, 4);
    },
  };
}
