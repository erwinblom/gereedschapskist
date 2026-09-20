const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../app/Apps/Werkbank/Onderdelen/app.js'),'utf8');
const save=source.slice(source.indexOf('        async function saveFile()'),source.indexOf('        function toggleSidebar()',source.indexOf('        async function saveFile()')));
async function scenario({virtual=false,external=false,denied=false,fail=false,reader=false}={}){
 let disk=external?'extern':'oud',workspaceWrites=0,backups=[],notices=[];
 const elements={wysiwygEditor:reader?null:{},editorModified:{},'wm-message':{}};
 const file={name:'test.md',relativePath:'Project/Inbox/test.md',folderName:'Project',isVirtual:virtual,getFile:async()=>({text:async()=>disk})};
 const c={window:{Werkmap:{active:true}},Werkmap:{save:async()=>{workspaceWrites++;return true;}},activeFile:file,currentRawContent:'oud',originalRawContent:'oud',wysiwygDirty:true,
 document:{getElementById:id=>elements[id]},getWysiwygMarkdown:()=> 'nieuw',directoryHandles:[{name:'Project'}],verifyPermission:async()=>!denied,
 folderHandlesByPath:new Map([['Project/Inbox',{name:'Inbox'}]]),fileContents:new Map(),updateWysiwygModifiedState:()=>{},Werkstatus:{opened:()=>{},written:()=>{}},showNotification:(s)=>notices.push(s),console:{error:()=>{}},
 replaceWithRecovery:async(f,parent,old,next)=>{assert.equal(parent.name,'Inbox');backups.push(old);if(fail)throw Error('schijf vol');disk=next;}};
 vm.createContext(c);vm.runInContext(save,c);const ok=await c.saveFile();return {ok,disk,workspaceWrites,backups,notices,c,elements};
}
(async()=>{
 let r=await scenario();assert.equal(r.disk,'nieuw');assert.equal(r.workspaceWrites,0);assert.deepEqual(r.backups,['oud']);assert.equal(r.c.wysiwygDirty,false);assert.match(r.elements['wm-message'].textContent,/Project\/Inbox\/test.md/);
 r=await scenario({virtual:true});assert.equal(r.workspaceWrites,1);
 r=await scenario({external:true});assert.equal(r.disk,'extern');assert.equal(r.c.wysiwygDirty,true);assert.equal(r.backups.length,0);
 r=await scenario({denied:true});assert.equal(r.disk,'oud');assert.equal(r.c.wysiwygDirty,true);
 r=await scenario({fail:true});assert.equal(r.disk,'oud');assert.equal(r.c.wysiwygDirty,true);assert.match(r.notices[0],/schijf vol/);
 r=await scenario({reader:true});assert.equal(r.ok,true);assert.equal(r.disk,'oud');assert.equal(r.workspaceWrites,0);
 console.log('OK: project writes stay in original folder with workmap connected; loose files use workmap; conflict, denial and failed write retain edits; reader save works; visible destination.');
})().catch(e=>{console.error(e);process.exitCode=1});

const loose=fs.readFileSync(path.join(__dirname,'../app/Apps/Werkbank/Onderdelen/losse-documenten.js'),'utf8');
const connect=loose.slice(loose.indexOf(' async function connectSavedDocument'),loose.indexOf(" document.getElementById('loose-open')"));
async function checkConnection({saved=true,identical=true}={}){
 const looseFile={name:'test.md',isVirtual:true},realFile={name:'test.md',relativePath:'Schrijven/test.md'},dir={name:'Schrijven',isSameEntry:async other=>other===dir},handle={getFile:async()=>({text:async()=> 'bewaarde tekst'})};
 const c={activeFile:looseFile,isEditMode:saved,currentRawContent:identical?'bewaarde tekst':'andere tekst',directoryHandles:[],converterFiles:new Map([['test.md',{content:'bewaarde tekst'}]]),wysiwygDirty:saved,selectedProject:'all',expandedFolders:new Set(),saveDirectoryHandles:async()=>{},saveConverterFiles:()=>{},loadFiles:async()=>{c.files=[looseFile,realFile]},selectFile:async i=>{c.activeFile=c.files[i]},renderFileList:()=>{},toggleEditMode:async()=>{c.isEditMode=!c.isEditMode}};
 vm.createContext(c);vm.runInContext(connect,c);await c.connectSavedDocument('test.md',{dir,handle},saved);
 assert.equal(c.activeFile,realFile);assert.equal(c.directoryHandles.length,1);assert.equal(c.isEditMode,saved);
 assert.equal(c.converterFiles.has('test.md'),!saved&&!identical);
 await c.connectSavedDocument('test.md',{dir,handle},false);assert.equal(c.directoryHandles.length,1);
}
(async()=>{await checkConnection();await checkConnection({saved:false});await checkConnection({saved:false,identical:false});console.log('OK: saved and reopened documents bind to real files; identical loose copy is replaced, differing copy retained; folder does not duplicate.');})().catch(e=>{console.error(e);process.exitCode=1});

// Exercise the actual backup/write/readback code against temporary disk files.
const os=require('node:os'),crypto=require('node:crypto');
function diskDirectory(base){return {getDirectoryHandle:async(name,{create=false}={})=>{const p=path.join(base,name);if(create)fs.mkdirSync(p,{recursive:true});return diskDirectory(p)},getFileHandle:async(name,{create=false}={})=>{const p=path.join(base,name);if(create&&!fs.existsSync(p))fs.writeFileSync(p,'');return {name,getFile:async()=>({text:async()=>fs.readFileSync(p,'utf8')}),createWritable:async()=>{let text;return {write:async value=>{text=value},close:async()=>fs.writeFileSync(p,text)}}}}};}
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'schrijven-opslag-'));
 try{const dir=diskDirectory(temp),file=await dir.getFileHandle('test.md',{create:true});fs.writeFileSync(path.join(temp,'test.md'),'eerste versie');
 const c={crypto:crypto.webcrypto,TextEncoder,Uint8Array,Date,Error};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/Apps/Werkbank/Onderdelen/recovery.js'),'utf8'),c);
 await c.replaceWithRecovery(file,dir,'eerste versie','tweede versie');assert.equal(fs.readFileSync(path.join(temp,'test.md'),'utf8'),'tweede versie');
 const sub=fs.readdirSync(path.join(temp,'.werkbank-herstel'))[0],b=path.join(temp,'.werkbank-herstel',sub);assert.equal(fs.readFileSync(path.join(b,fs.readdirSync(b)[0]),'utf8'),'eerste versie');
 await assert.rejects(c.replaceWithRecovery(file,dir,'eerste versie','derde versie'),/intussen gewijzigd/);assert.equal(fs.readFileSync(path.join(temp,'test.md'),'utf8'),'tweede versie');
 console.log('OK: actual temporary disk write, readback and recovery copy; external conflict leaves disk untouched.');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
