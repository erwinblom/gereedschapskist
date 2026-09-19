const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),ext=path.join(root,'extensies/link-bewaren-lokaal'),home='https://erwinblom.github.io/gereedschapskist/',profile=fs.mkdtempSync(path.join(os.tmpdir(),'gk-links-'));
(async()=>{
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
 const errors=[];try{
 await context.route(home+'**',async route=>{const u=new URL(route.request().url()),f=path.join(root,'docs',decodeURIComponent(u.pathname.slice('/gereedschapskist/'.length)));if(fs.existsSync(f)&&fs.statSync(f).isFile())await route.fulfill({path:f,contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html'});else await route.abort()});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=new URL(worker.url()).host;
 const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
 const call=(type,extra={})=>popup.evaluate(async({type,extra})=>chrome.runtime.sendMessage({type,...extra}),{type,extra});
 const item={title:'Een lokale bron',url:'https://example.org/artikel',quote:'Een geselecteerd citaat',notes:'Eigen notitie <script>alert(1)</script>'};
 await popup.locator('#title').fill(item.title);await popup.locator('#url').fill(item.url);await popup.locator('#quote').fill(item.quote);await popup.locator('#notes').fill(item.notes);await popup.locator('#save').click();await popup.waitForTimeout(500);console.log('Capture:',await popup.locator('#message').textContent());await popup.waitForFunction(()=>document.getElementById('message').textContent.startsWith('Lokaal bewaard'));
 assert.equal((await call('status')).pending,1);await popup.reload();assert.equal((await call('status')).pending,1);
 assert.equal((await call('add',{item:{...item,url:'javascript:alert(1)'}})).ok,false);
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(home+'Apps/Bronnenkast/Start%20Bronnenkast.html?werkruimte=eigen');await p.locator('#receive-local-links').click();await p.waitForFunction(()=>document.getElementById('link-local-message').textContent.startsWith('1 nieuwe'));
 assert.equal((await call('status')).pending,0);assert.equal((await call('status')).total,1);assert.equal(await p.evaluate(()=>data.items.length),1);assert.equal(await p.evaluate(()=>data.items[0].quote),item.quote);
 await p.locator('.library-title').click();assert.equal(await p.locator('#library-detail .detail-text').last().textContent(),item.notes);await p.locator('.detail-close').click();
 await call('retry');await p.locator('#receive-local-links').click();await p.waitForFunction(()=>document.getElementById('link-local-message').textContent.startsWith('0 nieuwe'));assert.equal(await p.evaluate(()=>data.items.length),1);
 // Interrupted acknowledgement: the receiver keeps its item and retry does not duplicate it.
 await call('retry');
 await p.evaluate(()=>{window.originalPost=window.postMessage;window.postMessage=function(m,...rest){if(m?.channel==='gk-link-local-request'&&m.type==='ack')return;return window.originalPost.call(window,m,...rest)}});
 await p.locator('#receive-local-links').click();await p.waitForFunction(()=>document.getElementById('link-local-message').textContent.includes('Geen verbinding'));
 assert.equal((await call('status')).pending,1);await p.evaluate(()=>window.postMessage=window.originalPost);
 await p.locator('#receive-local-links').click();await p.waitForFunction(()=>document.getElementById('link-local-message').textContent.startsWith('0 nieuwe'));assert.equal(await p.evaluate(()=>data.items.length),1);
 await call('add',{item:{...item,title:'Tweede bron'}});
 await p.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('disk full')}});
 await p.locator('#receive-local-links').click();await p.waitForFunction(()=>document.getElementById('link-local-message').textContent.includes('Browseropslag niet bevestigd'));assert.equal((await call('status')).pending,1);
 await p.evaluate(()=>Storage.prototype.setItem=window.originalSet);await p.reload();await p.locator('#receive-local-links').click();await p.waitForFunction(()=>document.getElementById('link-local-message').textContent.startsWith('1 nieuwe'));assert.equal((await call('status')).pending,0);assert.equal(await p.evaluate(()=>data.items.length),2);
 const r=await Promise.all(Array.from({length:5},(_,n)=>call('add',{item:{...item,title:'Gelijktijdig '+n}})));assert(r.every(x=>x.ok));assert.equal((await call('status')).pending,5);
 const example=await context.newPage();await example.goto(home+'Apps/Bronnenkast/Start%20Bronnenkast.html?werkruimte=voorbeeld');await example.locator('#receive-local-links').click();assert.match(await example.locator('#link-local-message').textContent(),/eigen werk/);assert.equal((await call('status')).pending,5);await example.close();
 await p.locator('#receive-local-links').click();await p.waitForFunction(()=>document.getElementById('link-local-message').textContent.startsWith('5 nieuwe'));assert.equal(await p.evaluate(()=>data.items.length),7);
 await p.locator('#categories [data-category="cat:Inbox"]').click();assert.equal(await p.locator('.card').count(),7);
 await p.locator('#search').fill('Tweede');assert.equal(await p.locator('.card').count(),1);assert.equal(await p.locator('.library-title').count(),1);await p.locator('#search').fill('');
 await p.setViewportSize({width:1366,height:900});await p.screenshot({path:'/tmp/gk-library-local.png',fullPage:true});await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await popup.locator('summary').click();const download=popup.waitForEvent('download');await popup.locator('#export').click();const file=await download;const data=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(data.items.length,7);assert.equal(data.format,'bronnenkast');
 assert.deepEqual(errors,[]);console.log('OK: echte extensie, capture, wachtrij, ontvangst, deduplicatie, quota-fout, parallel bewaren, voorbeeldisolatie, herstelbestand, zoeken, details en mobiel');
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
