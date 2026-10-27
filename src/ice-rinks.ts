// Fictional mall arenas in the game's compressed city layouts, not real addresses.
export type IceRink = { id: string; name: string; city: "gdansk" | "riyadh"; x: number; z: number; color: number; theme: string };
export const ICE_WIDTH = 30, ICE_LENGTH = 60, VENUE_WIDTH = 72, VENUE_LENGTH = 88;
export const iceRinks: IceRink[] = [
  { id: "baltic-galleria", name: "Baltic Galleria Ice Arena", city: "gdansk", x: -1450, z: -440, color: 0x559db1, theme: "Harbour blue · mall ice" },
  { id: "oliwa-winter", name: "Oliwa Winter Pavilion", city: "gdansk", x: -1360, z: 610, color: 0x56816b, theme: "Garden green · winter stadium" },
  { id: "motlawa-mall", name: "Motława Mall Ice Hall", city: "gdansk", x: -620, z: -30, color: 0xa45b64, theme: "Baltic rose · indoor ice" },
  { id: "shipyard-centre", name: "Shipyard Centre Ice Stadium", city: "gdansk", x: -450, z: 440, color: 0x577cba, theme: "Steel blue · ice stadium" },
  { id: "olaya-ice", name: "Olaya Mall Ice Arena", city: "riyadh", x: 700, z: -360, color: 0x588a88, theme: "Emerald courts · mall ice" },
  { id: "palm-galleria", name: "Palm Galleria Ice Stadium", city: "riyadh", x: 1610, z: 30, color: 0xa98a4a, theme: "Golden palms · ice stadium" },
];
export const rinkArrival = (r: IceRink) => ({ x: r.x, z: r.z - 20 });
export const rinkEntrance = (r: IceRink) => ({ x: r.x, z: r.z - 49 });
export function iceVenueAt(x: number, z: number, margin = 0) {
  return iceRinks.find(r => Math.abs(x - r.x) < VENUE_WIDTH / 2 + margin && Math.abs(z - r.z) < VENUE_LENGTH / 2 + margin);
}
/** Rounded 30 × 60 m ice sheet, with six-metre radius corners. */
export function iceAt(x: number, z: number) {
  return iceRinks.find(r => {
    const dx = Math.abs(x - r.x), dz = Math.abs(z - r.z);
    return dx < 15 && dz < 30 && Math.hypot(Math.max(0, dx - 9), Math.max(0, dz - 24)) < 6;
  });
}
export type RinkSolid = { x: number; z: number; w: number; d: number; h: number; y: number; kind: "wall" | "board" | "stand" | "shop" };
/** Shared by Rapier and navigation; both entrances have a 12 m opening. */
export function rinkSolids(r: IceRink): RinkSolid[] {
  const solids: RinkSolid[] = [], add = (x: number, z: number, w: number, d: number, h: number, kind: RinkSolid["kind"], y = h / 2 + .08) => solids.push({ x: r.x + x, z: r.z + z, w, d, h, y, kind });
  for (const side of [-1, 1]) {
    add(side * 36, 0, .6, 88, 10, "wall");
    add(0, side * 44, 72, .6, 10, "wall");
    // Trim the negative-Z wall into two piers around the main entrance.
    if (side < 0) { solids.pop(); add(-21, -44, 30, .6, 10, "wall"); add(21, -44, 30, .6, 10, "wall"); }
    add(side * 15.2, 0, .4, 48, 2.5, "board");
    add(0, side * 30.2, 18, .4, 2.5, "board");
    if (side < 0) { solids.pop(); add(-7.5, -30.2, 3, .4, 2.5, "board"); add(7.5, -30.2, 3, .4, 2.5, "board"); }
    for (let row = 0; row < 5; row++) add(side * (22.2 + row * 2.4), 0, 2.4, 58, .55 * (row + 1), "stand");
    add(side * 26, -35, 16, 8, 4.2, "shop");
  }
  for (let row = 0; row < 4; row++) add(0, 34.5 + row * 2, 38, 2, .55 * (row + 1), "stand");
  // Small axis-aligned sections approximate the rounded boards physically.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i <= 8; i++) {
    const a = i * Math.PI / 16;
    add(sx * (9 + Math.cos(a) * 6.2), sz * (24 + Math.sin(a) * 6.2), .85, .85, 2.5, "board");
  }
  return solids;
}
const solidsByRink = new Map(iceRinks.map(r => [r.id, rinkSolids(r)]));
export function rinkObstacleAt(x: number, z: number, margin = 0) {
  const venue = iceVenueAt(x, z, margin + 1);
  return !!venue && solidsByRink.get(venue.id)!.some(s => Math.abs(x - s.x) < s.w / 2 + margin && Math.abs(z - s.z) < s.d / 2 + margin);
}
