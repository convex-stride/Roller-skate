import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const url=process.env.GAME_URL||"http://127.0.0.1:4173", errors=[];
function watch(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|THREE/i.test(m.text()))errors.push(m.text());});}
async function start(p){await p.goto(url);await p.getByRole('button',{name:'Find your line'}).waitFor({timeout:90000});await p.locator('#lobby-settings').click();await p.locator('#quality').selectOption('0.5');await p.locator('#settings-apply').click();await p.locator('#settings-back').click();await p.getByRole('button',{name:'Find your line'}).click();await settled(p);}
async function settled(p){await p.waitForFunction(()=>window.__skate.state.grounded&&window.__skate.state.queuedChunks===0,undefined,{timeout:120000});}
async function pause(p,phone=false){if(phone)await p.getByRole('button',{name:'Pause game',exact:true}).tap();else await p.keyboard.press('Escape');}
async function rink(p,phone=false){if(phone)await p.getByRole('button',{name:'Open world map',exact:true}).tap();else await p.keyboard.press('m');await p.getByRole('button',{name:'Ice arenas',exact:true}).click();await p.locator('#map-travel-mode').click();await p.locator('[data-rink="baltic-galleria"]').click();await settled(p);}
try{
 await mkdir('releases',{recursive:true});
 if (!process.env.PHONE_ONLY) {
 const p=await browser.newPage({viewport:{width:1100,height:740}});watch(p);await start(p);
 // A clicked gameplay button used to swallow subsequent WASD keyboard input.
 await p.locator('#partner-toggle').click();await p.locator('[data-partner="close"]').click();
 await p.keyboard.down('w');await p.waitForFunction(()=>window.__skate.state.speed>2,undefined,{timeout:60000});await p.keyboard.up('w');
 await p.keyboard.down('s');await p.waitForFunction(()=>window.__skate.state.speed<.3,undefined,{timeout:60000});await p.keyboard.up('s');
 let s=await p.evaluate(()=>window.__skate.state);assert.ok(s.crowd.detailed<=4);assert.ok(Math.hypot(s.cameraPosition.x-s.position.x,s.cameraPosition.z-s.position.z)>3);
 await pause(p);await p.locator('#pause-night').click();await p.locator('#resume').click();
 await p.waitForFunction(()=>window.__skate.state.rendering.fireworks.leadMessage);await p.screenshot({path:'releases/love-fireworks-gdansk.png'});
 s=await p.evaluate(()=>window.__skate.state);assert.equal(s.rendering.fireworks.message,'I LOVE YOU LAYAN');assert.equal(s.rendering.fireworks.launchSites,8);assert.equal(s.preferences.quality,'0.5');
 await p.reload();await p.getByRole('button',{name:'Find your line'}).waitFor({timeout:90000});assert.equal(await p.locator('#nightMode').isChecked(),true);
 await p.locator('#select-riyadh').click();await p.getByRole('button',{name:'Find your line'}).click();await settled(p);await p.screenshot({path:'releases/love-fireworks-riyadh.png'});
 for(const [id,key] of [['loop','u'],['lutz','o'],['twizzle','y'],['bauer','-']]){
  await rink(p);const n=await p.evaluate(()=>window.__skate.state.figure.completed);await p.keyboard.press(key);
  await p.waitForFunction(id=>window.__skate.state.figure.action===id&&window.__skate.state.figure.phase!=='entry',id,{timeout:60000});
  await p.screenshot({path:`releases/polish-${id}.png`});await p.waitForFunction(n=>window.__skate.state.figure.completed>n,n,{timeout:60000});console.log(`New move ${id} passed`);
 }
 await p.keyboard.press('i');await p.locator('[data-ice-tab="games"]').click();await p.locator('[data-ice-game="spotlight"]').click();
 const first=await p.evaluate(()=>window.__skate.state.iceGame.targetMove);await p.locator('#ice-run-stop').click();await p.keyboard.press('i');await p.locator('[data-ice-tab="games"]').click();await p.locator('[data-ice-game="spotlight"]').click();assert.notEqual(await p.evaluate(()=>window.__skate.state.iceGame.targetMove),first);
 await p.close();
 }
 const phone=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1});watch(phone);await start(phone);
 await pause(phone,true);await phone.locator('#pause-night').tap();await phone.locator('#resume').tap();await phone.waitForFunction(()=>window.__skate.state.rendering.fireworks.leadMessage);
 let mobile=await phone.evaluate(()=>window.__skate.state);assert.ok(mobile.crowd.detailed<=2);assert.equal(mobile.rendering.fireworks.particleBudget,288);await phone.screenshot({path:'releases/love-fireworks-phone.png'});
 await pause(phone,true);await phone.locator('#pause-settings').tap();await phone.locator('#tab-accessibility').click();await phone.locator('#reducedMotion').check();await phone.locator('#settings-apply').tap();await phone.locator('#settings-back').tap();await phone.locator('#resume').tap();
 await phone.waitForFunction(()=>!window.__skate.state.rendering.fireworks.particlesVisible&&window.__skate.state.rendering.fireworks.visibleMessages===4);
 await pause(phone,true);await phone.locator('#pause-night').tap();await phone.locator('#resume').tap();await phone.waitForFunction(()=>!window.__skate.state.rendering.fireworks.enabled);
 await rink(phone,true);await phone.getByRole('button',{name:'Figure skating moves',exact:true}).tap();assert.equal(await phone.locator('[data-figure]').count(),12);
 await phone.setViewportSize({width:852,height:393});const b=await phone.locator('#ice-lab').boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=853&&b.y+b.height<=394);await phone.screenshot({path:'releases/polish-phone-moves.png'});
 const n=await phone.evaluate(()=>window.__skate.state.figure.completed);await phone.locator('[data-figure="bauer"]').tap();await phone.waitForFunction(n=>window.__skate.state.figure.completed>n,n,{timeout:60000});
 assert.deepEqual(errors,[]);console.log(process.env.PHONE_ONLY ? 'Phone fireworks in front of the camera, night shortcut, reduced motion, 12-move menu and landscape Ina Bauer passed; zero runtime/shader errors.' : 'Menu-focus movement, camera spacing with Taqee, reduced NPC workloads, four new physical moves, varied replays, night shortcut + saved fireworks in both cities, reduced motion and phone controls passed; zero runtime/shader errors.');
}finally{await browser.close();}
