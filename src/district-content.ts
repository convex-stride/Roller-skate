export type DistrictTheme = "workshop" | "garden" | "art" | "festival" | "souq" | "oasis";
export type DistrictProp = { kind: "stall" | "tree" | "bed" | "art" | "bench" | "stage" | "crates" | "rail" | "bank" | "museum" | "quarter" | "funbox"; x: number; z: number; w: number; d: number; h: number };
export type DistrictSite = { id: string; x: number; z: number; city: "gdansk" | "riyadh"; theme: DistrictTheme; size: number; green?: boolean; props: DistrictProp[] };
/** The same five wall pieces drive visible galleries, collision and navigation. */
export function museumWalls(p: DistrictProp) {
  return [
    { x: p.x - p.w / 2, z: p.z, w: .25, d: p.d },
    { x: p.x + p.w / 2, z: p.z, w: .25, d: p.d },
    { x: p.x, z: p.z + p.d / 2, w: p.w, d: .25 },
    ...[-1, 1].map(side => ({ x: p.x + side * 5, z: p.z - p.d / 2, w: 2, d: .25 })),
  ];
}
const noise = (x: number, z: number, n = 1) => { const v = Math.sin(x * 127.1 + z * 311.7 + n * 74.7) * 43758.5453; return v - Math.floor(v); };
export const themeNames: Record<DistrictTheme, string> = { workshop: "Harbour Workshops", garden: "Community Gardens", art: "Sculpture Courts", festival: "Festival Courtyards", souq: "Market Gardens", oasis: "Palm Oases" };
export function districtTheme(cx: number, cz: number, city: "gdansk" | "riyadh"): DistrictTheme {
  const themes: DistrictTheme[] = city === "gdansk" ? ["workshop", "garden", "art", "festival"] : ["souq", "oasis", "art", "festival"];
  return themes[Math.floor(noise(cx, cz, 41) * themes.length)];
}
export function makeDistrictSites(cx: number, cz: number, city: "gdansk" | "riyadh", canPlace: (x: number, z: number, radius: number) => boolean): DistrictSite[] {
  const sites: DistrictSite[] = [], theme = districtTheme(cx, cz, city);
  let museumPlaced = false;
  for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 6; iz++) {
    const x = cx - 75 + ix * 30, z = cz - 75 + iz * 30;
    const fullSize = canPlace(x, z, 14);
    if (!fullSize && !canPlace(x, z, 6)) continue;
    const props: DistrictProp[] = [];
    const add = (kind: DistrictProp["kind"], dx: number, dz: number, w: number, d: number, h: number) => props.push({ kind, x: x + dx, z: z + dz, w, d, h });
    if (!fullSize) {
      add("tree", 3, 3, 0.6, 0.6, 5); add("bench", -3, -3, 3, 0.7, 0.45);
    } else if (theme === "workshop") {
      add("stall", -9, -9, 5, 3, 1.2); add("crates", 9, 8, 4, 4, 1.1); add("rail", 8, -8, 0.12, 10, 0.8); add("bench", -9, 9, 5, 1, 0.45);
    } else if (theme === "garden" || theme === "oasis") {
      add("tree", -9, -9, 0.6, 0.6, 5); add("tree", 9, 9, 0.6, 0.6, 5); add("bed", 9, -9, 6, 4, 0.5); add("bench", -8, 9, 5, 1, 0.45);
    } else if (theme === "souq") {
      add("stall", -9, -9, 5, 3, 1.15); add("stall", 9, 9, 5, 3, 1.15); add("tree", 9, -9, 0.6, 0.6, 5); add("bed", -9, 9, 4, 3, 0.45);
    } else if (theme === "art") {
      add("art", -8, -8, 2.4, 2.4, 3); add("stage", 9, 8, 6, 4, 0.35); add("rail", 9, -9, 0.12, 10, 0.8); add("tree", -9, 9, 0.6, 0.6, 5);
    } else {
      add("stage", -8, -8, 7, 5, 0.4); add("stall", 9, 9, 5, 3, 1.15); add("bench", 9, -9, 5, 1, 0.45); add("tree", -9, 9, 0.6, 0.6, 5);
    }
    if (fullSize && noise(x, z, 84) < 0.42) props[1] = { kind: "bank", x: x + 9, z: z + 8, w: 5, d: 8, h: noise(x, z, 85) < 0.5 ? 1.4 : 1.8 };
    if (fullSize && theme === 'art' && !museumPlaced) {
      props[0] = { kind: 'museum', x: x - 8, z: z - 8, w: 12, d: 12, h: 4 };
      museumPlaced = true;
    }
    if (fullSize && noise(x, z, 125) < .65) {
      const index = props.findIndex(p => p.kind === 'stage' || p.kind === 'crates');
      if (index >= 0) props[index] = { ...props[index], kind: noise(x, z, 126) < .5 ? 'quarter' : 'funbox', w: 6, d: 7, h: 1.8 };
    }
    const green = theme === 'garden' || theme === 'oasis' || fullSize && noise(x, z, 127) < .3;
    if (fullSize && green) for (const side of [-1, 1]) add('tree', side * 4, 12, .6, .6, 5);
    sites.push({ id: `${city}-${cx}-${cz}-${ix}-${iz}`, x, z, city, theme, green, size: fullSize ? 28 : 12, props });
  }
  return sites;
}
export function districtPropAt(sites: DistrictSite[], x: number, z: number, margin: number) {
  return sites.some(site => Math.abs(site.x - x) < 15 + margin && Math.abs(site.z - z) < 15 + margin && site.props.some(p =>
    (p.kind === 'museum' ? museumWalls(p) : [p]).some(w => Math.abs(x - w.x) < w.w / 2 + margin && Math.abs(z - w.z) < w.d / 2 + margin)));
}
