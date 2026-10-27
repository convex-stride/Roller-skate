import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const url = process.env.GAME_URL || "http://127.0.0.1:4173", errors = [];
function watch(p) { p.on("pageerror", e => errors.push(e.message)); p.on("console", m => { if(m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); }); }
async function lowGraphics(p) {
  await p.locator('#lobby-settings').click({timeout:90000}); await p.locator('#quality').selectOption('0.5'); await p.locator('#settings-apply').click(); await p.locator('#settings-back').click();
}
async function visit(p, phone = false) {
  if(phone) await p.getByRole("button", { name: "Open world map", exact: true }).tap(); else await p.keyboard.press("m");
  await p.getByRole("button", { name: "Ice arenas", exact: true }).click(); await p.locator("#map-travel-mode").click(); await p.locator('[data-rink="baltic-galleria"]').click();
  await p.waitForFunction(() => { const s = window.__skate.state; return s.rink?.id === "baltic-galleria" && s.rink.onIce && s.grounded && s.queuedChunks === 0; }, undefined, { timeout: 90000 });
}
async function move(p, id, key, phone=false) {
  const before = await p.evaluate(() => window.__skate.state.figure.completed);
  if(phone) { await p.getByRole("button", { name: "Figure skating moves", exact:true }).tap(); await p.locator(`[data-figure="${id}"]`).tap(); }
  else await p.keyboard.press(key);
  await p.waitForFunction(id => {const f=window.__skate.state.figure;return f.action === id && f.phase !== "entry" && f.mix > .9;}, id, {timeout:60000});
  await p.screenshot({path:`releases/figure-${phone?'phone-':''}${id}.png`});
  await p.waitForFunction(n => window.__skate.state.figure.completed > n, before, {timeout:60000}).catch(async e => { console.log(JSON.stringify(await p.evaluate(() => window.__skate.state))); throw e; });
  const s=await p.evaluate(() => window.__skate.state); assert.equal(s.figure.lastResult.action,id); assert.ok(s.rink.onIce); console.log(`Move ${id} passed (${phone?'phone':'keyboard'})`);
}
try {
  await mkdir("releases",{recursive:true});
  const p=await browser.newPage({viewport:{width:1100,height:740}});watch(p);
  await p.goto(url);await lowGraphics(p);await p.getByRole("button",{name:"Find your line"}).click({timeout:90000});
  const moves=[['upright','5'],['sit','6'],['camel','7'],['spiral','8'],['eagle','9'],['axel','0'],['salchow','l'],['toeloop','k']];
  if (!process.env.SKIP_MOVES) for(const [id,key] of moves){await visit(p);await move(p,id,key);}
  for(const mode of ['spotlight','duet']){
    await visit(p);await p.locator('#ice-play').click();await p.locator('[data-ice-tab="games"]').click();await p.locator(`[data-ice-game="${mode}"]`).click();
    const total=mode==='duet'?3:4;
    for(let stage=0;stage<total;stage++){
      await p.waitForFunction(() => window.__skate.state.grounded && !window.__skate.state.figure.action,undefined,{timeout:60000});
      await p.locator('#ice-run-next').click();
      await p.waitForFunction(stage => window.__skate.state.iceGame.stage>stage,stage,{timeout:60000}).catch(async e=>{console.log(JSON.stringify(await p.evaluate(()=>window.__skate.state)));throw e;});
    }
    const s=await p.evaluate(()=>window.__skate.state);assert.equal(s.iceGame.status,'won');assert.ok(s.iceRecords[`baltic-galleria:${mode}`]);assert.match(s.appearance.helmet,/skate helmet/);
    await p.screenshot({path:`releases/figure-${mode}-medal.png`});console.log(`${mode} complete`);
    await p.locator('#ice-run-stop').click();
  }
  await p.reload();await p.getByRole('button',{name:'Find your line'}).click({timeout:90000});
  assert.equal(Object.keys(await p.evaluate(()=>window.__skate.state.iceRecords)).length,2);
  await visit(p);await p.keyboard.press('i');await p.locator('[data-ice-tab="medals"]').click();assert.match(await p.locator('#ice-medals').innerText(),/2 \/ 18/);await p.locator('#ice-lab-close').click();
  await p.locator('#ice-play').click();await p.locator('[data-ice-tab="games"]').click();await p.locator('[data-ice-game="slalom"]').click();
  assert.equal((await p.evaluate(()=>window.__skate.state.iceGame)).mode,'slalom');await p.screenshot({path:'releases/figure-neon-gates.png'});await p.close();
  const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const phone=await context.newPage();watch(phone);await phone.goto(url);await lowGraphics(phone);await phone.getByRole('button',{name:'Find your line'}).tap({timeout:90000});await visit(phone,true);
  await phone.getByRole('button',{name:'Figure skating moves',exact:true}).tap();assert.equal(await phone.locator('[data-figure]:visible').count(),8);
  assert.equal(await phone.locator('[data-ice-game]:visible').count(),0);await phone.screenshot({path:'releases/figure-phone-menu.png'});await phone.locator('#ice-lab-close').tap();
  await move(phone,'camel',null,true);await visit(phone,true);await move(phone,'axel',null,true);
  await phone.setViewportSize({width:852,height:393});await phone.getByRole('button',{name:'Figure skating moves',exact:true}).tap();
  const bounds=await phone.locator('#ice-lab').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=852&&bounds.y+bounds.height<=393);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await phone.screenshot({path:'releases/figure-phone-landscape.png'});assert.deepEqual(errors,[]);
  console.log('Eight keyboard moves, complete spotlight + Taqee duet, saved medals, neon gates, phone figure actions and portrait/landscape menus passed; no runtime/shader errors.');
}finally{await browser.close();}
