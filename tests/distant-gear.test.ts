import { expect,it } from 'vitest';
import { padGeometry,distantPadGeometry,helmetShellGeometry,helmetLinerGeometry,distantHelmetShellGeometry,distantHelmetLinerGeometry } from '../src/safety-gear';
import type { BufferGeometry } from 'three';
const triangles=(g:BufferGeometry)=>(g.index?.count||g.getAttribute('position').count)/3;
it('keeps distant helmets, straps and six guards within a small triangle budget',()=>{
  const kinds=['knee','elbow','wrist'] as const;
  const near=triangles(helmetShellGeometry)+triangles(helmetLinerGeometry)+2*kinds.reduce((n,k)=>n+triangles(padGeometry(k)),0);
  const far=triangles(distantHelmetShellGeometry)+triangles(distantHelmetLinerGeometry)+2*kinds.reduce((n,k)=>n+triangles(distantPadGeometry(k)),0);
  expect(far).toBeLessThan(near*.12);
  for(const [near,far] of [[helmetShellGeometry,distantHelmetShellGeometry],[helmetLinerGeometry,distantHelmetLinerGeometry],...kinds.map(k=>[padGeometry(k),distantPadGeometry(k)])]){
    near.computeBoundingBox();far.computeBoundingBox();
    for(const axis of ['x','y','z'] as const){expect(Math.abs(near.boundingBox!.min[axis]-far.boundingBox!.min[axis])).toBeLessThan(.02);expect(Math.abs(near.boundingBox!.max[axis]-far.boundingBox!.max[axis])).toBeLessThan(.02);}
  }
});
