const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 await page.goto('file://'+path.resolve(__dirname,'../../▶ Begin hier.html'));
 await page.waitForTimeout(300);
 await page.evaluate(async()=>{
 function dir(name){const entries=new Map();return {name,kind:'directory',entries,async isSameEntry(other){return this===other},async queryPermission(){return 'granted'},async requestPermission(){return 'granted'},async *values(){yield* entries.values()},async getFileHandle(n,o){if(entries.has(n)){if(entries.get(n).kind!=='file')throw new DOMException('directory','TypeMismatchError');return entries.get(n);}if(!o?.create)throw new DOMException('missing','NotFoundError');const f={name:n,kind:'file',data:'',async queryPermission(){return 'granted'},async requestPermission(){return 'granted'},async getFile(){return new File([this.data],this.name)},async createWritable(){return {write:async v=>{f.data=typeof v==='string'?v:await new Blob([v]).text()},close:async()=>{}}},async isSameEntry(other){return this===other}};entries.set(n,f);return f;},async getDirectoryHandle(n,o){if(entries.has(n))return entries.get(n);if(!o?.create)throw new DOMException('missing','NotFoundError');const d=dir(n);entries.set(n,d);return d},async removeEntry(n){entries.delete(n)}}}
 window.testRoot=dir('Mijn projecten');const a=await testRoot.getDirectoryHandle('Roman',{create:true});await testRoot.getDirectoryHandle('Klaar',{create:true});
 window.testFile=await a.getFileHandle('idee.md',{create:true});testFile.data='---\nstatus: concept\n---\n# Mijn idee\n\n## Tweede kop\n\nEen **vette** test.\n\n- [ ] Taak\n\n[[Mijn projecten/Roman/bron.md|Bron]]\n';const other=await a.getFileHandle('bron.md',{create:true});other.data='# Bron\n\nBroninhoud';
 directoryHandles=[testRoot];await loadFiles();await selectFile(files.findIndex(f=>f.name==='idee.md'));
 });
 assert.deepEqual(errors,[]);
 assert.equal(await page.locator(".frontmatter-details, .frontmatter").count(),0);
 assert(!((await page.locator("#content").innerText()).includes("status: concept")));
 assert.match(await page.locator('#projectSelect').textContent(),/Roman/);
 await page.getByRole('button',{name:'Focus',exact:true}).click();assert(await page.locator('#app').evaluate(e=>e.classList.contains('document-focused')));
 await page.getByRole('button',{name:'Focus sluiten'}).click();
 await page.getByRole('button',{name:'Inhoud tonen'}).click();await page.locator('#documentOutline button').filter({hasText:'Tweede kop'}).click();
 await page.getByRole('button',{name:'Bewerken',exact:true}).click();
 assert.equal(await page.locator('.wysiwyg-toolbar button').count(),16);
 await page.locator('.editor-actions .file-more summary').click();
 await page.locator('.editor-actions .file-more-panel').getByRole('button',{name:'Naam wijzigen'}).click();
 await page.locator('dialog').getByRole('button',{name:'Annuleren',exact:true}).click();
 assert(await page.locator('#wysiwygEditor').isVisible());

 await page.locator('#wysiwygEditor input[type=checkbox]').check();
 await page.locator('#wysiwygEditor').press('ControlOrMeta+End');await page.keyboard.press('Enter');await page.keyboard.type('Nieuw zoekwoord');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await page.waitForFunction(()=>!isEditMode);
 let saved=await page.evaluate(()=>testFile.data);assert.match(saved,/status: concept/);assert.match(saved,/\[x\]/);assert.match(saved,/\[\[Mijn projecten\/Roman\/bron.md\|Bron\]\]/);assert.match(saved,/Nieuw zoekwoord/);

 await page.getByRole('button',{name:'Bewerken',exact:true}).click();
 await page.getByRole('button',{name:'Afbeelding toevoegen',exact:true}).click();
 await page.locator('dialog input[type=file]').setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=','base64')});
 await page.locator('dialog input[name=description]').fill('Proefbeeld');await page.locator('dialog button[type=submit]').click();
 await page.getByRole('button',{name:'YouTube-video toevoegen',exact:true}).click();await page.locator('dialog input[type=url]').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');await page.locator('dialog button[type=submit]').click();
 await page.getByRole('button',{name:'Link naar document',exact:true}).click();await page.locator('#internalLinkResults input[type=radio]').first().check();await page.locator('#internalLinkSubmit').click();
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();await page.waitForFunction(()=>!isEditMode);
 saved=await page.evaluate(()=>testFile.data);assert.match(saved,/data:image\/png;base64/);assert.match(saved,/youtube.com/);assert(await page.getByRole('button',{name:'YouTube-video afspelen'}).isVisible());
 await page.locator('.theme-toggle').click();assert.notEqual(await page.locator('html').getAttribute('data-theme'),'light');await page.locator('.theme-toggle').click();
 await page.locator('.search-btn').click();await page.locator('#searchPaletteInput').fill('Nieuw zoekwoord');await page.waitForFunction(()=>document.getElementById('searchPaletteResults').textContent.includes('idee.md'));await page.keyboard.press('Escape');
 await page.locator('.file-more summary').click();await page.locator('.file-more-panel').getByRole('button',{name:'Naam wijzigen'}).click();await page.locator('dialog input').fill('nieuw.md');await page.locator('dialog button[type=submit]').click();await page.waitForFunction(()=>activeFile.name==='nieuw.md');
 await page.locator('.file-more summary').click();await page.locator('.file-more-panel').getByRole('button',{name:'Verplaatsen',exact:true}).click();await page.locator('dialog select').selectOption('Mijn projecten/Klaar');await page.locator('dialog button[type=submit]').click();await page.waitForFunction(()=>activeFile.relativePath==='Mijn projecten/Klaar/nieuw.md');
 await page.getByRole('button',{name:'Bewerken',exact:true}).click();await page.locator('#wysiwygEditor').press('ControlOrMeta+End');await page.keyboard.type(' Eigen tekst');
 await page.evaluate(()=>{activeFile.data='Extern veranderd'});await page.getByRole('button',{name:'Opslaan',exact:true}).click();await page.waitForFunction(()=>document.getElementById('converterNotification').textContent.includes('buiten de Werkbank'));
 assert(await page.locator('#wysiwygEditor').isVisible());assert.equal(await page.evaluate(()=>activeFile.data),'Extern veranderd');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Annuleren',exact:true}).click();
 await page.locator('.file-more summary').click();await page.locator('.file-more-panel').getByRole('button',{name:'Verwijderen',exact:true}).click();assert(await page.locator('dialog').isVisible());await page.locator('dialog').getByRole('button',{name:'Annuleren'}).click();assert(await page.evaluate(()=>testRoot.entries.get('Klaar').entries.has('nieuw.md')));

 await page.evaluate(async()=>{await selectFile(files.findIndex(f=>f.name==='nieuw.md'));await toggleEditMode()});
 const formatting=[['Vet',/\*\*Voorbeeld\*\*/],['Cursief',/\*Voorbeeld\*/],['Doorhalen',/~~Voorbeeld~~/],['Kop 1',/# Voorbeeld/],['Kop 2',/## Voorbeeld/],['Kop 3',/### Voorbeeld/],['Opsomming',/[-*] +Voorbeeld/],['Genummerde lijst',/1\. +Voorbeeld/],['Citaat',/> Voorbeeld/],['Code',/`Voorbeeld`/],['Horizontale lijn',/[-*]{3}/]];
 for(const [title,pattern] of formatting){
  await page.evaluate(()=>{const ed=document.getElementById('wysiwygEditor');ed.innerHTML='<p>Voorbeeld</p>';ed.focus();const r=document.createRange();r.selectNodeContents(ed.firstChild);const selection=getSelection();selection.removeAllRanges();selection.addRange(r)});
  await page.locator('.wysiwyg-toolbar button').evaluateAll((buttons,title)=>buttons.find(b=>b.title===title||b.title.startsWith(title+' (')).click(),title);
  assert.match(await page.evaluate(()=>getWysiwygMarkdown()),pattern,title);
 }
 await page.evaluate(async()=>{wysiwygDirty=false;isEditMode=false;activeFile.data='# Ruimte voor je woorden\n\n## Vandaag\n\nEen **lokale werkplek** voor je eigen documenten.\n\n- [x] Idee uitwerken\n- [ ] Tekst afmaken\n\n## Bronnen\n\n[[Mijn projecten/Roman/bron.md|Mijn bron]]\n';await selectFile(files.findIndex(f=>f.name==='nieuw.md'));await toggleEditMode()});
 await page.evaluate(()=>{document.getElementById('converterNotification')?.remove()});await page.waitForTimeout(400);await page.screenshot({path:path.resolve(__dirname,'../screenshot.png'),fullPage:true});
 await page.getByRole('button',{name:'Annuleren',exact:true}).click();
 await page.locator('#newMenu summary').click();await page.locator('#newItemTarget').selectOption('Mijn projecten');page.once('dialog',d=>d.accept('Testmap'));await page.locator('#newFolderBtn').click();await page.waitForFunction(()=>testRoot.entries.has('Testmap'));
 await page.locator('#newMenu summary').click();await page.locator('#newItemTarget').selectOption('Mijn projecten/Testmap');await page.locator('#newFileBtn').click();await page.locator('dialog input[name=filename]').fill('voorbeeld');await page.locator('dialog button[type=submit]').click();await page.waitForFunction(()=>activeFile?.name==='voorbeeld.md');
 await page.getByRole('button',{name:'Annuleren',exact:true}).click();await page.locator('.file-more summary').click();await page.locator('.file-more-panel').getByRole('button',{name:'Verwijderen',exact:true}).click();await page.locator('dialog').getByRole('button',{name:'Definitief verwijderen'}).click();await page.waitForFunction(()=>!testRoot.entries.get('Testmap').entries.has('voorbeeld.md'));
 await page.evaluate(()=>{window.showDirectoryPicker=async()=>testRoot.entries.get('Testmap');saveDirectoryHandles=async()=>{}});
 await page.getByRole('button',{name:'+ Project toevoegen',exact:true}).click();await page.waitForFunction(()=>selectedProject==='Testmap');assert.equal(await page.locator('#projectSelect').inputValue(),'Testmap');assert(await page.getByText('Een project is een map op je computer. Je kunt meerdere mappen toevoegen.',{exact:true}).isVisible());
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 console.log('PASS: file:// startup, dynamic projects, Focus, outline, all formatting commands, image/video/document insertion, search, theme, rich editing, task/frontmatter/wiki-link roundtrip, rename, move, external-change protection, new folder/file, confirmed deletion and delete cancellation; zero network requests.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
