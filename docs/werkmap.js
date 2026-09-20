'use strict';
// One directory handle per installation/origin; files remain ordinary user files.
window.Werkmap=(()=>{
 const catalog={Werkbank:['Schrijven',null],Ping:['Factureren','factureren'],Projectbord:['Doen','doen'],Bronnenkast:['Verzamelen','verzamelen'],Uren:['Uren schrijven','uren-schrijven'],Contacten:['Contact houden','contact-houden'],Publicatieplanner:['Plannen','plannen'],Offerte:['Offreren','offreren'],Kasboek:['Boekhouden','boekhouden']};
 const tool=document.querySelector('script[data-tool]')?.dataset.tool,example=window.GereedschapskistMode?.example;
 const supported='showDirectoryPicker' in window&&!!window.indexedDB,dbName='gereedschapskist-werkmap-v1';
 let root=null,revision=null,db=null,adapter=null,box=null,busy=false,starting=false;const known=new Map();let adapterResolve;const adapterReady=new Promise(resolve=>adapterResolve=resolve);
 const $=id=>document.getElementById('wm-'+id);
 function message(text){if($('message'))$('message').textContent=text;}
 function pickerStopped(){return 'De browser heeft geen map doorgegeven. Het kiezen kan zijn afgebroken of de maptoegang kan zijn geweigerd. Heb je wel een map bevestigd? Gebruik Chrome of Edge op je computer en kies dezelfde map. Je huidige werk blijft behouden.';}
 function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 function setting(action,value){return new Promise((resolve,reject)=>{const tx=db.transaction('settings',action==='get'?'readonly':'readwrite'),s=tx.objectStore('settings'),r=action==='get'?s.get('root'):action==='delete'?s.delete('root'):s.put(value,'root');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Mapkeuze niet bewaard.'));});}
 const ready=(async()=>{if(!supported||example)return;try{db=await database();const saved=await setting('get');root=saved?.handle||null;revision=saved?.revision||null;}catch{message('De mapkeuze kon niet worden onthouden. Kies de map opnieuw.');}})();
 async function permission(handle){if(await handle.queryPermission({mode:'readwrite'})!=='granted'&&await handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('Geen toegang tot je werkmap. Geef toestemming of gebruik Download kopie.');}
 async function checkRoot(){if(!root)throw Error('Kies eerst een werkmap.');if(db){const saved=await setting('get');if(saved?.revision!==revision)throw Error('De werkmap is in een ander venster veranderd. Herlaad deze tool voordat je verdergaat.');}}
 async function folder(){await checkRoot();await permission(root);return root.getDirectoryHandle(catalog[tool][0],{create:true});}
 async function existing(dir,name){try{return await dir.getFileHandle(name);}catch(e){if(e.name==='NotFoundError')return null;throw e;}}
 function filename(){return 'gereedschapskist-'+catalog[tool][1]+'.json';}
 function safeName(name){if(typeof name!=='string'||!name.trim()||name.length>160||/[\\/:*?"<>|\u0000-\u001f]/.test(name)||name==='.'||name==='..')throw Error('Gebruik een korte bestandsnaam zonder schuine strepen of bijzondere tekens.');return name.trim();}
 async function choose(selectedHandle=null,{requireExisting=false}={}){
  if(busy)return;busy=true;const button=$('choose');if(button)button.disabled=true;if(box)box.open=true;
  message('Kies een map in het mapvenster en geef toegang. Verschijnt er geen venster? Probeer deze pagina in Chrome of Edge.');
  let stage='picker';
  try{
   const handle=selectedHandle?.kind==='directory'?selectedHandle:await showDirectoryPicker({id:'gereedschapskist',mode:'readwrite'});
   stage='permission';message('Toegang controleren voor '+handle.name+'…');await permission(handle);
   const same=!!root&&await root.isSameEntry(handle);
   if(root&&!same&&window.BewaarAlles&&!(await BewaarAlles.canChoose()))throw Error('Sluit andere toolvensters voordat je een andere werkmap opent.');
   stage='folders';message('Werkmap controleren: '+handle.name+'…');
   stage='remember';message('Werkmap onthouden…');
   let rev=same?revision:null;
   try{const info=JSON.parse(await(await(await handle.getFileHandle('gereedschapskist-werkmap.json')).getFile()).text());if(info.format!=='gereedschapskist-werkmap'||typeof info.id!=='string')throw Error('Ongeldige werkmapgegevens.');rev=info.id;}
   catch(e){if(e.name!=='NotFoundError')throw e;}
   const round=await window.BewaarAlles?.readRound(handle);
   if(requireExisting&&!rev&&!round)throw Error('Dit is geen Gereedschapskist-werkmap. Kies de hoofdmap waarin je eerder je werk hebt bewaard.');
   if(!rev)rev=crypto.randomUUID();
   if(!await existing(handle,'gereedschapskist-werkmap.json')){const h=await handle.getFileHandle('gereedschapskist-werkmap.json',{create:true}),w=await h.createWritable();await w.write(JSON.stringify({format:'gereedschapskist-werkmap',version:1,id:rev},null,2));await w.close();}
   if(!same&&round&&!confirm('Open de bewaarde Gereedschapskist in '+handle.name+'? Dit vervangt je huidige browserwerk. Bewaar dat eerst als je het wilt houden.'))return;
   if(db)await setting('put',{handle,revision:rev});
   root=handle;revision=rev;known.clear();render();
   localStorage.setItem('gereedschapskist-suite-mode','eigen');
   const opened=!same&&round?await BewaarAlles.openChosen(handle,rev):false;
   message(opened?'Werkmap '+handle.name+' geopend. Alle bewaarde tools staan klaar.':'Werkmap: '+handle.name+'. Bewaar alles bewaart je werk en concepten uit alle tools hier.');
   document.dispatchEvent(new CustomEvent('werkmap-gekozen'));
   return true;

  }catch(e){
   if(e.name==='AbortError'&&stage==='picker')message(pickerStopped());
   else message('Werkmap niet gekoppeld ('+({picker:'mapvenster',permission:'toegang',folders:'toolmappen aanmaken',remember:'mapkeuze onthouden'}[stage])+'): '+e.message+(root?' Je vorige werkmap blijft gekoppeld.':'')+' Bestand openen en downloaden blijven beschikbaar.');
  }finally{busy=false;if(button)button.disabled=false;}
 }

 function chooseNewLocation(){return new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog');dialog.className='wm-dialog';dialog.setAttribute('aria-labelledby','new-location-title');
  const title=document.createElement('h2');title.id='new-location-title';title.textContent='Waar mag je Gereedschapskist komen?';
  const text=document.createElement('p');text.textContent='Kies een opslagplek. Wij maken daarin Mijn Gereedschapskist met negen submappen. Sommige plekken, zoals de hele map Documenten, kunnen door je browser worden geweigerd.';
  const hint=document.createElement('p');hint.textContent='Gebruik Chrome of Edge op je computer. Wordt alleen de gekozen opslagplek geweigerd? Gebruik dan de handmatige optie voor een lege hoofdmap.';
  const cancel=document.createElement('button');cancel.textContent='Annuleren';cancel.onclick=()=>dialog.close();
  const pick=document.createElement('button');pick.textContent='Kies opslagplek';pick.className='primary';
  const manual=document.createElement('button');manual.textContent='Zelf een lege hoofdmap kiezen';let picked=false;
  const select=async(direct)=>{pick.disabled=manual.disabled=true;try{const handle=await showDirectoryPicker({id:'gereedschapskist-plek',mode:'readwrite'});picked=true;dialog.close();resolve({handle,direct});}catch(e){picked=true;dialog.close();reject(e);}};
  pick.onclick=()=>select(false);
  manual.onclick=()=>{text.textContent='Maak in het mapvenster een nieuwe map, bijvoorbeeld Mijn Gereedschapskist. Selecteer die lege map en bevestig met Selecteer of Open. Er komt geen extra hoofdmap in.';pick.hidden=true;manual.textContent='Selecteer de lege hoofdmap';manual.onclick=()=>select(true);};
  dialog.onclose=()=>{dialog.remove();if(!picked)reject(Object.assign(new Error('Geannuleerd'),{name:'UserCancelledError'}));};dialog.append(title,text,hint,cancel,pick,manual);document.body.append(dialog);dialog.showModal();
 });}
 async function startNew(){
  if(busy||starting)return false;starting=true;let stage='map kiezen';
  message('Kies een opslagplek. Wij maken de hoofdmap en negen submappen.');
  try{
   const selection=await chooseNewLocation();let handle=selection.handle;
   stage='toegang controleren';await ready;await permission(handle);await allReady;await BewaarAlles.ready;
   if(!(await BewaarAlles.canChoose()))throw Error('Sluit de andere toolvensters voordat je nieuw begint. Hun werk blijft behouden.');
   if(!selection.direct){
    let name='Mijn Gereedschapskist';
    while(true){
     let exists=false;try{await handle.getDirectoryHandle(name);exists=true;}catch(e){if(e.name==='TypeMismatchError')exists=true;else if(e.name!=='NotFoundError')throw e;}
     if(!exists)break;
     const answer=prompt(name+' bestaat al. Kies een andere naam voor nieuw werk, of annuleer en kies Verder werken.','Mijn Gereedschapskist 2');
     if(answer===null)return false;name=safeName(answer);
    }
    handle=await handle.getDirectoryHandle(name,{create:true});
   }
   for await(const entry of handle.values())throw Error('Deze map is niet leeg. Maak en selecteer een nieuwe, lege map. Wil je bestaand werk openen? Kies Verder werken. Er is niets in deze map gewijzigd.');
   // Preserve the current workspace before moving to an empty one.
   const hadRoot=!!root;if(hadRoot)await BewaarAlles.save();
   stage='submappen aanmaken';
   for(const [label]of Object.values(catalog))await handle.getDirectoryHandle(label,{create:true});
   if(!await choose(handle))return false;
   if(hadRoot)await BewaarAlles.startEmpty(revision);
   stage='eerste bewaarkopie maken';await BewaarAlles.save();
   message('Klaar: '+handle.name+'. De negen submappen zijn aangemaakt. Kies een tool om te beginnen.');
   return true;
  }catch(e){message(e.name==='UserCancelledError'?'Geen werkmap gekoppeld. Je huidige werk blijft behouden.':e.name==='AbortError'&&stage==='map kiezen'?pickerStopped():'Niet gestart bij '+stage+': '+e.message);return false;}finally{starting=false;}
 }
 async function continueWork(){
  await ready;await allReady;
  if(!root)return choose(null,{requireExisting:true});
  try{await permission(root);await checkRoot();message('Verder werken in '+root.name+'. Je werk staat klaar.');return true;}
  catch(e){message('Niet geopend: '+e.message+' Kies zo nodig een andere werkmap via Meer & uitleg.');return false;}
 }

 async function load(){if(busy)return;busy=true;try{await ready;const dir=await folder();let name=filename();if(tool==='Werkbank'){
  const names=[];for await(const h of dir.values())if(h.kind==='file'&&/\.(md|markdown|txt)$/i.test(h.name))names.push(h.name);
  names.sort((a,b)=>a.localeCompare(b,'nl'));if(!names.length)throw Error('De map Schrijven is nog leeg. Maak een nieuw document en bewaar het.');
  const dialog=document.createElement('dialog');dialog.className='wm-dialog';const title=document.createElement('h2');title.textContent='Document uit je werkmap';const select=document.createElement('select');select.setAttribute('aria-label','Document');for(const n of names)select.add(new Option(n,n));const cancel=document.createElement('button');cancel.textContent='Annuleren';const open=document.createElement('button');open.textContent='Document openen';dialog.append(title,select,cancel,open);document.body.append(dialog);
  name=await new Promise(resolve=>{cancel.onclick=()=>dialog.close();dialog.oncancel=e=>{e.preventDefault();dialog.close()};dialog.onclose=()=>resolve(null);open.onclick=()=>{resolve(select.value);dialog.close()};dialog.showModal()});dialog.remove();if(!name)return;
 }
 const handle=await existing(dir,name);if(!handle)throw Error('Nog geen bestand in deze toolmap. Open een bestaand bestand of begin nieuw en kies Bewaar bestand.');
 const file=await handle.getFile();if(file.size>20000000)throw Error('Het bestand is groter dan 20 MB.');const raw=await file.text();
 if(await adapter.load(file,{dir,handle,path:root.name+'/'+catalog[tool][0]+'/'+name})){known.set(name,raw);adapter.bound?.(name);Werkstatus.opened(root.name+'/'+catalog[tool][0]+'/'+name);message('Geopend uit je werkmap. Bewaar bestand schrijft voortaan hier terug.');}
 }catch(e){if(e.name!=='AbortError')message('Niet geopend: '+e.message);}finally{busy=false;}}
 async function write(dir,name,text){
  const operation=async()=>{
   await checkRoot();adapter.check?.();let handle=await existing(dir,name),old=null;
   if(handle){const file=await handle.getFile();if(file.size>20000000)throw Error('Het bestaande bestand is te groot.');old=await file.text();if(!known.has(name))throw Error('Hier bestaat al '+name+'. Kies eerst Open uit werkmap. Je huidige invoer blijft behouden; download zo nodig eerst een kopie.');if(known.get(name)!==old)throw Error('Dit bestand is buiten dit venster gewijzigd. Er is niets overschreven. Download eerst je wijzigingen als kopie en open daarna het actuele werkmapbestand.');}
   else if(known.has(name))throw Error('Het eerder geopende bestand is verplaatst of verwijderd. Kies de werkmap opnieuw voordat je verdergaat.');
   if(old===text)return;
   if(handle){const backups=await dir.getDirectoryHandle('Herstelkopieen',{create:true}),stamp=new Date().toISOString().replace(/[:.]/g,'-'),backup=await backups.getFileHandle(stamp+'-'+crypto.randomUUID()+'-'+name,{create:true});const stream=await backup.createWritable();try{await stream.write(old);await stream.close()}catch(e){try{await stream.abort()}catch{}throw e;}if(await (await backup.getFile()).text()!==old)throw Error('Herstelkopie niet bevestigd. Het origineel blijft behouden.');if(await (await handle.getFile()).text()!==old)throw Error('Het bestand is ondertussen gewijzigd. Het origineel blijft behouden.');}
   // Exclusive writers prevent another supported writer from overwriting concurrently.
   if(!handle){handle=await dir.getFileHandle(name,{create:true});if((await handle.getFile()).size!==0)throw Error('Er is ondertussen een bestand met deze naam gemaakt. Open het eerst.');known.set(name,'');}const stream=await handle.createWritable({mode:'exclusive'});
   try{adapter.check?.();if(old!==null&&await(await handle.getFile()).text()!==old)throw Error('Bestand intussen gewijzigd.');await stream.write(text);await stream.close()}catch(e){try{await stream.abort()}catch{}throw e;}
   if(await(await handle.getFile()).text()!==text)throw Error('Opslaan kon niet worden bevestigd. Controleer het bestand en de herstelkopie.');
  };
  if(navigator.locks)await navigator.locks.request('gereedschapskist-werkmap:'+catalog[tool][0]+':'+name,operation);else await operation();
  known.set(name,text);
 }
 async function save(){await ready;if(!root||example)return false;if(busy)return false;busy=true;if(box)box.open=true;message('Bezig met bewaren…');
 try{const dir=await folder();if(!adapter.prepare())return false;let name=filename(),text,signature;
  if(tool==='Werkbank'){const doc=adapter.read();if(!doc)throw Error('Open of maak eerst een document.');name=adapter.name();if(!name){const choice=prompt('Naam voor dit document in Schrijven:',doc.name||'Nieuw document.md');if(choice===null)return false;name=safeName(choice);if(!/\.(md|markdown|txt)$/i.test(name))name+='.md';}text=doc.content;signature=JSON.stringify(doc);}
  else{text=JSON.stringify(adapter.read(),null,2)+'\n';signature=JSON.stringify(adapter.read());}
  if(new Blob([text]).size>20000000)throw Error('Bestand groter dan 20 MB.');
  await write(dir,name,text);adapter.bound?.(name);
  // Never mark edits made during a slow disk write as saved.
  if(JSON.stringify(adapter.read())===signature){await adapter.saved?.(name,{dir,handle:await existing(dir,name),path:root.name+'/'+catalog[tool][0]+'/'+name});Werkstatus.opened(root.name+'/'+catalog[tool][0]+'/'+name);Werkstatus.written();message('Opgeslagen in '+root.name+'/'+catalog[tool][0]+'/'+name+'.');}
  else message('De eerdere versie is opgeslagen. Er zijn ondertussen nieuwe wijzigingen; bewaar opnieuw.');
  return true;
 }catch(e){message('Niet opgeslagen: '+e.message);return false;}finally{busy=false;if($('message')?.textContent==='Bezig met bewaren…')message('Niet opgeslagen. Je invoer blijft behouden.');}}

 async function readContacts(){
  await ready;if(!root||example)return null;
  await checkRoot();await permission(root);
  try{const dir=await root.getDirectoryHandle('Contact houden');return await(await dir.getFileHandle('gereedschapskist-contact-houden.json')).getFile();}
  catch(e){if(e.name==='NotFoundError')return null;throw e;}
 }

 async function exportFile(blob,name){
  await ready;if(!root||example)return false;if(busy){message('Er loopt nog een bestandsactie. Probeer deze export daarna opnieuw.');return false;}busy=true;if(box)box.open=true;
  try{const dir=await(await folder()).getDirectoryHandle('Exports',{create:true});name=safeName(name);if(await existing(dir,name))name=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8)+'-'+name;
   const file=await dir.getFileHandle(name,{create:true});if((await file.getFile()).size!==0)throw Error('Er bestaat ondertussen al een export met deze naam. Probeer opnieuw.');let stream;try{stream=await file.createWritable({mode:'exclusive'});await stream.write(blob);await stream.close()}catch(e){try{await stream?.abort()}catch{}try{if((await file.getFile()).size===0)await dir.removeEntry(name)}catch{}throw e;}
   if((await file.getFile()).size!==blob.size)throw Error('Bestandsgrootte niet bevestigd.');
   message('Export opgeslagen in '+root.name+'/'+catalog[tool][0]+'/Exports/'+name+'.');return true;
  }catch(e){message('Export niet opgeslagen: '+e.message);return false;}finally{busy=false;}
 }


 async function backup(){
  const button=$('backup');if(button.disabled)return;button.disabled=true;
  try{await allReady;await BewaarAlles.save();}catch(e){message('Niet alles bewaard: '+e.message);}finally{button.disabled=false;}
 }
 const allReady=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('bewaar-alles.js',document.currentScript.src).href;s.onload=resolve;s.onerror=()=>reject(Error('Bewaar alles kon niet laden. Ververs de pagina.'));document.head.append(s);});
 allReady.catch(()=>{});
 const ui=document.createElement('script');ui.src=new URL('werkruimte-ui.js',document.currentScript.src).href;document.head.append(ui);
 async function allAccess(ask=true){await ready;await checkRoot();if(example)throw Error('Open eerst je eigen werk.');if(ask)await permission(root);return {root,revision};}
 function render(){if(!box)return;if(!tool){for(const link of document.querySelectorAll('.grid a')){if(!link.dataset.originalHref)link.dataset.originalHref=link.getAttribute('href');const url=new URL(link.dataset.originalHref,location.href);if(root)url.searchParams.set('werkruimte','eigen');link.href=root?url.href:link.dataset.originalHref;}}$('name').textContent=example?'Voorbeelden blijven buiten je eigen werkmap':root?'Werkmap: '+root.name+(tool?' / '+catalog[tool][0]:''):'Mijn werkmap';$('choose').hidden=!supported||example;$('choose').textContent=root?'Andere werkmap kiezen':'Kies werkmap';$('backup').hidden=!!example;$('all-open').hidden=!!example;$('forget').hidden=!root;$('open').hidden=true;$('copy').hidden=!adapter;$('hint').textContent=example?'Je kunt voorbeelden downloaden om te oefenen.':!supported?'Deze browser biedt geen maptoegang. Bestand openen en downloaden blijven beschikbaar.':root?'Bewaar alles bewaart de hele werkruimte in deze map, inclusief conceptinvoer. Open werkmap brengt alle tools terug. PDF’s kies je zelf in het afdrukvenster.':'Kies eenmaal een map. Daarna bewaar je al je werk met Bewaar alles en open je de hele werkmap om verder te gaan.';const loose=document.querySelector('.loose-documents span');if(loose)loose.textContent=root?'Nieuwe losse documenten gaan naar Schrijven in je werkmap. Een gekoppeld document wordt in zijn eigen map bewaard. Download kopie maakt een losse download.':'Bewaar bestand maakt een download. Opslaan in map werkt alleen na Map openen.';}
 function register(config){adapter=config;adapterResolve();render();}
 async function mount(){await ready;const style=document.createElement('style');style.textContent='.werkmap{margin:14px 32px;padding:14px 16px;border:1px solid #bbb;border-left:4px solid #e32720;font:14px/1.5 Arial,sans-serif;background:#fff;color:#111}.shell .werkmap{margin:0 0 20px}.werkmap summary{font-weight:700;cursor:pointer}.werkmap p{margin:8px 0;max-width:850px}.werkmap .wm-actions{display:flex;flex-wrap:wrap;gap:8px}.werkmap button,.wm-dialog button,.wm-dialog select{font:14px Arial;padding:10px;border:1px solid #111;background:#fff;color:#111;cursor:pointer;min-height:42px}.werkmap button:focus-visible,.wm-dialog :focus-visible{outline:3px solid #e32720;outline-offset:3px}.werkmap [hidden]{display:none!important}.wm-dialog{max-width:calc(100% - 32px);border:2px solid #111}.wm-dialog select{display:block;width:100%;margin:15px 0}.wm-dialog::backdrop{background:#0007}#wm-message{overflow-wrap:anywhere}@media(max-width:600px){.werkmap{margin:12px 16px}}@media print{.werkmap{display:none}}';document.head.append(style);
 box=document.createElement('details');box.className='werkmap';box.id='werkmap';box.open=!tool||!!root;box.innerHTML='<summary id="wm-name">Mijn werkmap</summary><p id="wm-hint"></p><div class="wm-actions"><button type="button" id="wm-choose">Kies werkmap</button><button type="button" id="wm-open" hidden>Open uit werkmap</button><button type="button" id="wm-copy" hidden>Exporteer deze tool</button><button type="button" id="wm-backup">Bewaar alles</button><button type="button" id="wm-all-open">Open werkmap</button><button type="button" id="wm-zip">Download back-up</button><button type="button" id="wm-previous">Herstel vorige versie</button><button type="button" id="wm-forget" hidden>Werkmap loskoppelen</button></div><p>Je werk blijft in je eigen map. Bewaar alles neemt ook conceptinvoer en eerder bewaarde, gesloten tools mee. Er blijft één vorige kopie voor herstel. Download back-up is een optionele kopie van de map.</p><p id="wm-message" role="status"></p>';
 const home=document.querySelector('.titlebar');if(!tool&&home)home.after(box);else(document.getElementById('file-status')||document.querySelector('.brandbar,header')).after(box);
 $('zip').onclick=async()=>{try{await allReady;await BewaarAlles.downloadBackup()}catch(e){message(e.message)}};$('previous').onclick=async()=>{try{await allReady;await BewaarAlles.restore(true)}catch(e){message(e.message)}};$('backup').onclick=backup;$('all-open').onclick=async()=>{try{await allReady;await BewaarAlles.restore();}catch(e){message('Niet geopend: '+e.message);}};$('choose').onclick=()=>choose(null,{requireExisting:true});$('open').onclick=load;$('copy').onclick=()=>adapter?.download();$('forget').onclick=async()=>{if(busy)return;if(!confirm('Werkmap loskoppelen? Je bestanden blijven staan. Bewaar bestand wordt weer een download.'))return;try{if(db)await setting('delete');root=null;revision=null;known.clear();render();message('Losgekoppeld. Je bestanden zijn niet verwijderd.');}catch(e){message(e.message)}};
 if(tool&&!example){const info=document.querySelector('.save-help-body');if(info){const note=document.createElement('p');note.innerHTML='<strong>Met Mijn werkmap</strong> bewaart Bewaar alles de hele Gereedschapskist. Exporteren maakt een losse kopie; Open werkmap herstelt je complete werkruimte.';info.prepend(note);}}
 render();
 }
 window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
 document.addEventListener('DOMContentLoaded',mount,{once:true});
 // All ordinary save buttons share the same workspace operation. Export remains explicit.
 document.addEventListener('click',e=>{const id=e.target.closest('button')?.id;if(!adapter||example||id!==adapter.saveId)return;e.preventDefault();e.stopImmediatePropagation();backup();},true);
 return {suiteReady:allReady,choose,startNew,continueWork,adapterReady,allCheck:()=>adapter?.check?.(),allRestore:s=>adapter.restore(s),allReset:()=>{},allAccess,allInfo:async()=>{await ready;return {revision,name:root?.name};},allRead:()=>adapter?.read()??null,allLoad:file=>adapter.load(file),ready,register,save,exportFile,readContacts,get name(){return root?.name||''},get active(){return !!root&&!example},get busy(){return busy},load};
})();
