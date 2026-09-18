'use strict';
// Every round is immutable. Open tabs acknowledge a snapshot; failed rounds never get a manifest.
(()=>{
 const base=new URL('.',document.currentScript.src),scope=base.href;
 const names={Werkbank:'Schrijven',Ping:'Factureren',Projectbord:'Doen',Bronnenkast:'Verzamelen',Uren:'Uren schrijven',Contacten:'Contact houden',Publicatieplanner:'Plannen',Offerte:'Offreren',Kasboek:'Boekhouden'};
 const keys={Ping:'ping-local-v1',Projectbord:'projectbord-v1',Bronnenkast:'bronnenkast-v1',Uren:'uren-v1',Contacten:'contacten-v1',Publicatieplanner:'publicatieplanner-v1',Offerte:'offerte-v1',Kasboek:'kasboek-v1'};
 const tool=document.querySelector('script[data-tool]')?.dataset.tool,own=!window.GereedschapskistMode?.example,id=crypto.randomUUID();
 const lockPrefix='gk-all:'+scope+':tab:',channelName='gk-all:'+scope,dbName='gereedschapskist-bewaar-alles-v1';
 let db,channel,frozen=false,active=false,cacheTimer,unlock,registration,seen,restoring=false;
 const say=text=>{const el=document.getElementById('wm-message');if(el)el.textContent=text;for(const el of document.querySelectorAll('dialog[open] .all-dialog-status'))el.textContent=text;};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const timed=(promise,label)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label+' reageert niet op tijd.')),12000);promise.then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)});});
 const limit=value=>{if(new Blob([JSON.stringify(value)]).size>100*1024*1024)throw Error('Te veel gegevens in één tool voor Bewaar alles.');return value;};
 const ready=new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('sessions',{keyPath:'id'});r.onsuccess=()=>{db=r.result;resolve();};r.onerror=()=>reject(r.error);});
 ready.catch(()=>{});
 function transact(mode,fn){return new Promise((resolve,reject)=>{const tx=db.transaction('sessions',mode),r=fn(tx.objectStore('sessions'));tx.oncomplete=()=>resolve(r?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Tussentijdse kopie niet bewaard.'));});}
 async function records(){await ready;return (await transact('readonly',s=>s.getAll())).filter(r=>r.scope===scope);}
 function formFields(){return [...document.querySelectorAll('form')].filter(f=>!f.closest('dialog')||f.closest('dialog').open).map(f=>({id:f.id,fields:[...f.querySelectorAll('input:not([type=file]):not([type=password]),textarea,select')].map((e,index)=>({index,id:e.id,value:e.value,checked:e.checked,type:e.type}))}));}
 function applyFields(forms){for(const f of forms||[]){const form=document.getElementById(f.id);if(!form||form.tagName!=='FORM')continue;const fields=[...form.querySelectorAll('input:not([type=file]):not([type=password]),textarea,select')];for(const entry of f.fields){const e=fields[entry.index];if(!e||e.id!==entry.id||e.type!==entry.type||typeof entry.value!=='string')throw Error('De formulierindeling is veranderd. Het concept blijft in het bestand beschikbaar.');if(e.disabled||e.readOnly)continue;e.value=entry.value;e.checked=!!entry.checked;}for(const e of fields.filter(e=>!e.disabled&&!e.readOnly)){e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}}}
 function draft(){
  const out={forms:formFields(),dialogs:[...document.querySelectorAll('dialog[open]')].map(e=>e.id)};
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
  let value=clone(Werkmap.allRead()),documents;
  if(tool==='Werkbank'){
   documents=[];
   for(const [name,item] of converterFiles)documents.push({name,path:'converter/'+name,content:item.content});
   for(const f of files){if(f.isVirtual)continue;if(!full&&f.relativePath!==activeFile?.relativePath){if(fileContents.has(f.relativePath))documents.push({name:f.name,path:f.relativePath,content:fileContents.get(f.relativePath)});continue;}const content=f.relativePath===activeFile?.relativePath?(isEditMode?getWysiwygMarkdown():currentRawContent):await(await f.getFile()).text();documents.push({name:f.name,path:f.relativePath,content});}
   if(activeFile){const content=isEditMode?getWysiwygMarkdown():currentRawContent;const old=documents.find(d=>d.path===activeFile.relativePath);if(old)old.content=content;else documents.push({name:activeFile.name,path:activeFile.relativePath,content});}
  }
  return limit({format:'gereedschapskist-werksessie',version:1,tool,name:names[tool],data:value,documents,draft:tool==='Werkbank'?null:clone(draft()),activeDocument:tool==='Werkbank'?activeFile?.relativePath:null,revision:meta.revision,savedAt:new Date().toISOString()});
 }
 async function cache(){if(!active||frozen||restoring)return;try{const value=await snapshot(false);await transact('readwrite',s=>s.put({id,scope,tool,value,updated:Date.now()}));}catch(e){say('Tussentijdse gezamenlijke kopie niet bijgewerkt: '+e.message);}}
 function schedule(){clearTimeout(cacheTimer);cacheTimer=setTimeout(cache,350);}
 function freeze(value){frozen=value;document.documentElement.setAttribute('aria-busy',String(value));}
 for(const event of ['beforeinput','click','keydown','submit','drop','cancel'])document.addEventListener(event,e=>{if(frozen){e.preventDefault();e.stopImmediatePropagation();}},true);
 for(const event of ['input','change','click','close'])document.addEventListener(event,schedule,true);
 window.addEventListener('pagehide',()=>{unlock?.();});
 async function peers(){const locks=await navigator.locks.query();return (locks.held||[]).filter(l=>l.name.startsWith(lockPrefix)).map(l=>l.name.slice(lockPrefix.length)).sort();}
 async function respond(msg){
  if(msg.type==='saved'){if(msg.ids.includes(id)){Werkstatus.allWritten();say('Je werk en conceptinvoer zijn opgenomen in Bewaar alles.');}return;}
  if(msg.type==='release'){clearTimeout(seen);freeze(false);if(!msg.saved&&active)say('Bewaar alles is niet afgerond. Bekijk de melding in het venster waar je op Bewaar alles klikte.');schedule();return;}
  if(msg.type!=='capture'||!active)return;
  freeze(true);say('Bewaar alles is bezig. Je gegevens en conceptinvoer worden meegenomen…');clearTimeout(seen);seen=setTimeout(()=>{freeze(false);say('De bewaarronde reageert niet meer. Controleer het venster waarin je het bewaren startte.');},90000);
  try{const value=await timed(snapshot(),names[tool]);channel.postMessage({type:'answer',round:msg.round,id,value});}
  catch(e){channel.postMessage({type:'answer',round:msg.round,id,error:names[tool]+': '+e.message});}
 }
 async function init(){
  await Werkmap.ready;await ready;
  if(own&&tool){
   const add=()=>{for(const actions of document.querySelectorAll('dialog .form-actions')){if(actions.querySelector('.gk-save-all'))continue;const button=document.createElement('button');button.type='button';button.className='gk-save-all';button.textContent='Bewaar alles';button.onclick=async()=>{button.disabled=true;try{await saveAll()}catch(e){say('Niet alles bewaard: '+e.message)}finally{button.disabled=false}};actions.append(button);const status=document.createElement('p');status.className='all-dialog-status';status.setAttribute('role','status');actions.after(status);}};
   add();new MutationObserver(add).observe(document.body,{childList:true,subtree:true});
  }

  if(!navigator.locks||!window.BroadcastChannel)throw Error('Bewaar alles werkt in een recente Chrome of Edge.');
  channel=new BroadcastChannel(channelName);channel.addEventListener('message',e=>respond(e.data));
  if(tool&&own){await new Promise(resolve=>navigator.locks.request(lockPrefix+id,async()=>{active=true;resolve();await new Promise(r=>unlock=r);}));await cache();}
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
  const meta=await Werkmap.allAccess();
  return navigator.locks.request('gereedschapskist-bewaar-alles:'+meta.revision,{ifAvailable:true},async lock=>{
   if(!lock)throw Error('Een ander venster bewaart al alles.');
   let roundDir,committed=false;
   try{
    say('Actuele gegevens en concepten ophalen uit geopende tools…');
    const live=await captureAll();
    const snapshots=[];for(const item of live){const other=snapshots.find(x=>x.value.tool===item.value.tool);if(other){const comparable=v=>JSON.stringify([v.data,v.draft,v.documents]);if(comparable(other.value)!==comparable(item.value))throw Error(item.value.name+' staat in meerdere vensters met verschillende invoer. Gebruik één venster per tool en probeer opnieuw.');}else snapshots.push(item);}const openTools=new Set(live.map(s=>s.value.tool));
    // A closed tab's last captured session includes unfinished forms. Keep all variants, never merge conflicting tabs.
    const stored=await records();
    for(const t of Object.keys(names)){if(openTools.has(t))continue;const previous=stored.filter(s=>s.tool===t&&s.value).sort((a,b)=>b.updated-a.updated);if(previous.length)snapshots.push({id:previous[0].id,value:previous[0].value});}
    for(const [t,key] of Object.entries(keys)){if(snapshots.some(s=>s.value.tool===t))continue;const raw=localStorage.getItem(key);if(raw){const data=JSON.parse(raw);if(data._gereedschapskistExample)continue;snapshots.push({id:'browser',value:{format:'gereedschapskist-werksessie',version:1,tool:t,name:names[t],data,draft:null,savedAt:new Date().toISOString()}});}}
    if(!snapshots.some(s=>s.value.tool==='Werkbank')){const raw=localStorage.getItem('converterFiles');if(raw){const docs=JSON.parse(raw).map(([name,v])=>({name,path:'converter/'+name,content:v.content}));snapshots.push({id:'browser',value:{format:'gereedschapskist-werksessie',version:1,tool:'Werkbank',name:names.Werkbank,documents:docs,data:null,draft:null,savedAt:new Date().toISOString()}});}}
    const slugs={Ping:'factureren',Projectbord:'doen',Bronnenkast:'verzamelen',Uren:'uren-schrijven',Contacten:'contact-houden',Publicatieplanner:'plannen',Offerte:'offreren',Kasboek:'boekhouden'};
    for(const [t,slug] of Object.entries(slugs)){if(snapshots.some(s=>s.value.tool===t))continue;try{const dir=await meta.root.getDirectoryHandle(names[t]),file=await(await dir.getFileHandle('gereedschapskist-'+slug+'.json')).getFile();if(file.size>20000000)throw Error(names[t]+': bestand te groot.');const value=JSON.parse(await file.text());if(value._gereedschapskistExample)continue;snapshots.push({id:'bestand',value:{format:'gereedschapskist-werksessie',version:1,tool:t,name:names[t],data:value,draft:null,savedAt:new Date(file.lastModified).toISOString()}});}catch(e){if(e.name!=='NotFoundError')throw e;}}
    for(const s of snapshots)if(s.value.revision&&s.value.revision!==meta.revision)throw Error(s.value.name+' hoort bij een andere werkmap. Open die tool bij de huidige werkmap.');
    const roundName=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8),rounds=await meta.root.getDirectoryHandle('Bewaard werk',{create:true});
    roundDir=await rounds.getDirectoryHandle(roundName,{create:true});const manifest={format:'gereedschapskist-bewaarronde',version:1,date:new Date().toISOString(),sessions:[]};
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
    await write(rounds,'actueel.json',JSON.stringify(pointer,null,2));
    committed=true;window.Werkstatus?.allWritten();channel.postMessage({type:'saved',ids:live.map(s=>s.id)});
    if(previous?.previous&&previous.previous!==pointer.current&&previous.previous!==pointer.previous&&/^\d{4}-.*-[a-f0-9]{8}$/.test(previous.previous)){
     try{const old=await rounds.getDirectoryHandle(previous.previous);const m=JSON.parse(await(await(await old.getFileHandle('bewaar-alles.json')).getFile()).text());if(m.format==='gereedschapskist-bewaarronde')await rounds.removeEntry(previous.previous,{recursive:true});}catch{/* Cleanup is optional; saving remains successful. */}
    }
    for(const s of live)await transact('readwrite',store=>store.put({id:s.id,scope,tool:s.value.tool,value:s.value,updated:Date.now()}));
    say('Alles staat in je werkmap. ZIP maken…');
    if(!window.GereedschapskistBackup)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('werkmap-backup.js',base).href;s.onload=resolve;s.onerror=()=>reject(Error('ZIP-functie niet geladen.'));document.head.append(s);});
    const {blob}=await GereedschapskistBackup(meta.root),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='gereedschapskist-alles-'+roundName+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    say('Alles bewaard. Je actuele bewaarkopie is bijgewerkt, inclusief formulierconcepten. Download gestart; controleer of je ZIP is opgeslagen.');
   }catch(e){e.message=(committed?'Je werk staat in de actuele bewaarkopie, maar de ZIP is niet afgerond. ':'De vorige bewaarkopie blijft actief. ')+e.message;say(e.message);throw e;}
   finally{freeze(false);channel.postMessage({type:'release',saved:committed});schedule();}
  });
 }
 async function restoreDraft(d){
  if(!d)return;
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
  applyFields(d.forms);Werkstatus.update();
 }
 async function restore(){
  await registration;const {root}=await Werkmap.allAccess();
  const rounds=await root.getDirectoryHandle('Bewaard werk'),items=[];
  const pointer=JSON.parse(await(await(await rounds.getFileHandle('actueel.json')).getFile()).text());if(pointer.format!=='gereedschapskist-bewaard-werk')throw Error('Geen geldige bewaarkopie.');
  for(const name of [pointer.current,pointer.previous].filter(Boolean)){if(typeof name!=='string'||/[\\/]/.test(name))throw Error('Ongeldig pad.');const dir=await rounds.getDirectoryHandle(name);try{const m=JSON.parse(await(await(await dir.getFileHandle('bewaar-alles.json')).getFile()).text());if(m.format!=='gereedschapskist-bewaarronde')continue;for(const session of m.sessions){if(session.tool===tool&&!/[\\/]/.test(session.folder))items.push({name,dir,session,date:m.date});}}catch{}}
  items.sort((a,b)=>b.date.localeCompare(a.date));if(!items.length)throw Error('Geen complete bewaarronde voor deze tool.');
  const dialog=document.createElement('dialog'),select=document.createElement('select'),title=document.createElement('h2'),open=document.createElement('button'),cancel=document.createElement('button');title.textContent='Open bewaard werk';
  items.forEach((item,i)=>select.add(new Option((item.name===pointer.current?'Actueel':'Vorige kopie (herstel)')+' · '+new Date(item.date).toLocaleString('nl-NL'),i)));open.textContent='Open deze versie';cancel.textContent='Annuleren';dialog.append(title,select,open,cancel);document.body.append(dialog);
  const chosen=await new Promise(resolve=>{open.onclick=()=>{resolve(items[+select.value]);dialog.close()};cancel.onclick=()=>dialog.close();dialog.onclose=()=>resolve(null);dialog.showModal()});dialog.remove();if(!chosen)return;
  const dir=await chosen.dir.getDirectoryHandle(chosen.session.folder),file=await(await dir.getFileHandle('werksessie.json')).getFile();if(file.size>100*1024*1024)throw Error('Werksessie te groot.');const s=JSON.parse(await file.text());if(s.format!=='gereedschapskist-werksessie'||s.version!==1||s.tool!==tool)throw Error('Geen passende werksessie.');
  if(!confirm('Deze bewaarde versie openen? Bewaar je huidige werk eerst met Bewaar alles als je dat wilt houden.'))return;
  restoring=true;try{
   if(tool==='Werkbank'){for(const d of [...(s.documents||[])].sort((a,b)=>(a.path===s.activeDocument?1:0)-(b.path===s.activeDocument?1:0))){if(typeof d.content!=='string'||typeof d.name!=='string')throw Error('Ongeldig document.');if(!await Werkmap.allLoad(new File([d.content],safe(d.name))))throw Error('Openen geannuleerd.');}}
   else{if(!await Werkmap.allLoad(new File([JSON.stringify(s.data)],'gegevens.json')))throw Error('Openen geannuleerd.');await restoreDraft(s.draft);}
   say('Bewaarronde geopend. Eventuele conceptinvoer staat weer in het formulier; controleer die voordat je verdergaat.');
  }finally{restoring=false;schedule();}
 }
 window.BewaarAlles={save:saveAll,restore};
})();
