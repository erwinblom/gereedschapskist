'use strict';
(() => {
 const script=document.currentScript,tool=script.dataset.tool,baseKey=script.dataset.key;
 const preferenceKey='gereedschapskist-mode:'+baseKey,examplePrefix='voorbeeld:',query=new URL(location.href).searchParams.get('werkruimte');
 let preference=null,hasOwn=false,unavailable=false;
 try { preference=localStorage.getItem(preferenceKey);hasOwn=localStorage.getItem(baseKey)!==null;
  if(tool==='Werkbank')hasOwn=hasOwn||['mw-project','lastOpenFile','mw-document-'+'all'].some(k=>localStorage.getItem(k)!==null);
 } catch { unavailable=true; }
 const example=query==='voorbeeld'||query!=='eigen'&&preference!=='eigen'&&!hasOwn&&!unavailable;
 const key=k=>example?examplePrefix+k:k;
 const memory=new Map();
 const storage={
  getItem(k){if(memory.has(k))return memory.get(k);try{return localStorage.getItem(key(k));}catch(e){if(!example)throw e;return memory.get(k)??null;}},
  setItem(k,v){try{localStorage.setItem(key(k),v);}catch(e){if(!example)throw e;memory.set(k,String(v));}},
  removeItem(k){try{localStorage.removeItem(key(k));}catch(e){if(!example)throw e;memory.delete(k);}}
 };
 const mode=window.GereedschapskistMode={example,key,storage,redirecting:false,ready:Promise.resolve(),
  forExport:data=>example?{...data,_gereedschapskistExample:true}:data,
  go(target){const u=new URL(location.href);u.searchParams.set('werkruimte',target==='own'?'eigen':'voorbeeld');location.assign(u.href);}
 };
 // A switch never removes or replaces the user's data or its recovery copy.
 try {if(query==='eigen')localStorage.setItem(preferenceKey,'eigen');} catch {}
 if(example&&storage.getItem(baseKey)===null){
  storage.setItem(baseKey,JSON.stringify(GereedschapskistExamples(tool)));
  if(tool==='Werkbank')storage.setItem('mw-document-'+'all','converter/Buurtwerkplaats — projectplan.md');
 }
 // Existing folder handles can be the only trace of an older writing workspace.
 // Inspect database names without opening, altering or deleting the real database.
 if(tool==='Werkbank'&&example&&query!=='voorbeeld'&&!preference){
  mode.ready=(async()=>{try{
   if(!indexedDB.databases)throw Error('No database inventory');
   const databases=await indexedDB.databases();
   if(databases.some(db=>db.name==='MarkdownWerkbankLocalV2')){mode.redirecting=true;mode.go('own');}
  }catch{mode.redirecting=true;mode.go('own');}})();
 }
 const style=document.createElement('style');style.textContent=`
 .example-mode{margin:14px 32px;padding:15px 18px;border:1px solid #111;border-left:5px solid #e32720;background:#fff;color:#111;display:flex;align-items:center;justify-content:space-between;gap:14px;font:15px/1.5 Arial,Helvetica,sans-serif}
 .example-mode strong{display:block;font-size:17px}.example-mode p{margin:3px 0 0;max-width:760px}.example-mode button{font:700 14px/1.4 Arial,sans-serif;min-height:44px;padding:10px 16px;border:1px solid #111;border-radius:0;background:#111;color:#fff;cursor:pointer;flex-shrink:0}
 .example-mode button:focus-visible{outline:3px solid #e32720;outline-offset:3px}.example-mode.own button{background:#fff;color:#111}.example-mode.own{padding:9px 16px;font-size:13px;border-color:#bbb}.example-mode.own strong{font-size:14px}
 [data-legacy-example]{display:none!important}
 @media(max-width:700px){.example-mode{margin:12px 16px;align-items:stretch;flex-direction:column}.example-mode button{white-space:normal}}
 @media print{.example-mode{display:none!important}}
 `;document.head.append(style);
 function mount(){
  const banner=document.createElement('section');banner.className='example-mode'+(example?'':' own');banner.setAttribute('aria-label',example?'Voorbeeldstand':'Eigen werk');
  const text=document.createElement('div'),title=document.createElement('strong'),description=document.createElement('p'),button=document.createElement('button');button.type='button';button.id='workspace-switch';
  title.textContent=example?'Je bekijkt voorbeeldgegevens. Probeer gerust alles uit.':'Mijn eigen werk';
  description.textContent=example?'Buurtwerkplaats De Proeftuin is een fictief project. Je oefent in een aparte werkruimte.': 'Voorbeelden staan apart en veranderen je eigen gegevens niet.';
  button.textContent=example?(hasOwn||preference==='eigen'?'Terug naar mijn eigen werk':'Begin met mijn eigen werk'):'Bekijk voorbeelden';
  button.onclick=()=>mode.go(example?'own':'example');
  text.append(title,description);banner.append(text,button);
  const header=document.querySelector('.brandbar,header');if(header)header.after(banner);else document.body.prepend(banner);
  // Opening personal files or folders always happens in the user's workspace.
  document.addEventListener('click',event=>{
   const control=event.target.closest('button,input');if(!example||!control)return;
   if(['open','loose-open','contact-open'].includes(control.id)||control.matches('input[type=file]')){
    event.preventDefault();event.stopImmediatePropagation();mode.go('own');
   }
  },true);
  if(example){
   const save=document.querySelector(tool==='Werkbank'?'#loose-save':tool==='Ping'?'#save':'#export');
   if(save&&tool!=='Ping')save.textContent='Bewaar voorbeeldbestand';
   if(tool==='Ping'){
    const finalize=document.getElementById('finalize');if(finalize)finalize.textContent='Waarom geen definitief nummer?';
   }
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
