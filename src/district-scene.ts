import * as THREE from "three";
import { districtSites, type City } from "./world";
import { themeNames, type DistrictTheme, type DistrictProp } from "./district-content";
import { sign, surface, type StreetKit } from "./environment";

const materials = new Map<string, THREE.MeshStandardMaterial>();
export function decorateDistrict(group: THREE.Group, cx: number, cz: number, city: City, k: StreetKit, buildBank: (group: THREE.Group, p: DistrictProp) => void) {
  const sites = districtSites(cx, cz, city), historic = city === "gdansk";
  const colors: Record<DistrictTheme, number> = { workshop: 0x9b8e73, garden: 0x77966d, art: historic ? 0x819ca1 : 0xb9a887, festival: historic ? 0xa19b79 : 0xd1b88c, souq: 0xc3a273, oasis: 0x8caa7b };
  for (const [index, site] of sites.entries()) {
    const key = `${city}-${site.theme}`;
    if (!materials.has(key)) {
      const m = surface(site.theme === "garden" || site.theme === "oasis" ? "plaster" : "paving", colors[site.theme]).clone();
      m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; m.depthWrite = false; materials.set(key, m);
    }
    const patch = k.box(group, site.x, 0.026, site.z, site.size, 0.004, site.size, colors[site.theme]); patch.material = materials.get(key)!;
    for (const side of [-1, 1]) {
      k.box(group, site.x + side * Math.min(4.5, site.size / 2 - 1), 0.036, site.z, 0.14, 0.012, site.size - 0.5, historic ? 0xd3d0b3 : 0xe8d1a2);
      k.box(group, site.x, 0.036, site.z + side * Math.min(4.5, site.size / 2 - 1), site.size - 0.5, 0.012, 0.14, historic ? 0xd3d0b3 : 0xe8d1a2);
    }
    for (const p of site.props) {
      if (p.kind === "bank") {
        buildBank(group, p);
        for (const side of [-1, 1]) k.box(group, p.x + side * (p.w / 2 - 0.16), p.h / 2 + 0.03, p.z, 0.12, 0.025, Math.hypot(p.d, p.h), historic ? 0x8dd8db : 0xf0c581, false, -Math.atan2(p.h - 0.015, p.d));
        continue;
      }
      if (p.kind === "rail") { k.rail(group, p.x, p.z, p.d); continue; }
      if (p.kind === "tree") {
        k.tree(group, p.x, p.z, city);
        const trunk = k.box(group, p.x, p.h / 2, p.z, p.w, p.h, p.d, 0x6d7050, true); trunk.visible = false; continue;
      }
      const color = p.kind === "stall" ? historic ? 0x7b6750 : 0x9c764e : p.kind === "bed" ? 0x907a59 : p.kind === "art" ? historic ? 0x558f9b : 0xb28b50 : p.kind === "crates" ? 0x957c57 : 0xaeb39d;
      k.box(group, p.x, p.h / 2, p.z, p.w, p.h, p.d, color, true);
      if (p.kind === "stall") {
        k.box(group, p.x, p.h + 0.06, p.z, p.w + 0.4, 0.12, p.d + 0.3, 0xd7bd89);
        for (const side of [-1, 1]) k.cylinder(group, p.x + side * p.w / 2, 1.8, p.z, 0.065, 3.6, 0x756951);
        k.box(group, p.x, 3.6, p.z, p.w + 1.2, 0.12, p.d + 1.2, historic ? 0xb78568 : 0xd2aa75);
        for (let n = 0; n < 5; n++) {
          if (site.theme === "souq") { const roll = k.cylinder(group, p.x - p.w * 0.35 + n * p.w * 0.17, p.h + 0.3, p.z, 0.18, 1.2, [0x966258, 0xd4ba80, 0x6b9990][n % 3]); roll.rotation.x = Math.PI / 2; }
          else k.box(group, p.x - p.w * 0.35 + n * p.w * 0.17, p.h + 0.2, p.z, 0.35, 0.25, 0.5, [0xb49a6a, 0x6f9895, 0xb5775a][n % 3]);
        }
      } else if (p.kind === "bed") {
        for (const side of [-1, 1]) for (let n = 0; n < 3; n++) k.cylinder(group, p.x + side * p.w * 0.25, p.h + 0.22, p.z - p.d * 0.3 + n * p.d * 0.3, 0.24, 0.45, 0x65805b);
      } else if (p.kind === "art") {
        const sculpture = new THREE.Mesh(new THREE.OctahedronGeometry(1.25), k.material(historic ? 0xc99a63 : 0xb59d66, 0.4, 0.35));
        sculpture.position.set(p.x, p.h + 0.8, p.z); sculpture.rotation.set(0.4, index * 0.4, 0.5); sculpture.castShadow = true; group.add(sculpture);
      } else if (p.kind === "bench") {
        k.box(group, p.x, p.h + 0.35, p.z + p.d / 2 - 0.1, p.w, 0.7, 0.12, historic ? 0x56746a : 0x9e7e55);
      } else if (p.kind === "stage") {
        for (const side of [-1, 1]) {
          k.box(group, p.x + side * (p.w / 2 - 0.6), p.h + 0.7, p.z + p.d / 2 - 0.5, 0.7, 1.4, 0.7, 0x354447);
          k.cylinder(group, p.x + side * p.w / 2, 2.6, p.z, 0.07, 5.2, 0x887b5c);
        }
        k.box(group, p.x, 5.2, p.z, p.w + 0.6, 0.12, 0.15, 0xc6a96d);
        for (let n = 0; n < 7; n++) k.box(group, p.x - p.w * 0.4 + n * p.w * 0.133, 4.85 + Math.sin(n) * 0.12, p.z, p.w * 0.09, 0.55, 0.04, (historic ? [0xb75e5e, 0x4f8b94, 0xd2b45a] : [0x9e6676, 0x6d9e87, 0xd1b478])[n % 3]);
      } else if (p.kind === "crates") {
        for (const side of [-1, 1]) k.box(group, p.x + side * p.w * 0.25, p.h + 0.3, p.z, p.w * 0.4, 0.6, p.d * 0.8, 0xb39361);
      }
    }
    if (index === 0) {
      k.cylinder(group, site.x - 3, 1.7, site.z + 3, 0.06, 3.4, 0x6b7258);
      sign(group, themeNames[site.theme].toUpperCase(), site.x, 3.5, site.z + 3, 8, 0, historic ? "#3d6265" : "#796646");
    }
  }
}
