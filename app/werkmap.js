'use strict';
// One directory handle per installation/origin; files remain ordinary user files.
window.Werkmap=(()=>{
 const catalog={Werkbank:['Schrijven',null],Ping:['Factureren','factureren'],Projectbord:['Doen','doen'],Bronnenkast:['Verzamelen','verzamelen'],Uren:['Uren schrijven','uren-schrijven'],Contacten:['Contact houden','contact-houden'],Publicatieplanner:['Plannen','plannen'],Offerte:['Offreren','offreren'],Kasboek:['Boekhouden','boekhouden']};
 const tool=document.querySelector('script[data-tool]')?.dataset.tool,example=window.GereedschapskistMode?.example;
 const supported='showDirectoryPicker' in window&&!!window.indexedDB,dbName='gereedschapskist-werkmap-v1';
 let root=null,revision=null,db=null,adapter=null,box=null,busy=false;const known=new Map();
 const $=id=>document.getElementById('wm-'+id);
 function message(text){if($('message'))$('message').textContent=text;}
 function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 function setting(action,value){return new Promise((resolve,reject)=>{const tx=db.transaction('settings',action==='get'?'readonly':'readwrite'),s=tx.objectStore('settings'),r=action==='get'?s.get('root'):action==='delete'?s.delete('root'):s.put(value,'root');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Mapkeuze niet bewaard.'));});}
 const ready=(async()=>{if(!supported||example)return;try{db=await database();const saved=await setting('get');root=saved?.handle||null;revision=saved?.revision||null;}catch{message('De mapkeuze kon niet worden onthouden. Kies de map opnieuw.');}})();
 async function permission(handle){if(await handle.queryPermission({mode:'readwrite'})!=='granted'&&await handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('Geen toegang tot je werkmap. Geef toestemming of gebruik Download kopie.');}
 async function checkRoot(){if(!root)throw Error('Kies eerst een werkmap.');if(db){const saved=await setting('get');if(saved?.revision!==revision)throw Error('De werkmap is in een ander venster veranderd. Herlaad deze tool voordat je verdergaat.');}}
 async function folder(){await checkRoot();await permission(root);return root.getDirectoryHandle(catalog[tool][0],{create:true});}
 async function existing(dir,name){try{return await dir.getFileHandle(name);}catch(e){if(e.name==='NotFoundError')return null;throw e;}}
 function filename(){return 'gereedschapskist-'+catalog[tool][1]+'.json';}
 function safeName(name){if(typeof name!=='string'||!name.trim()||name.length>160||/[\\/:*?"<>|\u0000-\u001f]/.test(name)||name==='.'||name==='..')throw Error('Gebruik een korte bestandsnaam zonder schuine strepen of bijzondere tekens.');return name.trim();}
 async function choose(){if(busy)return;busy=true;try{const handle=await showDirectoryPicker({id:'gereedschapskist',mode:'readwrite'});await permission(handle);for(const [name]of Object.values(catalog))await handle.getDirectoryHandle(name,{create:true});const rev=crypto.randomUUID();if(db)await setting('put',{handle,revision:rev});root=handle;revision=rev;known.clear();render();message('Werkmap gekozen. Er zijn geen bestaande documenten verplaatst. Open je bestaande bestand om het mee te nemen, en kies Bewaar bestand.');}catch(e){if(e.name!=='AbortError')message('Map niet ingesteld: '+e.message);}finally{busy=false;}}
 async function load(){if(busy)return;busy=true;try{await ready;const dir=await folder();let name=filename();if(tool==='Werkbank'){
  const names=[];for await(const h of dir.values())if(h.kind==='file'&&/\.(md|markdown|txt)$/i.test(h.name))names.push(h.name);
  names.sort((a,b)=>a.localeCompare(b,'nl'));if(!names.length)throw Error('De map Schrijven is nog leeg. Maak een nieuw document en bewaar het.');
  const dialog=document.createElement('dialog');dialog.className='wm-dialog';const title=document.createElement('h2');title.textContent='Document uit je werkmap';const select=document.createElement('select');select.setAttribute('aria-label','Document');for(const n of names)select.add(new Option(n,n));const cancel=document.createElement('button');cancel.textContent='Annuleren';const open=document.createElement('button');open.textContent='Document openen';dialog.append(title,select,cancel,open);document.body.append(dialog);
  name=await new Promise(resolve=>{cancel.onclick=()=>dialog.close();dialog.oncancel=e=>{e.preventDefault();dialog.close()};dialog.onclose=()=>resolve(null);open.onclick=()=>{resolve(select.value);dialog.close()};dialog.showModal()});dialog.remove();if(!name)return;
 }
 const handle=await existing(dir,name);if(!handle)throw Error('Nog geen bestand in deze toolmap. Open een bestaand bestand of begin nieuw en kies Bewaar bestand.');
 const file=await handle.getFile();if(file.size>20000000)throw Error('Het bestand is groter dan 20 MB.');const raw=await file.text();
 if(await adapter.load(file)){known.set(name,raw);adapter.bound?.(name);Werkstatus.opened(root.name+'/'+catalog[tool][0]+'/'+name);message('Geopend uit je werkmap. Bewaar bestand schrijft voortaan hier terug.');}
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
  if(JSON.stringify(adapter.read())===signature){await adapter.saved?.(name);Werkstatus.opened(root.name+'/'+catalog[tool][0]+'/'+name);Werkstatus.written();message('Opgeslagen in '+root.name+'/'+catalog[tool][0]+'/'+name+'.');}
  else message('De eerdere versie is opgeslagen. Er zijn ondertussen nieuwe wijzigingen; bewaar opnieuw.');
  return true;
 }catch(e){message('Niet opgeslagen: '+e.message);return false;}finally{busy=false;}}

 async function exportFile(blob,name){
  await ready;if(!root||example)return false;if(busy){message('Er loopt nog een bestandsactie. Probeer deze export daarna opnieuw.');return false;}busy=true;if(box)box.open=true;
  try{const dir=await(await folder()).getDirectoryHandle('Exports',{create:true});name=safeName(name);if(await existing(dir,name))name=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8)+'-'+name;
   const file=await dir.getFileHandle(name,{create:true}),stream=await file.createWritable({mode:'exclusive'});try{await stream.write(blob);await stream.close()}catch(e){try{await stream.abort()}catch{}throw e;}
   if((await file.getFile()).size!==blob.size)throw Error('Bestandsgrootte niet bevestigd.');
   message('Export opgeslagen in '+root.name+'/'+catalog[tool][0]+'/Exports/'+name+'.');return true;
  }catch(e){message('Export niet opgeslagen: '+e.message);return false;}finally{busy=false;}
 }

 function render(){if(!box)return;if(!tool){for(const link of document.querySelectorAll('.grid a')){if(!link.dataset.originalHref)link.dataset.originalHref=link.getAttribute('href');const url=new URL(link.dataset.originalHref,location.href);if(root)url.searchParams.set('werkruimte','eigen');link.href=root?url.href:link.dataset.originalHref;}}$('name').textContent=example?'Voorbeelden blijven buiten je eigen werkmap':root?'Werkmap: '+root.name+(tool?' / '+catalog[tool][0]:''):'Mijn werkmap';$('choose').hidden=!supported||example;$('choose').textContent=root?'Andere werkmap kiezen':'Kies werkmap';$('forget').hidden=!root;$('open').hidden=!root||!adapter;$('copy').hidden=!root||!adapter;$('hint').textContent=example?'Je kunt voorbeelden downloaden om te oefenen.':!supported?'Deze browser biedt geen maptoegang. Bestand openen en downloaden blijven beschikbaar.':root?'Bewaar bestand schrijft naar deze map. Open een bestaand werkmapbestand eerst via Open uit werkmap. CSV, bonnen en overdrachten komen in Exports. PDF’s kies je zelf in het afdrukvenster.':'Kies één map voor je werk. De negen submappen worden aangemaakt. Zonder werkmap blijft Bewaar bestand een download.';const loose=document.querySelector('.loose-documents span');if(loose)loose.textContent=root?'Bewaar bestand schrijft naar Schrijven in je werkmap. Download kopie maakt een losse download.':'Bewaar bestand maakt een download. Opslaan in map werkt alleen na Map openen.';}
 function register(config){adapter=config;render();}
 async function mount(){await ready;const style=document.createElement('style');style.textContent='.werkmap{margin:14px 32px;padding:14px 16px;border:1px solid #bbb;border-left:4px solid #e32720;font:14px/1.5 Arial,sans-serif;background:#fff;color:#111}.shell .werkmap{margin:0 0 20px}.werkmap summary{font-weight:700;cursor:pointer}.werkmap p{margin:8px 0;max-width:850px}.werkmap .wm-actions{display:flex;flex-wrap:wrap;gap:8px}.werkmap button,.wm-dialog button,.wm-dialog select{font:14px Arial;padding:10px;border:1px solid #111;background:#fff;color:#111;cursor:pointer;min-height:42px}.werkmap button:focus-visible,.wm-dialog :focus-visible{outline:3px solid #e32720;outline-offset:3px}.werkmap [hidden]{display:none!important}.wm-dialog{max-width:calc(100% - 32px);border:2px solid #111}.wm-dialog select{display:block;width:100%;margin:15px 0}.wm-dialog::backdrop{background:#0007}#wm-message{overflow-wrap:anywhere}@media(max-width:600px){.werkmap{margin:12px 16px}}@media print{.werkmap{display:none}}';document.head.append(style);
 box=document.createElement('details');box.className='werkmap';box.id='werkmap';box.open=!tool||!!root;box.innerHTML='<summary id="wm-name">Mijn werkmap</summary><p id="wm-hint"></p><div class="wm-actions"><button type="button" id="wm-choose">Kies werkmap</button><button type="button" id="wm-open" hidden>Open uit werkmap</button><button type="button" id="wm-copy" hidden>Download kopie</button><button type="button" id="wm-forget" hidden>Werkmap loskoppelen</button></div><p id="wm-message" role="status"></p>';
 const home=document.querySelector('.titlebar');if(!tool&&home)home.after(box);else(document.getElementById('file-status')||document.querySelector('.brandbar,header')).after(box);
 $('choose').onclick=choose;$('open').onclick=load;$('copy').onclick=()=>adapter?.download();$('forget').onclick=async()=>{if(busy)return;if(!confirm('Werkmap loskoppelen? Je bestanden blijven staan. Bewaar bestand wordt weer een download.'))return;try{if(db)await setting('delete');root=null;revision=null;known.clear();render();message('Losgekoppeld. Je bestanden zijn niet verwijderd.');}catch(e){message(e.message)}};
 if(tool&&!example){const info=document.querySelector('.save-help-body');if(info){const note=document.createElement('p');note.innerHTML='<strong>Met Mijn werkmap</strong> schrijft Bewaar bestand rechtstreeks naar je gekozen map. De downloadstappen hieronder gelden als je geen werkmap gebruikt. Met Download kopie kun je altijd een losse kopie maken.';info.prepend(note);}}
 render();
 }
 window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
 document.addEventListener('DOMContentLoaded',mount,{once:true});
 // Keep the familiar main button. Download remains an explicit independent action.
 document.addEventListener('click',e=>{const id=e.target.closest('button')?.id;if(!adapter||example||!root||id!==adapter.saveId)return;e.preventDefault();e.stopImmediatePropagation();save();},true);
 return {ready,register,save,exportFile,get active(){return !!root&&!example},get busy(){return busy},load};
})();
