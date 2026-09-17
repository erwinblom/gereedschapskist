// Projects follow the folders the user opens; no prescribed names or workflow.
let selectedProject='all';
try { selectedProject=localStorage.getItem('mw-project')||'all'; } catch {}
function projectRoot(path,name=selectedProject){if(name==='all')return '';return path===name||path.startsWith(name+'/')?name:null;}
function projectIncludes(path){return selectedProject==='all'||projectRoot(path)!==null;}
function projectFiles(){return files.filter(f=>projectIncludes(f.relativePath));}
function projectTreePath(path){return path;}
function rememberProject(){try{localStorage.setItem('mw-folders-'+selectedProject,JSON.stringify([...expandedFolders]));if(activeFile&&projectIncludes(activeFile.relativePath))localStorage.setItem('mw-document-'+selectedProject,activeFile.relativePath);}catch{}}
function projectChoices(){const roots=directoryHandles.map(h=>h.name);return [...new Set([...roots,...[...folderHandlesByPath.keys()].filter(p=>roots.some(r=>p.startsWith(r+'/')&&!p.slice(r.length+1).includes('/')))])];}
function projectStartPath(paths, project, saved){
 if(project==='all')return '';
 return saved&&(saved===project||saved.startsWith(project+'/'))&&paths.includes(saved)?saved:project+'/Inbox';
}
function defaultStartPath(){let saved;try{saved=localStorage.getItem('mw-start-'+selectedProject);}catch{}return projectStartPath([...folderHandlesByPath.keys()],selectedProject,saved);}
function updateProjectControls(){
 const select=document.getElementById('projectSelect');if(!select)return;
 const choices=projectChoices();if(choices.length&&!choices.includes(selectedProject))selectedProject='all';
 select.replaceChildren(new Option('Alle bestanden','all'),...choices.map(p=>{const name=p.split('/').pop();const duplicate=choices.filter(other=>other.split('/').pop()===name).length>1;const label=directoryHandles.some(h=>h.name===p)?name+' — alles':duplicate?name+' ('+p.split('/')[0]+')':name;return new Option(label,p)}));select.value=selectedProject;
 document.getElementById('sidebarProjectName').textContent=selectedProject==='all'?'Alle bestanden':selectedProject.split('/').pop();
 for(const id of ['previousProject','nextProject'])document.getElementById(id).disabled=!choices.length;
 const target=document.getElementById('newItemTarget'),previous=target.value;
 const start=defaultStartPath();
 const paths=[...new Set([...(start?[start]:[]),...[...folderHandlesByPath.keys()].filter(projectIncludes)])].sort((a,b)=>a.localeCompare(b,'nl'));
 target.replaceChildren(...paths.map(p=>new Option(selectedProject==='all'?p:(p===selectedProject?'Hoofdmap':p.slice(selectedProject.length+1)),p)));if(start)target.value=start;else if(paths.includes(previous))target.value=previous;
 document.getElementById('rememberDestinationLabel').hidden=selectedProject==='all';
 try{document.getElementById('saveStartFolder').checked=localStorage.getItem('mw-start-'+selectedProject)===target.value;}catch{}
 document.getElementById('newItemTargetLabel').hidden=!paths.length;
 for(const id of ['newFileBtn','newFolderBtn'])document.getElementById(id).disabled=!paths.length;
}
async function switchProject(name){
 if(name===selectedProject)return;
 if(wysiwygDirty&&!confirm('Je hebt niet-opgeslagen wijzigingen. Weggooien en van project wisselen?')){updateProjectControls();return;}
 rememberProject();selectedProject=name;try{localStorage.setItem('mw-project',name);}catch{}
 activeFile=null;activeFileIndex=null;isEditMode=false;wysiwygDirty=false;currentRawContent='';originalRawContent='';expandedFolders.clear();
 try{for(const p of JSON.parse(localStorage.getItem('mw-folders-'+name)||'[]'))expandedFolders.add(p);}catch{}
 if(name!=='all')expandedFolders.add(name);
 document.getElementById('content').classList.remove('editing');
 document.getElementById('content').innerHTML='<div class="welcome"><h2>Kies je document.</h2><p>Open links een bestand om verder te werken.</p></div>';
 closeSearchPalette();renderFileList();restoreLastOpenFile();
}
function stepProject(direction){const choices=['all',...projectChoices()],index=choices.indexOf(selectedProject);return switchProject(choices[(index+direction+choices.length)%choices.length]);}
function moveProjectRoot(path){if(selectedProject!=='all'&&projectIncludes(path))return selectedProject;return directoryHandles.find(h=>path.startsWith(h.name+'/'))?.name||path.split('/')[0];}
function moveDestinationPaths(paths,source,root,outside=false,query=''){const term=query.trim().toLocaleLowerCase('nl');return paths.filter(p=>p!==source&&(outside||p===root||p.startsWith(root+'/'))&&(!term||p.toLocaleLowerCase('nl').includes(term))).sort((a,b)=>a.localeCompare(b,'nl'));}
function newFileProjectCode(){return '';}
window.addEventListener('pagehide',rememberProject);

window.addEventListener('DOMContentLoaded',()=>{
document.getElementById('newMenu').ontoggle=event=>{if(event.target.open)updateProjectControls();};
document.getElementById('newItemTarget').onchange=()=>{const target=document.getElementById('newItemTarget');try{document.getElementById('saveStartFolder').checked=localStorage.getItem('mw-start-'+selectedProject)===target.value;}catch{document.getElementById('saveStartFolder').checked=false;}};
document.getElementById('saveStartFolder').onchange=event=>{const path=document.getElementById('newItemTarget').value;if(selectedProject==='all'||!path)return;try{if(event.target.checked)localStorage.setItem('mw-start-'+selectedProject,path);else localStorage.removeItem('mw-start-'+selectedProject);}catch{event.target.checked=false;showNotification('De bestemming kon niet worden onthouden in deze browser.','error');}};

});
