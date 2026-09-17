// Run with NODE_PATH pointing to an installed Playwright package.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const root=path.resolve(__dirname,'../docs');
const tools={Ping:['ping-local-v1','invoices'],Projectbord:['projectbord-v1','tasks'],Bronnenkast:['bronnenkast-v1','items'],Uren:['uren-v1','entries'],Contacten:['contacten-v1','contacts'],Publicatieplanner:['publicatieplanner-v1','items'],Offerte:['offerte-v1','quotes'],Kasboek:['kasboek-v1','entries'],Werkbank:['converterFiles',null]};
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));try{res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.statusCode=404;res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [folder,[key,collection]] of Object.entries(tools)){
  const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=base+'/Apps/'+folder+'/'+encodeURIComponent(folder==='Werkbank'?'▶ Begin hier.html':`Start ${folder}.html`);const realKey='gereedschapskist:'+key;
  await page.goto(url);await page.waitForSelector('#workspace-switch',{state:'attached'});
  assert.equal(await page.evaluate(()=>GereedschapskistMode.example),true,folder+' default examples');
  const example=await page.evaluate(k=>JSON.parse(localStorage.getItem('voorbeeld:'+k)),realKey);
  assert((collection?example[collection]:example).length>0,folder+' sample content');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),realKey),null,folder+' untouched own data');
  if(folder==='Werkbank'){await page.waitForSelector('.tree-file');await page.waitForSelector('#content .markdown-content h1');assert.match(await page.locator('#content').innerText(),/Buurtwerkplaats De Proeftuin/);}
  // Export must be labelled as example data and never silently imported as real work.
  if(folder!=='Werkbank'){
   const pending=page.waitForEvent('download');await page.locator(folder==='Ping'?'#save':'#export').click();const dl=await pending;
   assert.match(dl.suggestedFilename(),/^gereedschapskist-voorbeeld-/);
   const exported=JSON.parse(fs.readFileSync(await dl.path()));assert.equal(exported._gereedschapskistExample,true);
  }
  if(folder==='Ping'){
   await page.locator('#finalize').click();assert.equal(await page.locator('#final-dialog').evaluate(e=>e.open),false);assert.deepEqual(await page.evaluate(()=>data.sequences),{});
  }
  if(await page.locator('#workspace-switch').isHidden())await page.locator('#workspace-help-toggle').click();await page.locator('#workspace-switch').click();await page.waitForURL(/werkruimte=eigen/);await page.waitForSelector('.example-mode.own',{state:'attached'});
  assert.equal(await page.evaluate(()=>GereedschapskistMode.example),false);
  if(folder==='Werkbank')assert.equal(await page.evaluate(()=>converterFiles.size),0);else assert.equal(await page.evaluate(c=>data[c].length,collection),0,folder+' empty own');
  // Preserve a sentinel own administration byte-for-byte through repeated mode switches.
  const own=structuredClone(example);
  const raw=JSON.stringify(own);await page.evaluate(([k,v])=>{localStorage.setItem(k,v);localStorage.setItem(k+'-previous','untouched recovery');},[realKey,raw]);await page.reload();await page.waitForSelector('#workspace-switch',{state:'attached'});
  if(await page.locator('#workspace-switch').isHidden())await page.locator('#workspace-help-toggle').click();await page.locator('#workspace-switch').click();await page.waitForURL(/werkruimte=voorbeeld/);await page.waitForSelector('#workspace-switch',{state:'attached'});
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),realKey),raw);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k+'-previous'),realKey),'untouched recovery');
  await page.evaluate(()=>{const k=document.querySelector('script[data-key]').dataset.key;GereedschapskistMode.storage.setItem(k+'-previous','example recovery');GereedschapskistMode.storage.setItem(k,GereedschapskistMode.storage.getItem(k));});
  assert.equal(await page.evaluate(k=>localStorage.getItem(k+'-previous'),realKey),'untouched recovery');
  if(folder==='Werkbank')await page.waitForSelector('#content .markdown-content h1');
  await page.screenshot({path:'/tmp/gereedschapskist-'+folder+'.png',fullPage:false});
  if(await page.locator('#workspace-switch').isHidden())await page.locator('#workspace-help-toggle').click();await page.locator('#workspace-switch').click();await page.waitForURL(/werkruimte=eigen/);await page.waitForSelector('#workspace-switch',{state:'attached'});assert.equal(await page.evaluate(k=>localStorage.getItem(k),realKey),raw);
  if(collection){const rejected=await page.evaluate(d=>{try{validate({...d,_gereedschapskistExample:true});return false;}catch{return true;}},example);assert(rejected,folder+' rejects example import into own work');}
  // Existing users without mode preferences must never land in example data.
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('gereedschapskist-mode:'))localStorage.removeItem(k)});
  await page.goto(url);await page.waitForSelector('.example-mode.own',{state:'attached'});assert.equal(await page.evaluate(k=>localStorage.getItem(k),realKey),raw);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),folder+' mobile width');
  assert.deepEqual(errors,[],folder+' no script errors');console.log('OK',folder,'examples, export, empty start, isolation, existing user, mobile');await context.close();
 }
 // Preserve legacy writing users whose only stored state is IndexedDB.
 const context=await browser.newContext();const p=await context.newPage();await p.goto(base+'/index.html');
 await p.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('gereedschapskist:MarkdownWerkbankLocalV2',1);r.onupgradeneeded=()=>r.result.createObjectStore('handles');r.onsuccess=()=>{r.result.close();resolve()};r.onerror=reject}));
 await p.goto(base+'/Apps/Werkbank/'+encodeURIComponent('▶ Begin hier.html'));await p.waitForURL(/werkruimte=eigen/);await p.waitForSelector('.example-mode.own',{state:'attached'});console.log('OK existing writing database respected');await context.close();
// The actual ZIP is the offline deliverable: test it with network disconnected.
 const os=require('node:os'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
 const extracted=fs.mkdtempSync(path.join(os.tmpdir(),'gereedschapskist-test-'));
 try{execFileSync('unzip',['-q',path.resolve(__dirname,'../dist/Gereedschapskist.zip'),'-d',extracted]);
 for(const [folder,[key,collection]] of Object.entries(tools)){
  const c=await browser.newContext({offline:true}),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const filename=folder==='Werkbank'?'▶ Begin hier.html':`Start ${folder}.html`;
  await p.goto(pathToFileURL(path.join(extracted,'Gereedschapskist/Apps',folder,filename)).href);
  await p.waitForSelector('#workspace-switch',{state:'attached'});assert.equal(await p.evaluate(()=>GereedschapskistMode.example),true,folder+' offline examples');
  if(collection)assert(await p.evaluate(k=>data[k].length>0,collection));else await p.waitForSelector('.tree-file');
  await p.locator('#workspace-switch').click();await p.waitForSelector('.example-mode.own',{state:'attached'});
  assert.equal(await p.evaluate(()=>GereedschapskistMode.example),false);assert.deepEqual(errors,[]);console.log('OK offline ZIP',folder);await c.close();
 }
 }finally{fs.rmSync(extracted,{recursive:true,force:true});}
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
