// Backups stay beside the document, outside the normal file list.
async function recoveryFolder(parent, name, create = false) {
 const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(name))), b => b.toString(16).padStart(2, '0')).join('');
 const root = await parent.getDirectoryHandle('.werkbank-herstel', {create});
 return root.getDirectoryHandle(hash, {create});
}
async function preserveVersion(file, parent, expected) {
 if (await (await file.getFile()).text() !== expected) throw Error('Het bestand is intussen gewijzigd. Je tekst blijft behouden.');
 const folder = await recoveryFolder(parent, file.name, true);
 const name = new Date().toISOString().replace(/[:.]/g, '-') + '_' + crypto.randomUUID() + '.md';
 const copy = await folder.getFileHandle(name, {create:true});
 const writer = await copy.createWritable();
 await writer.write(expected); await writer.close();
 if (await (await copy.getFile()).text() !== expected) throw Error('Herstelkopie niet bevestigd. Het origineel is niet overschreven.');
}
async function replaceWithRecovery(file, parent, expected, next) {
 if (next === expected) return;
 if (!parent) throw Error('Open de documentmap opnieuw om veilig op te slaan.');
 await preserveVersion(file, parent, expected);
 if (await (await file.getFile()).text() !== expected) throw Error('Het bestand is intussen gewijzigd. Het origineel is niet overschreven.');
 const writer = await file.createWritable();
 await writer.write(next); await writer.close();
 if (await (await file.getFile()).text() !== next) throw Error('Opslag niet bevestigd. De vorige versie staat in de herstelkopieën.');
}
async function openRecoveryDialog() {
 const file = activeFile;
 if (!file || file.isVirtual) return;
 if (wysiwygDirty) { showNotification('Sla je bewerking eerst op of annuleer die voordat je een versie herstelt.', 'error'); return; }
 const parent = folderHandlesByPath.get(file.relativePath.split('/').slice(0,-1).join('/'));
 const dialog = document.createElement('dialog'); dialog.className = 'file-dialog';
 dialog.innerHTML = '<h2>Vorige versie herstellen</h2><p>Kies een herstelkopie. Bij terugzetten bewaren we eerst de huidige versie.</p><label>Versie<select aria-label="Herstelversie"></select></label><textarea readonly aria-label="Voorbeeld van herstelkopie" style="display:block;width:100%;min-height:35vh;margin:12px 0"></textarea><p role="status"></p><button type="button" data-close>Sluiten</button> <button type="button" data-restore disabled>Deze versie terugzetten</button>';
 const select=dialog.querySelector('select'),preview=dialog.querySelector('textarea'),status=dialog.querySelector('[role="status"]'),restore=dialog.querySelector('[data-restore]');
 let versions=[],original=await (await file.getFile()).text(),chosen='';
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
 async function choose(){restore.disabled=true;const selected=select.value;try{const value=await (await versions[Number(selected)].getFile()).text();if(select.value!==selected)return;chosen=value;preview.value=value;restore.disabled=false;}catch{status.textContent='Deze kopie kon niet worden gelezen.';}}
 select.onchange=choose;
 try{const folder=await recoveryFolder(parent,file.name);for await(const entry of folder.values())if(entry.kind==='file'&&entry.name.endsWith('.md'))versions.push(entry);versions.sort((a,b)=>b.name.localeCompare(a.name));select.replaceChildren(...versions.map((entry,index)=>new Option(entry.name.slice(0,10)+' '+entry.name.slice(11,19).replace(/-/g,':'),String(index))));if(versions.length)await choose();else status.textContent='Nog geen herstelkopieën. Die ontstaan bij het opslaan van wijzigingen.';}catch(error){status.textContent=error.name==='NotFoundError'?'Nog geen herstelkopieën. Die ontstaan bij het opslaan van wijzigingen.':'Herstelkopieën zijn niet bereikbaar. Open de map opnieuw.';}
 restore.onclick=async()=>{restore.disabled=true;select.disabled=true;try{if(wysiwygDirty)throw Error('Er zijn onopgeslagen wijzigingen. Sluit dit venster eerst.');if(!await verifyPermission(parent,'readwrite'))throw Error('Geef eerst schrijfrechten voor deze map.');await replaceWithRecovery(file,parent,original,chosen);fileContents.set(file.relativePath,chosen);if(activeFile===file){currentRawContent=originalRawContent=chosen;isEditMode=false;wysiwygDirty=false;document.getElementById('content').classList.remove('editing');renderFileView(chosen);}dialog.close();showNotification('Vorige versie hersteld. De vervangen versie is ook bewaard.','success');}catch(error){status.textContent=error.message;}finally{restore.disabled=false;select.disabled=false;}};
}
