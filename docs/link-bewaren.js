'use strict';
(()=>{
 const controls=document.createElement('div');controls.className='actions';
 const receive=document.createElement('button');receive.id='receive-local-links';receive.textContent='Ontvang links';
 const help=document.createElement('a');help.href='../../Link-bewaren.html';help.textContent='Link Bewaren — lokaal';help.style.alignSelf='center';
 const pending=document.createElement('span');pending.className='pending-local-links';pending.setAttribute('role','status');pending.hidden=true;
 const message=document.createElement('p');message.id='link-local-message';message.setAttribute('role','status');
 document.querySelector('.heading').after(controls,message);controls.append(receive,pending,help);
 function request(type,extra={}){return new Promise((resolve,reject)=>{
  const id=crypto.randomUUID(),timer=setTimeout(()=>{window.removeEventListener('message',onMessage);reject(Error('Geen verbinding met Link Bewaren — lokaal. Installeer de lokale extensie en ververs deze pagina. De automatische overdracht werkt voorlopig in de online versie in Chrome.'))},5000);
  function onMessage(e){if(e.source!==window||e.origin!==location.origin||e.data?.channel!=='gk-link-local-response'||e.data.id!==id)return;clearTimeout(timer);window.removeEventListener('message',onMessage);if(!e.data.ok)reject(Error(e.data.error||'Ontvangst niet bevestigd.'));else resolve(e.data)}
  window.addEventListener('message',onMessage);window.postMessage({channel:'gk-link-local-request',id,type,...extra},location.origin);
 })}
 async function refreshPending(){
  if(window.GereedschapskistMode?.example)return;
  try{const status=await request('status');if(Number.isInteger(status.pending)&&status.pending>=0){pending.textContent=status.pending?status.pending+' links wachten op ontvangst':'Geen wachtende links';pending.hidden=false;}}catch{pending.hidden=true;}
 }
 setTimeout(refreshPending,500);window.addEventListener('focus',refreshPending);
 receive.onclick=async()=>{
  if(GereedschapskistMode.example){message.textContent='Kies eerst Naar mijn eigen werk. Persoonlijke links komen niet tussen de voorbeelden.';return;}
  receive.disabled=true;message.textContent='Links ophalen…';
  try{
   if(Werkstatus.hasPending()||Werkmap.busy||document.body.getAttribute('aria-busy')==='true')throw Error('Rond eerst je huidige invoer of bewaaractie af en ontvang daarna je links.');
   const result=await request('pending');
   if(!Array.isArray(result.items)||result.items.length>100)throw Error('Ongeldig antwoord van de extensie.');
   const incoming=validate({format:'bronnenkast',version:1,items:result.items}).items;
   if(!incoming.length){message.textContent='Geen nieuwe links. Bewaar een link met de lokale extensie; ontvangen links staan in je collectie.';return;}
   if(Werkstatus.hasPending()||Werkmap.busy||document.body.getAttribute('aria-busy')==='true')throw Error('Er is ondertussen invoer of een bewaaractie gestart. Probeer daarna opnieuw.');
   const known=new Set(data.items.map(i=>i.id)),fresh=incoming.filter(i=>!known.has(i.id));
   // Only acknowledge after the normal collection write AND an exact durable readback.
   if(fresh.length&&!change(d=>d.items.unshift(...fresh)))throw Error('Niet toegevoegd. Controleer de melding in Verzamelen en probeer opnieuw.');
   if(!cache||GereedschapskistMode.storage.getItem(KEY)!==JSON.stringify(data))throw Error('Browseropslag niet bevestigd. De links blijven in de extensie wachten; maak eerst ruimte en probeer opnieuw.');
   await request('ack',{ids:incoming.map(i=>i.id)});
   resetFilters();Werkstatus.update();document.dispatchEvent(new Event('input',{bubbles:true}));
   const remaining=await request('status');
   message.textContent=`${fresh.length} nieuwe links ontvangen. Je vindt ze in de categorie Inbox. Bewaar je collectie met Bewaar alles.`+(remaining.pending?` Nog ${remaining.pending} links te ontvangen; klik opnieuw op Ontvang links.`:'');
  }catch(e){message.textContent=e.message+' Er worden geen links uit de herstelkopie in de extensie verwijderd.';}
  finally{receive.disabled=false;refreshPending();}
 };
})();
