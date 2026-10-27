import type { DistrictProp } from "./district-content";
/** A closed wedge, shared by the visible bank and its Rapier collision. */
export function streetBankGeometry(p: DistrictProp) {
  const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, z0 = p.z - p.d / 2, z1 = p.z + p.d / 2;
  return {
    vertices: new Float32Array([x0, 0.015, z0, x1, 0.015, z0, x0, 0.015, z1, x1, 0.015, z1, x0, p.h, z1, x1, p.h, z1]),
    indices: new Uint32Array([0, 4, 1, 1, 4, 5, 0, 2, 4, 1, 5, 3, 2, 3, 5, 2, 5, 4, 0, 1, 2, 1, 3, 2]),
  };
}
