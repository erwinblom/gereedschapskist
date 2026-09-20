function downloadLooseMarkdown(name,content){const u=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();Werkstatus.downloaded(name);setTimeout(()=>URL.revokeObjectURL(u),1000);}
function downloadActiveDocument(){if(activeFile)downloadLooseMarkdown(activeFile.name,isEditMode?getWysiwygMarkdown():currentRawContent);}
// Open documents without requiring access to an entire folder.
(()=>{
 const bar=document.createElement('div');bar.className='loose-documents';
 bar.innerHTML='<button id="loose-new">Nieuw document</button><button id="loose-open">Document openen</button><button id="loose-folder">Map openen</button><button id="loose-save" disabled>Bewaar bestand</button><span>Bewaar bestand maakt een download. Opslaan in map werkt alleen na Map openen.</span><input type="file" id="loose-input" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden>';
 document.querySelector('.brandbar').after(bar);
 const style=document.createElement('style');style.textContent='.loose-documents{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:14px 32px;border-bottom:1px solid #ccc}.loose-documents button{padding:10px 12px;border:1px solid #111;background:#fff;font:14px Arial;cursor:pointer}.loose-documents button:disabled{opacity:.5;cursor:default}.loose-documents span{font:13px/1.5 Arial;color:#555;max-width:460px}.loose-documents button:focus-visible{outline:3px solid #e32720;outline-offset:2px}@media(max-width:600px){.loose-documents{padding:12px 16px}}@media print{.loose-documents{display:none}}';document.head.append(style);
 const picker=document.getElementById('loose-input');let busy=false;const workmapNames=new Map();
 const canSwitch=()=>!wysiwygDirty||confirm('Je hebt onbewaarde wijzigingen. Eerst je document bewaren? Kies Annuleren om terug te gaan. Doorgaan zonder bewaren?');
 async function addLoose(name,content){
  let chosen=name,n=2;while(converterFiles.has(chosen)){chosen=name.replace(/(\.[^.]+)?$/,(_,ext)=>' ('+(n++)+')'+(ext||''));}
  converterFiles.set(chosen,{name:chosen,content,relativePath:'converter/'+chosen});saveConverterFiles();selectedProject='all';wysiwygDirty=false;isEditMode=false;
  await loadFiles();expandedFolders.add('converter');renderFileList();await selectFile(files.findIndex(f=>f.isVirtual&&f.name===chosen));
  showNotification('Document geopend. Gebruik Bewaar bestand om een eigen bestand te bewaren.','success');
 }
 async function connectSavedDocument(name,{dir,handle},saved){
  const wasEditing=isEditMode,previous=activeFile;
  const text=await(await handle.getFile()).text();
  let linked=false;
  for(const folder of directoryHandles)if(await folder.isSameEntry(dir)){linked=true;break;}
  if(!linked){
   if(directoryHandles.some(folder=>folder.name===dir.name))throw Error('Bestand is opgeslagen, maar er is al een andere map met de naam '+dir.name+' gekoppeld. Verwijder die map eerst uit de lijst en kies Open uit werkmap.');
   directoryHandles.push(dir);await saveDirectoryHandles(directoryHandles);
  }
  const removeLoose=previous?.isVirtual && (saved || (previous.name===name && currentRawContent===text));
  selectedProject='all';wysiwygDirty=false;isEditMode=false;
  await loadFiles();
  const index=files.findIndex(file=>!file.isVirtual&&file.relativePath===dir.name+'/'+name);
  if(index<0)throw Error('Bestand is opgeslagen. Open de map opnieuw om het te bekijken.');
  await selectFile(index);
  if(removeLoose){converterFiles.delete(previous.name);saveConverterFiles();files=files.filter(f=>!(f.isVirtual&&f.name===previous.name));activeFileIndex=files.indexOf(activeFile);}
  expandedFolders.add(dir.name);renderFileList();
  if(saved&&wasEditing)await toggleEditMode();
 }
 document.getElementById('loose-open').onclick=()=>{if(canSwitch())picker.click();};
 picker.onchange=async()=>{const file=picker.files[0];picker.value='';if(!file||busy)return;busy=true;try{if(file.size>2000000)throw Error('Kies een tekstbestand van maximaal 2 MB.');if(!/\.(md|markdown|txt)$/i.test(file.name))throw Error('Kies een Markdown- of tekstbestand.');const text=await file.text();if(text.includes('\u0000'))throw Error('Dit lijkt geen tekstbestand.');await addLoose(file.name,text);}catch(e){showNotification(e.message,'error');}finally{busy=false;}};
 document.getElementById('loose-folder').disabled=!('showDirectoryPicker' in window);
 document.getElementById('loose-folder').title='Maptoegang werkt in Chrome en Edge, als je organisatie dit toestaat.';
 document.getElementById('loose-folder').onclick=()=>{if(canSwitch())addFolder(true);};
 document.getElementById('loose-new').onclick=async()=>{if(busy||!canSwitch())return;busy=true;try{await addLoose('Nieuw document.md','# Nieuw document\n\nBegin hier met schrijven.\n');await toggleEditMode();document.getElementById('wysiwygEditor')?.focus();}finally{busy=false;}};
 document.getElementById('loose-save').onclick=async()=>{if(!activeFile)return;if(!activeFile.isVirtual||isEditMode){await saveFile();return;}downloadActiveDocument();};
 new MutationObserver(()=>{document.getElementById('loose-save').disabled=!activeFile;}).observe(document.getElementById('content'),{childList:true,subtree:true});
  Werkmap.register({async restore(s){wysiwygDirty=false;isEditMode=false;directoryHandles=[];folderHandlesByPath.clear();await saveDirectoryHandles([]);fileContents.clear();converterFiles.clear();for(const d of s.documents||[]){if(typeof d.content!=='string'||typeof d.name!=='string')throw Error('Ongeldig document.');let name=d.name,n=2;while(converterFiles.has(name))name=d.name+' ('+(n++)+')';converterFiles.set(name,{name,content:d.content,relativePath:'converter/'+name});}saveConverterFiles();selectedProject='all';await loadFiles();const chosen=(s.documents||[]).find(d=>d.path===s.activeDocument);const index=files.findIndex(f=>f.isVirtual&&f.name===chosen?.name);if(index>=0)await selectFile(index);else if(files.length)await selectFile(0);Werkstatus.opened('Werkmap / Schrijven');},saveId:'loose-save',
  read:()=>activeFile?{name:activeFile.name,content:isEditMode?getWysiwygMarkdown():currentRawContent}:null,
  prepare:()=>{if(busy)throw Error('Wacht tot het document is geopend.');return !!activeFile},
  name:()=>workmapNames.get(activeFile?.relativePath),bound:name=>workmapNames.set(activeFile.relativePath,name),
  ownsSave:()=>!!activeFile&&!activeFile.isVirtual,
  saved:async(name,location)=>{await connectSavedDocument(name,location,true);},
  download:()=>{if(activeFile){downloadLooseMarkdown(activeFile.name,isEditMode?getWysiwygMarkdown():currentRawContent);showNotification('Download gestart. Controleer of je bestand is opgeslagen.','success');}},
  async load(file,location){if(busy||!canSwitch())return false;if(file.size>2000000)throw Error('Kies een document van maximaal 2 MB.');const text=await file.text();if(text.includes('\u0000'))throw Error('Dit lijkt geen tekstbestand.');await connectSavedDocument(file.name,location,false);return true;}
 });
})();

Werkstatus.register(()=>({name:activeFile?.relativePath||'',content:activeFile?(isEditMode?getWysiwygMarkdown():currentRawContent):''}),()=>wysiwygDirty);
