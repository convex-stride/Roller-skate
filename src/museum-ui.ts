import { artCollection } from './art-collection';
import { culturePlaces, type CulturePlace } from './culture';
import './museum.css';
export function createMuseumUI(callbacks:{pause:()=>void;resume:()=>void}) {
  const card=document.createElement('aside');card.id='museum-card';card.hidden=true;
  card.innerHTML='<small>ART / OPEN GALLERY</small><strong id="museum-name"></strong><button id="museum-view">View paintings</button>';
  document.getElementById('hud')!.append(card);
  const panel=document.createElement('section');panel.id='museum-panel';panel.className='hidden';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Art collection');
  panel.innerHTML=`<div class="museum-heading"><span>THE TRAVELLING COLLECTION</span><button id="museum-close">Back to skating ×</button></div><h2 id="museum-title"></h2><div class="museum-body"><nav aria-label="Choose an artwork">${artCollection.map(a=>`<button data-art="${a.id}"><img src="${a.image}" alt=""><b>${a.title}</b><small>${a.artist}</small></button>`).join('')}</nav><article><img id="museum-art" alt=""><h3 id="museum-art-title"></h3><p id="museum-artist"></p><p id="museum-art-detail"></p><small>Public-domain artwork · Reproduction bundled for offline viewing. Credits in Settings → Save & credits.</small></article></div>`;
  document.body.append(panel);
  const el=(id:string)=>document.getElementById(id)!;
  let nearby:CulturePlace|undefined,previousFocus:HTMLElement|null=null;
  function select(id:string) {
    const art=artCollection.find(a=>a.id===id)!;const image=el('museum-art') as HTMLImageElement;image.src=art.image;image.alt=`${art.title}, ${art.artist}, ${art.year}`;
    el('museum-art-title').textContent=art.title;el('museum-artist').textContent=`${art.artist} · ${art.year}`;el('museum-art-detail').textContent=art.detail;
    panel.querySelectorAll<HTMLButtonElement>('[data-art]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.art===id)));
  }
  function close(){panel.classList.add('hidden');callbacks.resume();previousFocus?.focus();}
  el('museum-close').onclick=close;
  el('museum-view').onclick=()=>{
    if(!nearby)return;previousFocus=document.activeElement as HTMLElement;callbacks.pause();el('museum-title').textContent=nearby.label;select(artCollection[0].id);panel.classList.remove('hidden');el('museum-close').focus();
  };
  panel.addEventListener('keydown',e=>{
    if(e.key==='Tab'){const buttons=[...panel.querySelectorAll<HTMLButtonElement>('button')],i=buttons.indexOf(document.activeElement as HTMLButtonElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
  });
  panel.addEventListener('click',e=>{const id=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-art]')?.dataset.art;if(id)select(id);});
  return {get opened(){return !panel.classList.contains('hidden');},close,update(x:number,z:number,playing:boolean,paused:boolean){nearby=culturePlaces.find(p=>p.kind==='museum'&&Math.hypot(x-p.exhibit!.x,z-p.exhibit!.z)<18);const busy=!document.getElementById('partner-panel')!.classList.contains('hidden')||document.querySelector<HTMLElement>('.touch-more')?.hidden===false;card.hidden=!nearby||!playing||paused||busy;if(nearby)el('museum-name').textContent=nearby.label;}};
}
