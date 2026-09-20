'use strict';
// Shared local records. Tool files remain the open JSON/Markdown interchange format.
window.Samenwerken=(()=>{
 const businessKeys=['name','address','email','iban','kvk','vat'];
 async function contacts(){return (await BewaarAlles.readTool('Contacten')).data.contacts;}
 async function projects(){const [plans,shared]=await Promise.all([BewaarAlles.readTool('Publicatieplanner'),BewaarAlles.readShared()]);const all=[...plans.data.items.filter(i=>i.kind==='project').map(i=>({id:i.id,name:i.title})),...(shared.projects||[])];return all.filter((p,n)=>all.findIndex(x=>x.id===p.id)===n);}
 async function identify(client,project){const book=await contacts(),list=await projects();const c=book.find(c=>(c.organization||c.name)===client),p=list.find(p=>p.name===project);return {contactId:c?.id||'',projectId:p?.id||''};}
 async function business(){return (await BewaarAlles.readShared()).business||null;}
 async function setBusiness(value){const next=Object.fromEntries(businessKeys.map(k=>[k,String(value[k]||'')]));await BewaarAlles.updateShared(s=>s.business=next);}
 async function send(kind,body,destination,id){
  const K=Koppelingen;
  if(kind==='taken'){
   const tasks=body.tasks;if(!Array.isArray(tasks)||!tasks.length||tasks.length>100)throw Error('Kies 1 tot 100 taken.');
   await BewaarAlles.updateTool('Projectbord',d=>{for(const t of tasks){K.text(t.title,160,true);K.date(t.due,false);K.digest(t.sourceLink);if(!d.tasks.some(old=>old.sourceLink===t.sourceLink))d.tasks.push({...t,id:K.uid(),state:'todo',priority:'normal'});}});
  }else if(kind==='uren-factuur'){
   const sources=K.sources(body.sources);for(const s of sources)if(await K.signature(s)!==s.signature)throw Error('De uren zijn veranderd.');
   await BewaarAlles.updateTool('Ping',d=>{const overlap=d.invoices.filter(i=>i.timeSources?.some(s=>sources.some(x=>x.id===s.id)));if(overlap.length){if(overlap.length===1&&JSON.stringify(overlap[0].timeSources)===JSON.stringify(sources))return;throw Error('Een deel van deze uren staat al op een factuur.');}
    d.invoices.unshift({id:K.uid(),state:'draft',timeSources:sources,customer:sources[0].client,title:'Werkzaamheden '+[...new Set(sources.map(s=>s.project))].join(', '),date:K.today(),deliveryDate:sources.map(s=>s.date).sort().at(-1),due:'',address:'',email:'',note:'',lines:sources.map(s=>({description:s.date+' · '+s.project+' · '+s.description+' ('+K.duration(s.minutes)+' uur × '+K.euro(s.rateCents)+'/uur)',quantity:1,cents:Math.round(s.minutes*s.rateCents/60),vat:s.vat}))});});
  }else if(kind==='factuur-ontvangst'){
   K.id(body.invoiceId);K.number(body.number);K.integer(body.cents,1,100000000);K.date(body.receivedOn);
   const invoiceKey=await K.key([body.issuer.kvk.trim().toLowerCase()||body.issuer.vat.trim().toLowerCase()||body.issuer.name.trim().toLowerCase(),body.number]);
   await BewaarAlles.updateTool('Kasboek',d=>{if(d.entries.some(i=>i.sourceInvoiceId===body.invoiceId||i.sourceInvoiceKey===invoiceKey))throw Error('Deze factuur is al als ontvangen geboekt.');d.entries.push({id:K.uid(),date:body.receivedOn,type:'income',party:body.customer,description:'Ontvangen factuur '+body.number,category:'Omzet',cents:body.cents,receipt:null,sourceInvoiceId:body.invoiceId,sourceInvoiceNumber:body.number,sourceInvoiceKey:invoiceKey});});
  }else if(kind==='uren-bevestiging'){
   const sources=K.sources(body.sources);K.number(body.number);
   await BewaarAlles.updateTool('Uren',async d=>{for(const s of sources){const i=d.entries.find(i=>i.id===s.id);if(!i||i.billing?.batchId!==s.batchId||await K.signature(i)!==s.signature)throw Error('De uren komen niet overeen met deze factuur.');if(i.billing.status==='invoiced'&&i.billing.invoiceId!==body.invoiceId)throw Error('Uren horen bij een andere factuur.');Object.assign(i.billing,{status:'invoiced',invoiceId:body.invoiceId,number:body.number});}});
  }else if(kind==='taak-uren'){
   await BewaarAlles.updateShared(s=>{s.inbox=s.inbox||[];s.inbox.push({id,tool:'Uren',kind,body});});
  }else if(kind==='offerte-factuur'){
   const q=body.quote;
   await BewaarAlles.updateTool('Ping',d=>{if(d.invoices.some(i=>i.sourceQuoteId===q.id))return;d.invoices.unshift({id:K.uid(),sourceQuoteId:q.id,state:'draft',title:[q.title,q.reference].filter(Boolean).join(' — '),date:K.today(),deliveryDate:'',due:'',customer:q.customer,contactPerson:q.contactPerson||'',address:q.address,email:q.email,sourceContactId:q.sourceContactId||'',note:'Volgens offerte '+(q.reference||q.title),draftBusiness:{...q.business,iban:q.business.name===d.business.name&&q.business.kvk===d.business.kvk?d.business.iban:''},lines:q.lines.map(l=>({description:l.description,quantity:l.quantity100/100,cents:l.cents,vat:l.vat}))});});
  }else throw Error('Onbekende koppeling.');
  return true;
 }
 async function document(name,content){await BewaarAlles.updateTool('Werkbank',(_,s)=>{s.documents=s.documents||[];let chosen=name,n=2;while(s.documents.some(d=>d.name===chosen))chosen=name.replace(/\.md$/, '')+' ('+(n++)+').md';s.documents.push({name:chosen,path:'converter/'+chosen,content});s.activeDocument='converter/'+chosen;});}
 return {contacts,projects,identify,business,setBusiness,send,document};
})();
