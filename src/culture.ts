import { centers, districtSites, type City } from './world';
import type { DistrictSite, DistrictProp } from './district-content';
export type CulturePlace = { id:string; kind:'museum'|'garden'|'playground'; label:string; city:City; site:DistrictSite; x:number; z:number; exhibit?:DistrictProp };
export const culturePlaces: CulturePlace[] = [];
for (const city of ['gdansk','riyadh'] as const) {
  const sites: DistrictSite[] = [];
  for(let ix=0;ix<8;ix++) for(let iz=0;iz<8;iz++) sites.push(...districtSites(centers[city]-700+ix*200,-700+iz*200,city));
  for (const site of sites) {
    const exhibit=site.props.find(p=>p.kind==='museum'); if(!exhibit) continue;
    culturePlaces.push({id:`museum-${site.id}`,kind:'museum',label:`${city==='gdansk'?'Baltic Art Pavilion':'Najdi Art Courtyard'} ${culturePlaces.filter(p=>p.city===city&&p.kind==='museum').length+1}`,city,site,x:exhibit.x,z:exhibit.z-4.5,exhibit});
  }
  for(let ix=0;ix<4;ix++)for(let iz=0;iz<4;iz++) for(const kind of ['garden','playground'] as const) {
    const x=centers[city]-600+ix*400,z=-600+iz*400;
    const site=sites.filter(s=>s.size>=24&&Math.abs(s.x-x)<200&&Math.abs(s.z-z)<200&&(kind==='garden'?s.green:s.props.some(p=>p.kind==='quarter'||p.kind==='funbox'))).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
    if(site)culturePlaces.push({id:`${kind}-${site.id}`,kind,label:`${city==='gdansk'?'Baltic':'Riyadh'} ${kind==='garden'?'Green Park':'Flow Court'} ${ix*4+iz+1}`,city,site,x:site.x,z:site.z-5});
  }
}
