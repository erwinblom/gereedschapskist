const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/contacten-zoeken.js'),'utf8');
const book={format:'contacten',version:1,contacts:[{id:'1',name:'Renée Blom',organization:'Studio Noord',email:'renee@example.com'},{id:'2',name:'Sam Jansen',organization:'Buurtwerkplaats',email:'sam@example.com'}]};
function setup({active=false,example=false,raw=null,file=null,error=null}={}){let reads=0;const c={window:{},GereedschapskistMode:{example,storage:{getItem:()=>raw}},Werkmap:{ready:Promise.resolve(),active,readContacts:async()=>{reads++;if(error)throw Error(error);return file}},GereedschapskistExamples:()=>book};vm.createContext(c);vm.runInContext(source,c);return {api:c.window.ContactenZoeken,reads:()=>reads};}
(async()=>{
 let s=setup({raw:JSON.stringify(book)});assert.equal((await s.api.read()).book.contacts.length,2);
 assert.equal(s.api.search(book.contacts,'noord renee')[0].id,'1');assert.equal(s.api.search(book.contacts,'SAM@EXAMPLE')[0].id,'2');assert.equal(s.api.search(book.contacts,'  ').length,2);assert.equal(s.api.search(book.contacts,'niets').length,0);
 const file={name:'gereedschapskist-contact-houden.json',size:500,text:async()=>JSON.stringify(book)};
 s=setup({active:true,file,raw:'bad browser data'});assert.match((await s.api.read()).source,/Werkmap/);assert.equal(s.reads(),1);
 s=setup({active:true,raw:JSON.stringify(book)});await assert.rejects(s.api.read(),/Bewaar in Contact houden/);
 s=setup({active:true,error:'Geen toegang'});await assert.rejects(s.api.read(),/Geen toegang/);
 s=setup({active:true,example:true,file});assert.match((await s.api.read()).source,/Voorbeeld/);assert.equal(s.reads(),0);
 s=setup();await assert.rejects(s.api.read(),/gedeelde werkmap/);assert.throws(()=>s.api.validate({...book,_gereedschapskistExample:true}),/voorbeeldbestand/);
 assert.throws(()=>s.api.validate({...book,contacts:[book.contacts[0],book.contacts[0]]}),/dubbele/);assert.throws(()=>s.api.validate({...book,contacts:[{...book.contacts[0],name:null}]}),/Onvolledige/);
 await assert.rejects(s.api.fromFile({...file,size:20000001}),/20 MB/);await assert.rejects(s.api.fromFile({...file,text:async()=>'{broken'}));
 for(const tool of ['Offerte','Kasboek']){const html=fs.readFileSync(path.join(__dirname,`../app/Apps/${tool}/Start ${tool}.html`),'utf8');for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(script[1].trim())new vm.Script(script[1]);assert.match(html,/Zoek in Contacten/);assert.match(html,/contacten-zoeken.js/);}
 console.log('OK: naam/organisatie/email, accenten en meerdere zoekwoorden; werkmap heeft voorrang; ontbrekende bron/toegang; voorbeeldscheiding; ongeldige bestanden; scripts beide tools.');
})().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
 const nodes=new Map();
 class Element{constructor(){this.value='';this.textContent='';this.open=false;this.options=[];this.listeners={};}setAttribute(){}focus(){}dispatchEvent(){}showModal(){this.open=true}close(){this.open=false;this.listeners.close?.()}addEventListener(name,fn){this.listeners[name]=fn}replaceChildren(...items){this.options=items;this.value=items[0]?.value||''}}
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)};let dialog;
 const doc={getElementById:get,createElement:()=>dialog=new Element(),body:{append(){}}};
 const c={document:doc,window:{},Option:function(text,value){this.text=text;this.value=value},Event:function(){},Werkstatus:{update(){}},ContactenZoeken:{read:async()=>({book,source:'testcontacten'}),search:setup().api.search}};
 get('dialog').open=true;get('party').value='Handmatige invoer';
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/koppelingen/kasboek-contacten.js'),'utf8'),c);
 await get('party-contact').onclick();assert.equal(dialog.open,true);assert.equal(get('party').value,'Handmatige invoer');
 get('party-contact-query').value='renee';get('party-contact-query').oninput();assert.equal(get('party-contact-list').options.length,1);
 get('party-contact-list').value='1';get('party-contact-list').onchange();assert.equal(get('party-contact-apply').disabled,false);get('party-contact-apply').onclick();assert.equal(get('party').value,'Studio Noord');assert.equal(dialog.open,false);
 await get('party-contact').onclick();get('party-contact-close').onclick();assert.equal(get('party').value,'Studio Noord');
 console.log('OK: boeking blijft ongewijzigd tijdens zoeken; selectie vult partij; annuleren behoudt bestaande invoer.');
})().catch(e=>{console.error(e);process.exitCode=1});
