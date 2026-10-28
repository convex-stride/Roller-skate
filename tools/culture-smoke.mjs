import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const url=process.env.GAME_URL||'http://127.0.0.1:4173',errors=[];
function watch(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});}
async function ready(p){await p.goto(url);await p.getByRole('button',{name:'Find your line'}).waitFor({timeout:90000});await p.locator('#lobby-settings').click();await p.locator('#quality').selectOption('0.5');await p.locator('#settings-apply').click();await p.locator('#settings-back').click();await p.getByRole('button',{name:'Find your line'}).click();}
async function visit(p,kind,city,phone=false){
 if(phone)await p.getByRole('button',{name:'Open world map',exact:true}).tap();else await p.keyboard.press('m');
 await p.locator(`[data-map-filter="${kind}"]`).click();await p.locator('#map-travel-mode').click();
 const id=await p.evaluate(({kind,city})=>window.__skate.destinations.find(d=>d.kind===kind&&d.key.includes(city)).key,{kind,city});
 await p.locator(`[data-${kind}="${id}"]`).click();
 await p.waitForFunction(()=>window.__skate.state.grounded&&window.__skate.state.queuedChunks===0,null,{timeout:120000});
 const s=await p.evaluate(()=>window.__skate.state);assert.ok(Number.isFinite(s.position.y)&&s.position.y>.5);return s;
}
try{
 const p=await browser.newPage({viewport:{width:1100,height:740}});watch(p);await ready(p);
 for(const city of ['gdansk','riyadh']){
   const s=await visit(p,'museum',city);assert.ok(s.culture.museums>=8);assert.ok(await p.locator('#museum-card').isVisible());
   await p.screenshot({path:`releases/museum-${city}.png`});await p.locator('#museum-view').click();assert.equal(await p.evaluate(()=>window.__skate.state.paused),true);
   assert.equal(await p.locator('[data-art]').count(),5);
   for(const id of ['starry-night','great-wave','composition-vii','the-scream','udnie']){
     await p.locator(`[data-art="${id}"]`).click();await p.waitForFunction(()=>{const i=document.getElementById('museum-art');return i.complete&&i.naturalWidth>500;});
     assert.ok((await p.locator('#museum-art-title').innerText()).length>3);
   }
   await p.screenshot({path:`releases/museum-${city}-collection.png`});await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>window.__skate.state.paused),false);
   await visit(p,'garden',city);await p.screenshot({path:`releases/green-park-${city}.png`});
   await visit(p,'playground',city);await p.screenshot({path:`releases/flow-court-${city}.png`});
 }
 await p.keyboard.press('p');await p.locator('[data-partner="close"]').click();
 await p.waitForFunction(()=>!!window.__skate.state.crowd.hair.partner,null,{timeout:60000});
 assert.equal(await p.evaluate(()=>window.__skate.state.crowd.hair.styles.length),5);await p.screenshot({path:'releases/taqee-new-hair.png'});await p.close();
 const phone=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});watch(phone);await ready(phone);await visit(phone,'museum','riyadh',true);await phone.locator('#museum-view').tap();
 await phone.locator('[data-art="great-wave"]').tap();await phone.waitForFunction(()=>document.getElementById('museum-art').naturalWidth>500);
 for(const size of [{width:393,height:852},{width:852,height:393}]){await phone.setViewportSize(size);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const r=await phone.locator('#museum-close').boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=size.width);await phone.screenshot({path:`releases/museum-phone-${size.width}.png`});}
 await phone.locator('#museum-close').tap();assert.equal(await phone.evaluate(()=>window.__skate.state.paused),false);
 assert.deepEqual(errors,[]);console.log('Both-city galleries, five real art reproductions, art viewer pause/escape, green parks, flow courts, Taqee hair and portrait/landscape phone gallery passed; zero runtime/shader errors.');
}finally{await browser.close();}
