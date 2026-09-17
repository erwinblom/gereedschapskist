// Links retain an exact document path in Markdown; the editor shows their readable label.
function internalLinkTitle(file, contents) {
 const text=contents?.get(file.relativePath)||'';
 return text.match(/^#\s+(.+)$/m)?.[1]?.trim() || file.name.replace(/\.md$/i,'');
}
function internalLinkCandidates(list, current, root, query, all, contents) {
 const terms=query.trim().toLocaleLowerCase('nl').split(/\s+/).filter(Boolean);
 return list.filter(f=>/\.md$/i.test(f.name)&&f.relativePath!==current)
 .filter(f=>all||!root||f.relativePath.startsWith(root+'/'))
 .map(file=>({file,title:internalLinkTitle(file,contents),folder:file.relativePath.split('/').slice(0,-1).join('/')}))
 .filter(row=>terms.every(term=>(row.title+' '+row.file.name+' '+row.folder).toLocaleLowerCase('nl').includes(term)))
 .sort((a,b)=>a.title.localeCompare(b.title,'nl')||a.folder.localeCompare(b.folder,'nl'));
}
function internalLinkMarkup(target,label) {
 if(!target||!label.trim()||/[\[\]|\r\n]/.test(label))throw Error('Gebruik linktekst zonder vierkante haakjes, verticale strepen of enters.');
 return '[['+target.split('/').map(encodeURIComponent).join('/')+'|'+label.trim()+']]';
}
function resolveInternalDocument(target,list) {
 const raw=target.trim();let decoded=raw;try{decoded=decodeURIComponent(raw);}catch{}
 const withoutExt=value=>value.replace(/\.md$/i,'');
 // Full, case-sensitive paths take precedence over ambiguous names and suffixes.
 for(const value of [raw,decoded]){const exact=list.find(f=>f.relativePath===value||withoutExt(f.relativePath)===value);if(exact)return exact;}
 const values=[raw,decoded].map(v=>withoutExt(v).toLocaleLowerCase('nl'));
 const matches=list.filter(f=>values.some(v=>withoutExt(f.name).toLocaleLowerCase('nl')===v||withoutExt(f.relativePath).toLocaleLowerCase('nl')===v||withoutExt(f.relativePath).toLocaleLowerCase('nl').endsWith('/'+v)));
 return matches.length===1?matches[0]:null;
}
function renderInternalLinks(root,editing=false){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];let node;
 while(node=walker.nextNode())if(!node.parentElement?.closest('a,code,pre,[data-internal-target]')&&node.textContent.includes('[['))nodes.push(node);
 for(const text of nodes){
  const pattern=/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;let m,last=0;const fragment=document.createDocumentFragment();
  while((m=pattern.exec(text.textContent))){
   fragment.append(document.createTextNode(text.textContent.slice(last,m.index)));
   const target=m[1].trim(),label=m[2]||target,file=resolveInternalDocument(target,files);
   const link=document.createElement(editing?'span':file?'a':'span');
   link.className='wikilink'+(!file?' broken':'');link.textContent=label;link.title=file?file.relativePath:'Document niet gevonden of naam niet uniek: '+target;
   if(editing){link.dataset.internalTarget=target;link.contentEditable='false';}
   else if(file){link.dataset.wikiTarget=String(files.indexOf(file));link.tabIndex=0;link.setAttribute('role','link');}
   fragment.append(link);last=pattern.lastIndex;
  }
  if(last){fragment.append(document.createTextNode(text.textContent.slice(last)));text.replaceWith(fragment);}
 }
}
function openInternalLinkDialog(){
 const editor=document.getElementById('wysiwygEditor');if(!editor||!activeFile)return;
 const selection=window.getSelection(),inside=selection?.rangeCount&&editor.contains(selection.getRangeAt(0).commonAncestorContainer);
 const savedRange=inside?selection.getRangeAt(0).cloneRange():null;
 const selectedText=inside&&!selection.isCollapsed?selection.toString():'';
 const originalHTML=editor.innerHTML,sourcePath=activeFile.relativePath,root=moveProjectRoot(sourcePath);
 const dialog=document.createElement('dialog');dialog.className='internal-link-dialog';dialog.setAttribute('aria-labelledby','internalLinkTitle');
 dialog.innerHTML=`<form><h2 id="internalLinkTitle">Link naar document</h2><p>Verwijs naar een ander document in je Schrijfkamer. Klik tijdens het lezen op de link om dat document te openen.</p>
 <label for="internalLinkSearch">Zoek een document</label><input id="internalLinkSearch" type="search" placeholder="Zoek op titel" autocomplete="off">
 <label class="internal-link-scope"><input id="internalLinkAll" type="checkbox"> Zoek ook buiten dit project</label>
 <fieldset><legend>Kies het document</legend><div id="internalLinkResults" class="internal-link-results"></div></fieldset>
 <p id="internalLinkCount" role="status"></p><label for="internalLinkLabel">Tekst van de link</label><input id="internalLinkLabel" type="text" required>
 <p id="internalLinkError" role="alert"></p><footer><button type="button" id="internalLinkCancel">Annuleren</button><button type="submit" id="internalLinkSubmit" disabled>Link invoegen</button></footer></form>`;
 document.body.append(dialog);const $=id=>dialog.querySelector('#'+id);let chosen=null,labelEdited=!!selectedText;
 $('internalLinkLabel').value=selectedText;
 $('internalLinkLabel').oninput=()=>{labelEdited=true;};
 function refresh(){
  const rows=internalLinkCandidates(files,sourcePath,root,$('internalLinkSearch').value,$('internalLinkAll').checked,fileContents);
  chosen=null;$('internalLinkSubmit').disabled=true;$('internalLinkResults').replaceChildren();
  $('internalLinkCount').textContent=rows.length?rows.length+' documenten gevonden'+(rows.length>100?' · verfijn je zoekopdracht voor meer resultaten.':'.'):'Geen documenten gevonden. Probeer een andere titel of zoek buiten dit project.';
  for(const row of rows.slice(0,100)){
   const label=document.createElement('label'),radio=document.createElement('input'),text=document.createElement('span'),title=document.createElement('strong'),folder=document.createElement('small');
   radio.type='radio';radio.name='internal-document';radio.value=row.file.relativePath;title.textContent=row.title;folder.textContent=row.folder;text.append(title,folder);label.append(radio,text);
   radio.onchange=()=>{chosen=row.file;if(!labelEdited)$('internalLinkLabel').value=row.title.replace(/[\[\]]/g,'').replace(/\|/g,'–');$('internalLinkSubmit').disabled=false;};
   $('internalLinkResults').append(label);
  }
 }
 $('internalLinkSearch').oninput=refresh;$('internalLinkAll').onchange=refresh;$('internalLinkCancel').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{if(dialog.open)return;dialog.remove();if(editor.isConnected){editor.focus();if(savedRange&&editor.innerHTML===originalHTML){selection.removeAllRanges();selection.addRange(savedRange);}}});
 dialog.querySelector('form').onsubmit=event=>{
  event.preventDefault();try{
   if(!chosen||!files.some(f=>f===chosen))throw Error('Kies opnieuw een beschikbaar document.');
   if(!editor.isConnected||activeFile?.relativePath!==sourcePath||editor.innerHTML!==originalHTML)throw Error('Het document is intussen gewijzigd. Sluit dit venster en voeg de link opnieuw in.');
   const markup=internalLinkMarkup(chosen.relativePath,$('internalLinkLabel').value);
   const match=markup.match(/^\[\[([^|]+)\|([\s\S]+)\]\]$/);const link=document.createElement('span');link.className='wikilink';link.dataset.internalTarget=match[1];link.contentEditable='false';link.textContent=match[2];link.title=chosen.relativePath;
   // A modal dialog makes the editor inert. Close it before restoring focus and selection.
   dialog.close();
   editor.focus();selection.removeAllRanges();const range=savedRange||document.createRange();if(!savedRange){range.selectNodeContents(editor);range.collapse(false);}selection.addRange(range);
   if(!document.execCommand('insertHTML',false,link.outerHTML))throw Error('Invoegen is niet gelukt. Probeer het opnieuw.');
   wysiwygDirty=true;updateWysiwygModifiedState();
  }catch(error){if(!dialog.open)dialog.showModal();$('internalLinkError').textContent=error.message;}
 };
 refresh();dialog.showModal();$('internalLinkSearch').focus();
}
