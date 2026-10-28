import type { DistrictProp } from "./district-content";
/** A closed wedge, shared by the visible bank and its Rapier collision. */
export function streetBankGeometry(p: DistrictProp) {
  if (p.kind === 'quarter' || p.kind === 'funbox') {
    const vertices: number[] = [], indices: number[] = [], rows = 18;
    for (let i = 0; i <= rows; i++) {
      const t = i / rows, profile = p.kind === 'quarter' ? 1 - Math.sqrt(Math.max(0, 1 - t * t)) : Math.min(1, t / .3, (1 - t) / .3);
      const z = p.z - p.d / 2 + t * p.d, y = .015 + profile * (p.h - .015);
      vertices.push(p.x - p.w / 2, y, z, p.x + p.w / 2, y, z, p.x - p.w / 2, .005, z, p.x + p.w / 2, .005, z);
      if (i < rows) { const n = i * 4; indices.push(n,n+4,n+1,n+1,n+4,n+5,n,n+2,n+4,n+2,n+6,n+4,n+1,n+5,n+3,n+3,n+5,n+7,n+2,n+3,n+6,n+3,n+7,n+6); }
    }
    indices.push(0,1,2,1,3,2); const n = rows * 4; indices.push(n,n+2,n+1,n+1,n+2,n+3);
    return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
  }
  const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, z0 = p.z - p.d / 2, z1 = p.z + p.d / 2;
  return {
    vertices: new Float32Array([x0, 0.015, z0, x1, 0.015, z0, x0, 0.015, z1, x1, 0.015, z1, x0, p.h, z1, x1, p.h, z1]),
    indices: new Uint32Array([0, 4, 1, 1, 4, 5, 0, 2, 4, 1, 5, 3, 2, 3, 5, 2, 5, 4, 0, 1, 2, 1, 3, 2]),
  };
}
