import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|THREE/i.test(m.text()))errors.push(m.text());});
 await p.goto(process.env.GAME_URL||'http://127.0.0.1:4173');await p.getByRole('button',{name:'Find your line'}).waitFor({timeout:90000});
 await p.locator('#lobby-settings').tap();await p.locator('#quality').selectOption('0.5');await p.locator('#settings-apply').tap();await p.locator('#settings-back').tap();await p.locator('#select-riyadh').tap();await p.getByRole('button',{name:'Find your line'}).tap();
 await p.getByRole('button',{name:'Pause game',exact:true}).tap();await p.locator('#rail-practice').tap();
 await p.waitForFunction(()=>window.__skate.state.grounded&&window.__skate.state.queuedChunks===0,undefined,{timeout:120000});
 const client=await p.context().newCDPSession(p),stick=await p.locator('#touch-stick').boundingBox(),cx=stick.x+stick.width/2,cy=stick.y+stick.height/2;
 const push={id:1,x:cx,y:cy-42};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx,y:cy}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[push]});
 await p.waitForFunction(()=>window.__skate.state.position.z>4.5,undefined,{timeout:90000});
 const jump=await p.locator('.touch-jump').boundingBox(),jp={id:2,x:jump.x+jump.width/2,y:jump.y+jump.height/2};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[push,jp]});await p.waitForFunction(()=>!!window.__skate.state.grinding,undefined,{timeout:60000});
 // CDP touchEnd lists the contacts being lifted, not the contacts to retain.
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[jp]});
 await p.waitForFunction(()=>window.__skate.state.touch.throttle>.8&&!window.__skate.state.touch.jump,undefined,{timeout:10000});
 const royale=await p.getByRole('button',{name:'Royale grind',exact:true}).boundingBox(),rp={id:2,x:royale.x+royale.width/2,y:royale.y+royale.height/2};
 console.log(JSON.stringify(await p.evaluate(rp=>({phase:'before Royale',target:document.elementFromPoint(rp.x,rp.y)?.outerHTML,position:window.__skate.state.position,grinding:window.__skate.state.grinding,style:window.__skate.state.grindStyle,touch:window.__skate.state.touch}),rp)));
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[push,rp]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[rp]});
 await p.waitForFunction(()=>window.__skate.state.grindStyle==='Royale grind'&&window.__skate.state.grindingDistance>3,undefined,{timeout:60000}).catch(async error=>{console.log(JSON.stringify(await p.evaluate(()=>window.__skate.state)));await p.screenshot({path:'releases/phone-rail-failure.png'});throw error;});
 const s=await p.evaluate(()=>window.__skate.state);assert.ok(s.speed>1);assert.ok(s.railFlow.remaining>0);assert.ok(await p.locator('#rail-flow').isVisible());
 await p.screenshot({path:'releases/rail-flow-phone.png'});
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[push,jp]});await p.waitForFunction(()=>!window.__skate.state.grinding&&window.__skate.state.verticalSpeed>2);
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForFunction(()=>window.__skate.state.grounded,undefined,{timeout:60000});
 assert.ok(await p.getByRole('button',{name:'Backflip',exact:true}).isVisible());
 await p.setViewportSize({width:852,height:393});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:'releases/rail-flow-phone-landscape.png'});
 assert.deepEqual(errors,[]);console.log('Phone multi-touch push + jump rail catch, sustained motion, contextual Royale button, grind HUD, pop-out, landing and landscape controls passed; no runtime/shader errors.');
}finally{await browser.close();}
