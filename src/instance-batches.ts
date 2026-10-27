import * as THREE from "three";
/** Keep widely separated instances local without increasing draws for a normal city cell. */
export function batchGroup(group: THREE.Group, shared: readonly THREE.BufferGeometry[], allGeometry = false) {
  const batches = new Map<string, THREE.Mesh[]>();
  for (const child of [...group.children]) if (child instanceof THREE.Mesh && child.visible && (allGeometry || shared.includes(child.geometry))) {
    const key = `${child.geometry.uuid}:${(child.material as THREE.Material).uuid}`;
    const list = batches.get(key) ?? []; list.push(child); batches.set(key, list);
  }
  function instance(list: THREE.Mesh[]) {
    const mesh = new THREE.InstancedMesh(list[0].geometry, list[0].material, list.length);
    list.forEach((child,i) => { child.updateMatrix(); mesh.setMatrixAt(i,child.matrix); group.remove(child); });
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh);
  }
  for (const list of batches.values()) {
    const bounds = new THREE.Box3().setFromPoints(list.map(child => child.position));
    if (bounds.max.x - bounds.min.x <= 400 && bounds.max.z - bounds.min.z <= 400) { instance(list); continue; }
    const cells = new Map<string, THREE.Mesh[]>();
    for (const child of list) {
      const key = `${Math.floor(child.position.x / 200)}:${Math.floor(child.position.z / 200)}`;
      const cell = cells.get(key) ?? []; cell.push(child); cells.set(key, cell);
    }
    for (const cell of cells.values()) instance(cell);
  }
}
