'use strict';
// Every round is immutable. Open tabs acknowledge a snapshot; failed rounds never get a manifest.
(()=>{
 const base=new URL('.',document.currentScript.src),scope=base.href;
 const names={Werkbank:'Schrijven',Ping:'Factureren',Projectbord:'Doen',Bronnenkast:'Verzamelen',Uren:'Uren schrijven',Contacten:'Contact houden',Publicatieplanner:'Plannen',Offerte:'Offreren',Kasboek:'Boekhouden'};
 const keys={Ping:'gereedschapskist:ping-local-v1',Projectbord:'gereedschapskist:projectbord-v1',Bronnenkast:'gereedschapskist:bronnenkast-v1',Uren:'gereedschapskist:uren-v1',Contacten:'gereedschapskist:contacten-v1',Publicatieplanner:'gereedschapskist:publicatieplanner-v1',Offerte:'gereedschapskist:offerte-v1',Kasboek:'gereedschapskist:kasboek-v1'};
 const tool=document.querySelector('script[data-tool]')?.dataset.tool,own=!window.GereedschapskistMode?.example,id=crypto.randomUUID();
 const lockPrefix='gk-all:'+scope+':tab:',channelName='gk-all:'+scope,dbName='gereedschapskist-bewaar-alles-v1';
 let db,channel,frozen=false,active=false,cacheTimer,unlock,registration,seen,restoring=false,recoveredForms=[];
 const say=text=>{const el=document.getElementById('wm-message');if(el)el.textContent=text;for(const el of document.querySelectorAll('dialog[open] .all-dialog-status'))el.textContent=text;};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const timed=(promise,label)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label+' reageert niet op tijd.')),12000);promise.then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)});});
 const limit=value=>{if(new Blob([JSON.stringify(value)]).size>100*1024*1024)throw Error('Te veel gegevens in één tool voor Bewaar alles.');return value;};
 const ready=new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('sessions',{keyPath:'id'});r.onsuccess=()=>{db=r.result;resolve();};r.onerror=()=>reject(r.error);});
 ready.catch(()=>{});
 function transact(mode,fn){return new Promise((resolve,reject)=>{const tx=db.transaction('sessions',mode),r=fn(tx.objectStore('sessions'));tx.oncomplete=()=>resolve(r?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Tussentijdse kopie niet bewaard.'));});}
 async function records(){await ready;return (await transact('readonly',s=>s.getAll())).filter(r=>r.scope===scope);}
 function formFields(){return [...document.querySelectorAll('form,div#form')].filter(f=>!f.closest('dialog')||f.closest('dialog').open).map(f=>({id:f.id,title:f.querySelector('h2,h3')?.textContent||f.closest('dialog')?.querySelector('h2')?.textContent||'Invoer',fields:[...f.querySelectorAll('input:not([type=file]):not([type=password]),textarea,select')].map((e,index)=>({index,id:e.id,label:e.labels?.[0]?.textContent?.trim()||e.name||e.id,value:e.value,checked:e.checked,type:e.type}))}));}
 function applyFields(forms){for(const f of forms||[]){const form=document.getElementById(f.id);if(!form||!['FORM','DIV'].includes(form.tagName)){if(f.fields?.some(e=>e.value))recoveredForms.push(f);continue;}const fields=[...form.querySelectorAll('input:not([type=file]):not([type=password]),textarea,select')];for(const entry of f.fields){const e=fields[entry.index];if(!e||e.id!==entry.id||e.type!==entry.type||typeof entry.value!=='string')throw Error('De formulierindeling is veranderd. Het concept blijft in het bestand beschikbaar.');if(e.disabled||e.readOnly)continue;e.value=entry.value;e.checked=!!entry.checked;}for(const e of fields.filter(e=>!e.disabled&&!e.readOnly)){e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}}}
 function draft(){
  const out={recoveredForms,links:window.Koppelingen?.draft(tool),forms:formFields(),dialogs:[...document.querySelectorAll('dialog[open]')].map(e=>e.id)};
  if(['Projectbord','Bronnenkast','Uren','Contacten','Publicatieplanner','Kasboek'].includes(tool))out.editing=editing;
  if(tool==='Contacten')out.conversationContact=conversationContact;
  if(tool==='Kasboek'){if(loading)throw Error('Een bon wordt nog verwerkt. Probeer zo opnieuw.');out.attachment=attachment;}
  if(tool==='Offerte')out.working=working;
  if(tool==='Ping')out.selected=selected;
  if(typeof contactTarget!=='undefined')out.contactTarget=contactTarget;
  return out;
 }
 async function snapshot(full=true){
  if(!own||!tool)return null;
  const meta=await Werkmap.allInfo();
  if(Werkmap.busy)throw Error('Er loopt nog een bestandsactie.');
  Werkmap.allCheck();
  let value=clone(Werkmap.allRead()),documents;
  if(tool==='Werkbank'){
   documents=[];
   for(const [name,item] of converterFiles)documents.push({name,path:'converter/'+name,content:item.content});
   for(const f of files){if(f.isVirtual)continue;if(!full&&f.relativePath!==activeFile?.relativePath){if(fileContents.has(f.relativePath))documents.push({name:f.name,path:f.relativePath,content:fileContents.get(f.relativePath)});continue;}const content=f.relativePath===activeFile?.relativePath?(isEditMode?getWysiwygMarkdown():currentRawContent):await(await f.getFile()).text();documents.push({name:f.name,path:f.relativePath,content});}
   if(activeFile){const content=isEditMode?getWysiwygMarkdown():currentRawContent;const old=documents.find(d=>d.path===activeFile.relativePath);if(old)old.content=content;else documents.push({name:activeFile.name,path:activeFile.relativePath,content});}
  }
  return limit({format:'gereedschapskist-werksessie',version:1,tool,name:names[tool],data:value,documents,draft:tool==='Werkbank'?null:clone(draft()),activeDocument:tool==='Werkbank'?activeFile?.relativePath:null,revision:meta.revision,savedAt:new Date().toISOString()});
 }
 async function cache(full=false,strict=false){if(!active||frozen||restoring)return;try{const value=await snapshot(full);await transact('readwrite',s=>s.put({id,scope,tool,value,updated:Date.now()}));}catch(e){say('Tussentijdse gezamenlijke kopie niet bijgewerkt: '+e.message);if(strict)throw e;}}
 function schedule(){clearTimeout(cacheTimer);cacheTimer=setTimeout(cache,350);}
 function freeze(value){frozen=value;document.documentElement.setAttribute('aria-busy',String(value));}
 for(const event of ['beforeinput','click','keydown','submit','drop','cancel'])document.addEventListener(event,e=>{if(frozen){e.preventDefault();e.stopImmediatePropagation();}},true);
 for(const event of ['input','change','click','close'])document.addEventListener(event,schedule,true);
 window.addEventListener('pagehide',()=>{unlock?.();});
 async function peers(){const locks=await navigator.locks.query();return (locks.held||[]).filter(l=>l.name.startsWith(lockPrefix)).map(l=>l.name.slice(lockPrefix.length)).sort();}
 async function respond(msg){
  if(msg.type==='peek'||msg.type==='replace'){
   if(!active||msg.target!==tool)return;
   try{let value=await snapshot();if(msg.type==='replace'){if(JSON.stringify([value.data,value.documents,value.draft])!==msg.expected)throw Error('De gegevens zijn ondertussen gewijzigd. Probeer opnieuw.');value={...value,...msg.next};freeze(true);try{await applySession(value);Werkstatus.changed();}finally{freeze(false);}await cache();}channel.postMessage({type:'tool-answer',request:msg.request,id,value});}
   catch(e){channel.postMessage({type:'tool-answer',request:msg.request,id,error:e.message});}return;
  }
  if(msg.type==='saved'){if(msg.ids.includes(id)){Werkstatus.allWritten();say('Je werk en conceptinvoer zijn opgenomen in Bewaar alles.');}return;}
  if(msg.type==='release'){clearTimeout(seen);freeze(false);if(!msg.saved&&active)say('Bewaar alles is niet afgerond. Bekijk de melding in het venster waar je op Bewaar alles klikte.');schedule();return;}
  if(msg.type!=='capture'||!active)return;
  freeze(true);say('Bewaar alles is bezig. Je gegevens en conceptinvoer worden meegenomen…');clearTimeout(seen);seen=setTimeout(()=>{freeze(false);say('De bewaarronde reageert niet meer. Controleer het venster waarin je het bewaren startte.');},90000);
  try{const value=await timed(snapshot(),names[tool]);channel.postMessage({type:'answer',round:msg.round,id,value});}
  catch(e){channel.postMessage({type:'answer',round:msg.round,id,error:names[tool]+': '+e.message});}
 }
 async function init(){
  await Werkmap.ready;await ready;
  if(own&&tool){await Werkmap.adapterReady;await hydrate();}
  if(own&&tool){
   const add=()=>{for(const actions of document.querySelectorAll('dialog .form-actions')){if(actions.querySelector('.gk-save-all'))continue;const button=document.createElement('button');button.type='button';button.className='gk-save-all';button.textContent='Bewaar alles';button.onclick=async()=>{button.disabled=true;try{await saveAll()}catch(e){say('Niet alles bewaard: '+e.message)}finally{button.disabled=false}};actions.append(button);const status=document.createElement('p');status.className='all-dialog-status';status.setAttribute('role','status');actions.after(status);}};
   add();new MutationObserver(add).observe(document.body,{childList:true,subtree:true});
  }

  if(!navigator.locks||!window.BroadcastChannel)throw Error('Bewaar alles werkt in een recente Chrome of Edge.');
  channel=new BroadcastChannel(channelName);channel.addEventListener('message',e=>respond(e.data));
  if(tool&&own){await new Promise(resolve=>navigator.locks.request(lockPrefix+id,async()=>{active=true;resolve();await new Promise(r=>unlock=r);}));await cache();}
  document.dispatchEvent(new CustomEvent('werkruimte-klaar'));
 }
 registration=(document.readyState==='loading'?new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true})):Promise.resolve()).then(init);
 registration.catch(e=>say('Bewaar alles is niet beschikbaar: '+e.message));
 async function captureAll(){
  const ids=await peers(),round=crypto.randomUUID(),answers=new Map();
  const receive=e=>{const m=e.data;if(m.type==='answer'&&m.round===round&&ids.includes(m.id))answers.set(m.id,m);};channel.addEventListener('message',receive);
  try{
   channel.postMessage({type:'capture',round});
   if(active){freeze(true);try{answers.set(id,{id,value:await timed(snapshot(),names[tool])});}catch(e){answers.set(id,{id,error:names[tool]+': '+e.message});}}
   const deadline=Date.now()+15000;while(answers.size<ids.length&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));
   if(answers.size!==ids.length){const stored=await records();const missing=ids.filter(k=>!answers.has(k)).map(k=>names[stored.find(s=>s.id===k)?.tool]||'onbekende tool');throw Error('Geen antwoord van '+missing.join(', ')+'. Open die vensters en probeer opnieuw.');}
   for(const a of answers.values())if(a.error)throw Error(a.error);
   if(JSON.stringify(ids)!==JSON.stringify(await peers()))throw Error('Er is een tool geopend of gesloten. Probeer opnieuw.');
   return [...answers.values()].map(a=>({id:a.id,value:a.value}));
  }finally{channel.removeEventListener('message',receive);}
 }
 const safe=n=>String(n).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').slice(0,140)||'document.md';
 async function write(dir,name,text){
  let h,created=false;
  try{h=await dir.getFileHandle(name);}catch(e){if(e.name!=='NotFoundError')throw e;h=await dir.getFileHandle(name,{create:true});created=true;}
  let w;try{w=await h.createWritable({mode:'exclusive'});await w.write(text);await w.close();}catch(e){try{await w?.abort()}catch{}if(created)try{if((await h.getFile()).size===0)await dir.removeEntry(name)}catch{}throw e;}
  if(await(await h.getFile()).text()!==text)throw Error('Schrijven niet bevestigd: '+name);
 }
 async function saveAll(){
  await registration;
  if(!own)throw Error('Ga eerst naar je eigen werk.');
  if(frozen)throw Error('Er loopt al een bewaarronde.');
  if(!Werkmap.active){await Werkmap.choose();if(!Werkmap.active)throw Error('Geen werkmap gekozen. Je invoer blijft behouden.');}
  const meta=await Werkmap.allAccess();
  return navigator.locks.request('gereedschapskist-bewaar-alles:'+meta.revision,{ifAvailable:true},async lock=>{
   if(!lock)throw Error('Een ander venster bewaart al alles.');
   let roundDir,rounds,roundName,pointerStarted=false,committed=false;
   try{
    say('Actuele gegevens en concepten ophalen uit geopende tools…');
    const live=await captureAll();
    const snapshots=[];for(const item of live){const other=snapshots.find(x=>x.value.tool===item.value.tool);if(other){const comparable=v=>JSON.stringify([v.data,v.draft,v.documents]);if(comparable(other.value)!==comparable(item.value))throw Error(item.value.name+' staat in meerdere vensters met verschillende invoer. Gebruik één venster per tool en probeer opnieuw.');}else snapshots.push(item);}const openTools=new Set(live.map(s=>s.value.tool));
    // A closed tab's last captured session includes unfinished forms. Keep all variants, never merge conflicting tabs.
    const stored=(await records()).filter(s=>s.value?.revision===meta.revision||!s.value?.revision);
    const disk=await readRound(meta.root);
    for(const t of Object.keys(names)){if(openTools.has(t))continue;const previous=stored.filter(s=>s.tool===t&&s.value).sort((a,b)=>b.updated-a.updated);if(previous.length)snapshots.push({id:previous[0].id,value:previous[0].value});}
    for(const value of disk?.values||[])if(!snapshots.some(s=>s.value.tool===value.tool))snapshots.push({id:'werkmap',value:{...value,revision:meta.revision}});
    for(const [t,key] of Object.entries(keys)){if(snapshots.some(s=>s.value.tool===t))continue;const raw=localStorage.getItem(key);if(raw){const data=JSON.parse(raw);if(data._gereedschapskistExample)continue;snapshots.push({id:'browser',value:{format:'gereedschapskist-werksessie',version:1,tool:t,name:names[t],data,draft:null,savedAt:new Date().toISOString()}});}}
    if(!snapshots.some(s=>s.value.tool==='Werkbank')){const raw=localStorage.getItem('gereedschapskist:converterFiles');if(raw){const docs=JSON.parse(raw).map(([name,v])=>({name,path:'converter/'+name,content:v.content}));snapshots.push({id:'browser',value:{format:'gereedschapskist-werksessie',version:1,tool:'Werkbank',name:names.Werkbank,documents:docs,data:null,draft:null,savedAt:new Date().toISOString()}});}}
    const slugs={Ping:'factureren',Projectbord:'doen',Bronnenkast:'verzamelen',Uren:'uren-schrijven',Contacten:'contact-houden',Publicatieplanner:'plannen',Offerte:'offreren',Kasboek:'boekhouden'};
    for(const [t,slug] of Object.entries(slugs)){if(snapshots.some(s=>s.value.tool===t))continue;try{const dir=await meta.root.getDirectoryHandle(names[t]),file=await(await dir.getFileHandle('gereedschapskist-'+slug+'.json')).getFile();if(file.size>20000000)throw Error(names[t]+': bestand te groot.');const value=JSON.parse(await file.text());if(value._gereedschapskistExample)continue;snapshots.push({id:'bestand',value:{format:'gereedschapskist-werksessie',version:1,tool:t,name:names[t],data:value,draft:null,savedAt:new Date(file.lastModified).toISOString()}});}catch(e){if(e.name!=='NotFoundError')throw e;}}
    for(const s of snapshots){s.value.revision??=meta.revision;}
    for(const s of snapshots)if(s.value.revision&&s.value.revision!==meta.revision)throw Error(s.value.name+' hoort bij een andere werkmap. Open die tool bij de huidige werkmap.');
    roundName=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8);rounds=await meta.root.getDirectoryHandle('Bewaard werk',{create:true});
    roundDir=await rounds.getDirectoryHandle(roundName,{create:true});const manifest={format:'gereedschapskist-bewaarronde',version:1,date:new Date().toISOString(),revision:meta.revision,sessions:[],shared:await readShared()};
    for(let n=0;n<snapshots.length;n++){
     const {value}=snapshots[n],folder=value.name+'-'+(n+1),dir=await roundDir.getDirectoryHandle(folder,{create:true});
     await write(dir,'werksessie.json',JSON.stringify(value,null,2));
     if(value.tool==='Werkbank'){for(let k=0;k<(value.documents||[]).length;k++){const d=value.documents[k];await write(dir,(k+1)+'-'+safe(d.name),d.content);}}
     else await write(dir,'gegevens.json',JSON.stringify(value.data,null,2));
     manifest.sessions.push({tool:value.tool,name:value.name,folder,source:openTools.has(value.tool)?'actueel venster':'laatst bewaard in browser'});
    }
    if((await Werkmap.allAccess(false)).revision!==meta.revision)throw Error('De werkmap is tijdens het bewaren gewijzigd. Probeer opnieuw.');
    await write(roundDir,'LEESMIJ.txt','Deze bewaarronde bevat actuele gegevens en herstelbare formulierconcepten. Open de Gereedschapskist, kies de werkmap en kies Open bewaard werk. Gegevens.json is ook los in de betreffende tool te openen. Facturen zijn niet automatisch definitief gemaakt. Bestanden buiten de werkmap en niet geopende schrijfmappen zijn niet inbegrepen.\n');
    await write(roundDir,'bewaar-alles.json',JSON.stringify(manifest,null,2));
    let previous=null;
    try{previous=JSON.parse(await(await(await rounds.getFileHandle('actueel.json')).getFile()).text());}catch(e){if(e.name!=='NotFoundError')throw Error('De verwijzing naar bewaard werk is beschadigd. Het eerdere werk blijft staan.');}
    const pointer={format:'gereedschapskist-bewaard-werk',version:1,current:roundName,previous:previous?.current||null};
    pointerStarted=true;await write(rounds,'actueel.json',JSON.stringify(pointer,null,2));
    committed=true;window.Werkstatus?.allWritten();channel.postMessage({type:'saved',ids:live.map(s=>s.id)});
    if(previous?.previous&&previous.previous!==pointer.current&&previous.previous!==pointer.previous&&/^\d{4}-.*-[a-f0-9]{8}$/.test(previous.previous)){
     try{const old=await rounds.getDirectoryHandle(previous.previous);const m=JSON.parse(await(await(await old.getFileHandle('bewaar-alles.json')).getFile()).text());if(m.format==='gereedschapskist-bewaarronde')await rounds.removeEntry(previous.previous,{recursive:true});}catch{/* Cleanup is optional; saving remains successful. */}
    }
    for(const s of live)await transact('readwrite',store=>store.put({id:s.id,scope,tool:s.value.tool,value:s.value,updated:Date.now()}));
    say('Alles bewaard in '+meta.root.name+' om '+new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})+'. Ook je conceptinvoer is meegenomen.');
   }catch(e){if(!pointerStarted&&roundDir)try{await rounds.removeEntry(roundName,{recursive:true});}catch{}e.message=(committed?'Je werk is bewaard, maar de browserkopie kon niet worden bijgewerkt. ':pointerStarted?'De nieuwe bewaarkopie kon niet worden bevestigd. De vorige complete kopie blijft beschikbaar voor herstel. ':'De vorige bewaarkopie blijft actief. ')+e.message;say(e.message);throw e;}
   finally{freeze(false);channel.postMessage({type:'release',saved:committed});schedule();}
  });
 }
 async function restoreDraft(d){
  if(!d)return;
  recoveredForms=clone(d.recoveredForms||[]);
  if(d.links&&window.Koppelingen)Koppelingen.setDraft(tool,d.links);
  if(tool==='Offerte'&&d.working){validate({format:'offerte',version:1,quotes:[d.working]});working=clone(d.working);baseline='';renderList();renderEditor();}
  if(tool==='Ping'&&d.selected){if(data.invoices.some(i=>i.id===d.selected)){selected=d.selected;render();}}
  if(d.dialogs?.includes(tool==='Projectbord'?'edit':'dialog')){
   const list=data.tasks||data.items||data.entries||data.contacts;
   if(d.editing&&!list?.some(item=>item.id===d.editing))throw Error('Het item bij dit concept ontbreekt.');
   edit(d.editing||null);
   if(tool==='Kasboek'&&d.attachment){attachment=checkReceipt(d.attachment);receiptInfo();}
  }
  if(tool==='Contacten'&&d.dialogs?.includes('conversation')){if(!data.contacts.some(c=>c.id===d.conversationContact))throw Error('Contact bij gespreksconcept ontbreekt.');conversationContact=d.conversationContact;document.getElementById('conversation').showModal();}
  if(typeof contactTarget!=='undefined'&&typeof d.contactTarget==='string')contactTarget=d.contactTarget;
  // Reopen existing auxiliary dialogs only; never submit a form or finalize an invoice.
  for(const dialogId of d.dialogs||[]){const dialog=document.getElementById(dialogId);if(dialog?.tagName==='DIALOG'&&!dialog.open)dialog.showModal();}
  applyFields(d.forms);
  document.getElementById('recovered-input')?.remove();
  if(recoveredForms.length){const box=document.createElement('details');box.id='recovered-input';box.className='link-result';const title=document.createElement('summary');title.textContent='Bewaarde invoer uit een niet-afgeronde overdracht';box.append(title);const hint=document.createElement('p');hint.textContent='Deze invoer is behouden. Open de bijbehorende actie opnieuw om haar te verwerken.';box.append(hint);for(const f of recoveredForms){const heading=document.createElement('h3');heading.textContent=f.title||'Invoer';box.append(heading);for(const field of f.fields||[]){if(!field.value)continue;const row=document.createElement('p');row.textContent=(field.label||field.id||'Veld')+': '+(field.type==='checkbox'?(field.checked?'Ja':'Nee'):field.value);box.append(row);}}document.querySelector('main').prepend(box);}
  Werkstatus.update();
 }
 async function readLegacy(root){
  const values=[],slugs={Ping:'factureren',Projectbord:'doen',Bronnenkast:'verzamelen',Uren:'uren-schrijven',Contacten:'contact-houden',Publicatieplanner:'plannen',Offerte:'offreren',Kasboek:'boekhouden'};
  for(const [t,slug]of Object.entries(slugs)){
   try{const dir=await root.getDirectoryHandle(names[t]),file=await(await dir.getFileHandle('gereedschapskist-'+slug+'.json')).getFile();if(file.size>20000000)throw Error('Bestand te groot: '+names[t]);const data=JSON.parse(await file.text());const expected=emptyData(t),list=['contacts','invoices','quotes','tasks','entries','items'].find(k=>Array.isArray(expected[k]));if(data.format!==expected.format||!Array.isArray(data[list]))throw Error('Ongeldig ouder bestand: '+names[t]);if(data._gereedschapskistExample)continue;values.push({format:'gereedschapskist-werksessie',version:1,tool:t,name:names[t],data,draft:null,fromDisk:true,savedAt:new Date(file.lastModified).toISOString()});}
   catch(e){if(e.name!=='NotFoundError')throw e;}
  }
  try{const dir=await root.getDirectoryHandle('Schrijven'),documents=[];for await(const file of dir.values())if(file.kind==='file'&&/\.(md|markdown|txt)$/i.test(file.name)){const f=await file.getFile();if(f.size>2000000)throw Error('Document te groot: '+f.name);documents.push({name:f.name,path:'converter/'+f.name,content:await f.text()});}if(documents.length)values.push({format:'gereedschapskist-werksessie',version:1,tool:'Werkbank',name:'Schrijven',data:null,documents,draft:null,activeDocument:documents[0].path,fromDisk:true});}catch(e){if(e.name!=='NotFoundError')throw e;}
  return values.length?{values,shared:{},legacy:true}:null;
 }
 // Read and validate a complete committed round before changing any browser state.
 async function readRound(root,previous=false){
  let rounds,pointer;
  try{rounds=await root.getDirectoryHandle('Bewaard werk');pointer=JSON.parse(await(await(await rounds.getFileHandle('actueel.json')).getFile()).text());}
  catch(e){if(e.name==='NotFoundError')return await readLegacy(root);throw Error('De verwijzing naar bewaard werk is beschadigd. Je bestanden blijven staan.');}
  if(pointer.format!=='gereedschapskist-bewaard-werk')throw Error('Ongeldige bewaarkopie.');
  const name=previous?pointer.previous:pointer.current;
  if(!name||typeof name!=='string'||/[\\/]/.test(name))throw Error('Geen geldige '+(previous?'vorige':'actuele')+' bewaarkopie.');
  const dir=await rounds.getDirectoryHandle(name),manifest=JSON.parse(await(await(await dir.getFileHandle('bewaar-alles.json')).getFile()).text());
  if(manifest.format!=='gereedschapskist-bewaarronde'||!Array.isArray(manifest.sessions))throw Error('Onvolledige bewaarkopie.');
  const values=[],seenTools=new Set();
  for(const entry of manifest.sessions){
   if(!names[entry.tool]||seenTools.has(entry.tool)||typeof entry.folder!=='string'||/[\\/]/.test(entry.folder))throw Error('Ongeldige tool in bewaarkopie.');
   const folder=await dir.getDirectoryHandle(entry.folder),file=await(await folder.getFileHandle('werksessie.json')).getFile();
   if(file.size>100*1024*1024)throw Error('Werksessie te groot.');
   const value=JSON.parse(await file.text());
   if(value.format!=='gereedschapskist-werksessie'||value.version!==1||value.tool!==entry.tool)throw Error('Beschadigde werksessie: '+entry.name);
   seenTools.add(entry.tool);values.push({...value,fromDisk:true});
  }
  return {values,name,date:manifest.date,shared:manifest.shared||{}};
 }
 async function storedSession(t){
  const {revision}=await Werkmap.allInfo();
  return (await records()).filter(r=>r.tool===t&&r.value?.revision===revision).sort((a,b)=>b.updated-a.updated)[0]?.value;
 }
 async function applySession(s){
  restoring=true;
  try{await Werkmap.allRestore(s);await restoreDraft(s.draft);}
  finally{restoring=false;}
 }
 async function hydrate(){
  let s=await storedSession(tool);
  if(!s&&Werkmap.active){const {root,revision}=await Werkmap.allAccess(false);if(await root.queryPermission({mode:'readwrite'})!=='granted')return;const round=await readRound(root);s=round?.values.find(v=>v.tool===tool);if(s)s={...s,revision};}
  if(s){await applySession(s);if(s.fromDisk)Werkstatus.allWritten();say(Werkmap.active?'Werkmap geopend. Je werk en eventuele conceptinvoer staan klaar.':'Je eigen werk en eventuele conceptinvoer zijn hersteld uit deze browser. Gebruik Bewaar alles om ze in een map vast te leggen.');}
 }
 async function restore(previous=false){
  await registration;
  if(!Werkmap.active){await Werkmap.choose();return;}
  const {root,revision}=await Werkmap.allAccess(),round=await readRound(root,previous);
  if(!round)throw Error('Deze map heeft nog geen gezamenlijke bewaarkopie. Je kunt bestaande toolbestanden importeren.');
  const open=await peers();if(open.some(peer=>peer!==id))throw Error('Sluit de andere toolvensters voordat je een hele werkmap opent. Zo wordt hun invoer niet overschreven.');
  if(!confirm('De '+(previous?'vorige':'bewaarde')+' werkruimte openen? Je huidige browserwerk wordt vervangen. Bewaar eerst als je dat wilt houden.'))return;
  await rememberRound(round,revision);
  if(tool){const s=round.values.find(v=>v.tool===tool)||{data:tool==='Werkbank'?null:emptyData(tool),documents:[],draft:null};for(const d of document.querySelectorAll('dialog[open]'))d.close();await applySession({...s,revision});Werkstatus.allWritten();}
  say('Werkmap '+root.name+' geopend. Alle '+round.values.length+' bewaarde tools staan klaar, inclusief concepten.');
 }
 async function rememberRound(round,revision,otherWorkspace=false){
  if(!otherWorkspace){const raw=localStorage.getItem(keys.Ping);if(raw){const old=JSON.parse(raw),incoming=round.values.find(s=>s.tool==='Ping')?.data;for(const invoice of old.invoices||[]){if(invoice.state!=='final')continue;const restored=incoming?.invoices?.find(i=>i.id===invoice.id);if(JSON.stringify(restored)!==JSON.stringify(invoice))throw Error('Deze kopie mist of wijzigt definitieve factuur '+invoice.number+'. Het actuele werk blijft staan.');}}}

  const old=await records();
  await transact('readwrite',store=>{store.put({id:scope+':shared',scope,shared:round.shared||{},revision});for(const r of old.filter(r=>r.id!==scope+':shared'))store.delete(r.id);for(const value of round.values)store.put({id:scope+':loaded:'+value.tool,scope,tool:value.tool,value:{...value,revision},updated:Date.now()});});
  // The browser is a cache. Keep a recovery copy when replacing an older local administration.
  for(const [t,key]of Object.entries(keys)){if(t===tool&&active)continue;const raw=localStorage.getItem(key);if(raw)localStorage.setItem(key+'-previous',raw);const value=round.values.find(v=>v.tool===t);if(value)localStorage.setItem(key,JSON.stringify(value.data));else localStorage.removeItem(key);}
  localStorage.setItem('gereedschapskist-suite-mode','eigen');
 }
 async function openChosen(root,revision){
  await ready;
  const round=await readRound(root);
  if(round){await rememberRound(round,revision,true);if(tool&&own){const s=round.values.find(v=>v.tool===tool);if(s)await applySession({...s,revision,switchWorkspace:true});else await applySession({data:tool==='Werkbank'?null:emptyData(tool),documents:[],draft:null,revision});}}
  return !!round;
 }
 async function startEmpty(revision){
  await ready;const values=Object.keys(names).map(t=>({format:'gereedschapskist-werksessie',version:1,tool:t,name:names[t],data:t==='Werkbank'?null:emptyData(t),documents:t==='Werkbank'?[]:undefined,draft:null,revision}));
  await rememberRound({values,shared:{}},revision,true);
  if(tool&&own)await applySession({...values.find(s=>s.tool===tool),switchWorkspace:true});
 }
 async function downloadBackup(){
  const {root}=await Werkmap.allAccess();
  if(!window.GereedschapskistBackup)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('werkmap-backup.js',base).href;s.onload=resolve;s.onerror=()=>reject(Error('Back-upfunctie niet geladen.'));document.head.append(s);});
  const {blob}=await GereedschapskistBackup(root),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='gereedschapskist-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  say('Back-updownload gestart van je werkmap. Controleer of het bestand is opgeslagen.');
 }
 async function mutation(fn){const {revision}=await Werkmap.allInfo();return navigator.locks.request('gereedschapskist-bewaar-alles:'+revision,fn);}
 async function readShared(){
  if(!own)return {};
  await ready;const meta=await Werkmap.allInfo(),record=(await records()).find(r=>r.id===scope+':shared'&&(!r.revision||r.revision===meta.revision));
  if(record)return record.shared;
  if(Werkmap.active){const {root}=await Werkmap.allAccess(false);return (await readRound(root))?.shared||{};}
  return {};
 }
 async function updateShared(fn){
  if(!own)throw Error('Gedeelde instellingen horen bij je eigen werk.');
  await ready;const {revision}=await Werkmap.allInfo();
  return mutation(()=>navigator.locks.request(scope+':shared-write',async()=>{const shared=clone(await readShared());await fn(shared);await transact('readwrite',s=>s.put({id:scope+':shared',scope,shared,revision}));return shared;}));
 }
 function emptyData(t){
  const value=clone(GereedschapskistExamples(t));
  for(const key of ['contacts','invoices','quotes','tasks','entries','items'])if(Array.isArray(value[key]))value[key]=[];
  delete value._gereedschapskistExample;
  if(t==='Ping'){value.sequences={};value.business={name:'',address:'',email:'',iban:'',kvk:'',vat:''};}
  if(t==='Projectbord')value.name='Mijn taken';
  if(t==='Bronnenkast')value.name='Mijn verzameling';
  return value;
 }
 async function askTool(t,type='peek',extra={}){
  const online=await peers(),known=await records(),ids=known.filter(r=>r.tool===t&&online.includes(r.id)).map(r=>r.id);
  if(t===tool&&active&&!ids.includes(id))ids.push(id);
  if(ids.length>1)throw Error(names[t]+' staat in meerdere vensters. Sluit het dubbele venster.');
  if(!ids.length)return null;
  if(ids[0]===id){let value=await snapshot();if(type==='replace'){if(JSON.stringify([value.data,value.documents,value.draft])!==extra.expected)throw Error('Gegevens zijn gewijzigd.');freeze(true);try{await applySession({...value,...extra.next});Werkstatus.changed();}finally{freeze(false);}await cache();value=await snapshot();}return value;}
  const request=crypto.randomUUID();
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{channel.removeEventListener('message',receive);reject(Error(names[t]+' reageert niet. Open het venster en probeer opnieuw.'));},12000);const receive=e=>{const m=e.data;if(m.type!=='tool-answer'||m.request!==request||!ids.includes(m.id))return;clearTimeout(timer);channel.removeEventListener('message',receive);m.error?reject(Error(m.error)):resolve(m.value);};channel.addEventListener('message',receive);channel.postMessage({type,target:t,request,...extra});});
 }
 async function readTool(t){
  await registration;
  if(!names[t])throw Error('Onbekende tool.');
  if(!own){const key=keys[t];return {data:key?JSON.parse(GereedschapskistMode.storage.getItem(key)||'null')||GereedschapskistExamples(t):null};}
  const live=await askTool(t);if(live)return live;
  let session=await storedSession(t);if(session)return clone(session);
  const {revision}=await Werkmap.allInfo();
  if(Werkmap.active){const {root}=await Werkmap.allAccess();session=(await readRound(root))?.values.find(s=>s.tool===t);if(session)return {...session,revision};}
  const raw=keys[t]?GereedschapskistMode.storage.getItem(keys[t]):null;
  return {format:'gereedschapskist-werksessie',version:1,tool:t,name:names[t],data:raw?JSON.parse(raw):t==='Werkbank'?null:emptyData(t),documents:t==='Werkbank'?[]:undefined,draft:null,revision};
 }
 async function updateTool(t,fn){
  await registration;
  return mutation(()=>navigator.locks.request(scope+':update:'+t,async()=>{
   const before=await readTool(t),next=clone(before);delete next.fromDisk;await fn(next.data,next);
   limit(next);
   if(!own){GereedschapskistMode.storage.setItem(keys[t],JSON.stringify(next.data));return next;}
   const live=await askTool(t,'replace',{expected:JSON.stringify([before.data,before.documents,before.draft]),next:{data:next.data,documents:next.documents,draft:next.draft,activeDocument:next.activeDocument}});
   if(live){return live;}
   next.savedAt=new Date().toISOString();
   await transact('readwrite',store=>store.put({id:scope+':loaded:'+t,scope,tool:t,value:next,updated:Date.now()}));
   if(keys[t])GereedschapskistMode.storage.setItem(keys[t],JSON.stringify(next.data));
   return next;
  }));
 }
 window.BewaarAlles={startEmpty,readTool,updateTool,readShared,updateShared,flush:async()=>{await registration;await cache(true,true);},canChoose:async()=>!channel||!(await peers()).some(peer=>peer!==id),save:saveAll,restore,readRound,openChosen,downloadBackup,ready:registration,session:storedSession};
})();
