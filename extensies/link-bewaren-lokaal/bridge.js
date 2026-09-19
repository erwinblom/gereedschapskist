'use strict';
if(window===window.top&&decodeURIComponent(location.pathname)==='/gereedschapskist/Apps/Bronnenkast/Start Bronnenkast.html'){
 window.addEventListener('message',async event=>{
  const m=event.data;
  if(event.source!==window||event.origin!==location.origin||m?.channel!=='gk-link-local-request'||typeof m.id!=='string'||m.id.length>80||!['status','pending','ack'].includes(m.type))return;
  try{const result=await chrome.runtime.sendMessage({type:m.type,ids:m.ids});window.postMessage({channel:'gk-link-local-response',id:m.id,...result},location.origin)}
  catch{window.postMessage({channel:'gk-link-local-response',id:m.id,ok:false,error:'De lokale extensie is opnieuw geladen. Ververs Verzamelen.'},location.origin)}
 });
}
