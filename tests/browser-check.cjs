const { chromium, webkit } = require('playwright');
(async()=>{for(const engine of (process.env.BROWSER_CHANNEL ? [chromium] : [chromium,webkit])){ const browser=await engine.launch({headless:true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {})}); const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8000'); await page.locator('#btn-edit-setup').click();await page.locator('[data-pick]').first().click();
if(await page.locator('[data-library-car]').count()!==50)throw Error('brand count');
await page.locator('#car-search').fill('skoda');if(await page.locator('[data-library-car]').count()!==1)throw Error('accent search');
await page.locator('#car-search').fill('BMW');await page.locator('[data-library-car="bmw"]').click();
if(await page.locator('.selected-car-name').first().innerText()!=='BMW')throw Error('brand selection');
await page.locator('[data-sound]').first().selectOption('4');await page.locator('[data-preview]').first().click(); await page.locator('#btn-start').click();
await page.locator('[data-panel]').first().click(); if(await page.locator('[data-score]').first().innerText()!=='1')throw Error('score');await page.locator('[data-minus]').first().click();if(await page.locator('[data-score]').first().innerText()!=='0')throw Error('minus double scoring');
for(const count of [2,3]){if(count===3){await page.evaluate(()=>{state.players.push(Game.player('Rachel','ford','#96355a'));renderBoard();});}
for(const [width,height]of [[390,844],[844,390],[800,900],[1440,900]]){await page.setViewportSize({width,height});const boxes=await page.locator('.panel-art').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}}));if(boxes.some(b=>b.width<60||b.height<70))throw Error(JSON.stringify({count,width,height,boxes}));console.log(engine.name(),count,width,height,boxes);}}
await page.locator('#btn-end').click();if(await page.locator('#leaderboard').isVisible())throw Error('duplicate results');await page.locator('[data-tab=all]').click();if(!await page.locator('#leaderboard').isVisible())throw Error('missing leaderboard');if(errors.length)throw Error(errors.join());await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
await page.context().setOffline(true);await page.reload();await page.locator('#btn-new-trip').click();await page.locator('#btn-edit-setup').click();await page.locator('[data-pick]').first().click();
await page.waitForFunction(()=>Array.from(document.querySelectorAll('#library-grid img')).every(img=>img.complete&&img.naturalWidth>0));
await page.setViewportSize({width:390,height:844});await page.screenshot({path:process.env.TEMP+'/spotted-brands.png',fullPage:true});
await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
