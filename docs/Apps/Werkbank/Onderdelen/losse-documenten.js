function downloadLooseMarkdown(name,content){const u=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
// Open documents without requiring access to an entire folder.
(()=>{
 const bar=document.createElement('div');bar.className='loose-documents';
 bar.innerHTML='<button id="loose-open">Bestand openen</button><button id="loose-new">Nieuw document</button><button id="loose-save" disabled>Bewaar bestand</button><span>Open een Markdown-bestand of kies een projectmap. Bewaar zelf een bestand op je computer.</span><input type="file" id="loose-input" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden>';
 document.querySelector('.brandbar').after(bar);
 const style=document.createElement('style');style.textContent='.loose-documents{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:14px 32px;border-bottom:1px solid #ccc}.loose-documents button{padding:10px 12px;border:1px solid #111;background:#fff;font:14px Arial;cursor:pointer}.loose-documents button:disabled{opacity:.5;cursor:default}.loose-documents span{font:13px/1.5 Arial;color:#555;max-width:460px}.loose-documents button:focus-visible{outline:3px solid #e32720;outline-offset:2px}@media(max-width:600px){.loose-documents{padding:12px 16px}}@media print{.loose-documents{display:none}}';document.head.append(style);
 const picker=document.getElementById('loose-input');let busy=false;
 const canSwitch=()=>!wysiwygDirty||confirm('Je hebt onbewaarde wijzigingen. Eerst je document bewaren? Kies Annuleren om terug te gaan. Doorgaan zonder bewaren?');
 async function addLoose(name,content){
  let chosen=name,n=2;while(converterFiles.has(chosen)){chosen=name.replace(/(\.[^.]+)?$/,(_,ext)=>' ('+(n++)+')'+(ext||''));}
  converterFiles.set(chosen,{name:chosen,content,relativePath:'converter/'+chosen});saveConverterFiles();selectedProject='all';wysiwygDirty=false;isEditMode=false;
  await loadFiles();expandedFolders.add('converter');renderFileList();await selectFile(files.findIndex(f=>f.isVirtual&&f.name===chosen));
  showNotification('Document geopend. Gebruik Bewaar bestand om een eigen bestand te bewaren.','success');
 }
 document.getElementById('loose-open').onclick=()=>{if(canSwitch())picker.click();};
 picker.onchange=async()=>{const file=picker.files[0];picker.value='';if(!file||busy)return;busy=true;try{if(file.size>2000000)throw Error('Kies een tekstbestand van maximaal 2 MB.');if(!/\.(md|markdown|txt)$/i.test(file.name))throw Error('Kies een Markdown- of tekstbestand.');const text=await file.text();if(text.includes('\u0000'))throw Error('Dit lijkt geen tekstbestand.');await addLoose(file.name,text);}catch(e){showNotification(e.message,'error');}finally{busy=false;}};
 document.getElementById('loose-new').onclick=async()=>{if(busy||!canSwitch())return;busy=true;try{await addLoose('Nieuw document.md','# Nieuw document\n\nBegin hier met schrijven.\n');}finally{busy=false;}};
 document.getElementById('loose-save').onclick=async()=>{if(!activeFile)return;if(isEditMode&&activeFile.isVirtual){await saveFile();return;}downloadLooseMarkdown(activeFile.name,isEditMode?getWysiwygMarkdown():currentRawContent);showNotification('Document gedownload. Controleer je downloadmap.','success');};
 new MutationObserver(()=>{document.getElementById('loose-save').disabled=!activeFile;}).observe(document.getElementById('content'),{childList:true,subtree:true});
})();
