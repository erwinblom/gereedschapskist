'use strict';
const HOME='https://erwinblom.github.io/gereedschapskist/Apps/Bronnenkast/Start%20Bronnenkast.html';
const KEY='link-bewaren-lokaal-v1';
function receiver(url){try{const u=new URL(url);return u.origin==='https://erwinblom.github.io'&&decodeURIComponent(u.pathname)==='/gereedschapskist/Apps/Bronnenkast/Start Bronnenkast.html'}catch{return false}}
function clean(v,n){if(typeof v!=='string'||v.length>n)throw Error('Een veld ontbreekt of is te lang.');return v.trim()}
function item(input){const url=new URL(clean(input.url,2000));if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Gebruik een gewone web-link zonder inloggegevens.');const title=clean(input.title,180);if(!title)throw Error('Vul een titel in.');return {id:'link-'+crypto.randomUUID(),title,url:url.href,source:url.hostname,category:'Inbox',tags:[],summary:'',quote:clean(input.quote,10000),notes:clean(input.notes,10000),favorite:false,checked:''}}
async function read(){const state=(await chrome.storage.local.get(KEY))[KEY]||{version:1,entries:[]};if(state.version!==1||!Array.isArray(state.entries))throw Error('Lokale opslag is niet leesbaar. Verwijder de extensie niet.');return state}
function canonical(v){return JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x)}
async function persist(state){await chrome.storage.local.set({[KEY]:state});const check=await read();if(canonical(state)!==canonical(check))throw Error('Bewaren kon niet worden bevestigd.');await badge(state);}
async function badge(state){const n=state.entries.filter(e=>!e.receivedAt).length;await chrome.action.setBadgeText({text:n?String(n):''});await chrome.action.setBadgeBackgroundColor({color:'#e32720'});}
async function handle(m,sender){
 const popup=sender.url===chrome.runtime.getURL('popup.html');
 const page=sender.frameId===0&&receiver(sender.url);
 if(!popup&&!page)throw Error('Deze pagina mag geen links ophalen.');
 const state=await read();
 if(m.type==='status')return {pending:state.entries.filter(e=>!e.receivedAt).length,total:state.entries.length};
 if(popup&&m.type==='add'){
  if(state.entries.length>=5000)throw Error('De lokale bibliotheek is vol. Bewaar eerst een herstelbestand.');
  const value=item(m.item);state.entries.push({item:value,capturedAt:new Date().toISOString(),receivedAt:null});await persist(state);return {id:value.id};
 }
 if(page&&m.type==='pending')return {items:state.entries.filter(e=>!e.receivedAt).slice(0,100).map(e=>e.item)};
 if(page&&m.type==='ack'){
  if(!Array.isArray(m.ids)||m.ids.length>100||m.ids.some(id=>typeof id!=='string'))throw Error('Ongeldige ontvangstbevestiging.');
  const ids=new Set(m.ids);for(const e of state.entries)if(ids.has(e.item.id)&&!e.receivedAt)e.receivedAt=new Date().toISOString();await persist(state);return {ok:true};
 }
 if(popup&&m.type==='export')return {data:{format:'bronnenkast',version:1,name:'Link Bewaren — lokaal',items:state.entries.map(e=>e.item)}};
 if(popup&&m.type==='retry'){for(const e of state.entries)e.receivedAt=null;await persist(state);return {ok:true};}
 throw Error('Onbekende opdracht.');
}
// Serialize read/modify/write operations so concurrent captures cannot overwrite one another.
let serial=Promise.resolve();
chrome.runtime.onMessage.addListener((m,sender,reply)=>{const task=serial.then(()=>handle(m||{},sender));serial=task.catch(()=>{});task.then(result=>reply({ok:true,...result}),e=>reply({ok:false,error:e.message}));return true;});
chrome.runtime.onInstalled.addListener(()=>read().then(badge).catch(()=>{}));
