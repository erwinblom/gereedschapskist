'use strict';
// A mode choice travels with internal links, including when opened from disk.
window.GereedschapskistKeuze=(()=>{
 const base=new URL('.',document.currentScript.src),params=new URL(location.href).searchParams;
 const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
 const write=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
 const query=params.get('werkruimte'),explicit=['eigen','voorbeeld'].includes(query);
 let selected=explicit?query:read('gereedschapskist-suite-mode');
 let tour=params.get('rondleiding')||read('gereedschapskist-tour')||'eerste-rondleiding';
 let channel;try{channel=new BroadcastChannel('gk-werkruimte-keuze:'+base.href)}catch{}
 function remember(mode,id){selected=mode;if(id)tour=id;write('gereedschapskist-suite-mode',mode);write('gereedschapskist-tour',tour);}
 if(explicit)remember(selected,tour);
 function url(value,mode=selected,id=tour){const u=new URL(value,location.href);if(mode){u.searchParams.set('werkruimte',mode);if(mode==='voorbeeld')u.searchParams.set('rondleiding',id);else u.searchParams.delete('rondleiding');}return u;}
 async function apply(mode,id,broadcast){
  if(window.GereedschapskistMode&&!GereedschapskistMode.example)await window.BewaarAlles?.flush();
  remember(mode,id);if(broadcast)channel?.postMessage({mode,tour});
  window.GereedschapskistNavigating=true;location.assign(url(location.href,mode,tour).href);
 }
 channel?.addEventListener('message',e=>{const m=e.data;if(!m||!['eigen','voorbeeld'].includes(m.mode)||typeof m.tour!=='string')return;if(selected===m.mode&&tour===m.tour)return;apply(m.mode,m.tour,false).catch(()=>{const el=document.getElementById('wm-message');if(el)el.textContent='Wisselen niet gelukt: je huidige invoer blijft open. Bewaar je werk en probeer opnieuw.';});});
 return {get mode(){return selected},get tour(){return tour},url,
  choose(mode){return apply(mode,mode==='voorbeeld'?crypto.randomUUID():tour,true);}};
})();
