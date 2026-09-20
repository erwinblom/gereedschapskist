'use strict';
(()=>{
 const tool=document.querySelector('script[data-tool]')?.dataset.tool;
 async function run(){
  await Werkmap.suiteReady;await BewaarAlles.ready;
  const handle=fn=>async()=>{try{await fn()}catch(e){Koppelingen.notice(e.message)}};
  if(['Ping','Offerte'].includes(tool)&&!GereedschapskistMode.example){
   const buttons=document.createElement('div');buttons.className='link-actions';
   const company=document.createElement('button');company.type='button';company.id='shared-business-defaults';company.textContent='Gebruik als mijn bedrijfsgegevens';
   company.onclick=handle(async()=>{const value=tool==='Ping'?invoiceBusiness():working?.business;if(!value)throw Error('Maak eerst een offerte of factuur.');await Samenwerken.setBusiness({...await Samenwerken.business(),...value});Koppelingen.notice('Bedrijfsgegevens ingesteld voor nieuwe offertes en facturen. Eerdere documenten blijven gelijk.');});
   buttons.append(company);document.querySelector('.editor,.edit')?.append(buttons);
   if(tool==='Ping'){
    const old=$('new').onclick;$('new').onclick=handle(async()=>{const b=await Samenwerken.business(),previous=current()?.id;await old();if(b&&current()?.id!==previous&&current()?.state==='draft'){current().draftBusiness={...b};persist();render();}});
    const finish=$('final-confirm').onclick;$('final-confirm').onclick=async()=>{await finish();const i=current();if(i?.state==='final'&&i.timeSources){try{await Samenwerken.send('uren-bevestiging',{invoiceId:i.id,number:i.number,sources:i.timeSources},'Uren',i.id);notify('Factuur staat vast. Bijbehorende uren zijn gemarkeerd als gefactureerd. Bewaar alles.');}catch(e){Koppelingen.notice('Factuur staat vast. Urenstatus nog niet bijgewerkt: '+e.message);}}};
   }
  }
  if(tool==='Uren'){
   const old=edit;edit=async function(...args){old(...args);try{const [contacts,projects]=await Promise.all([Samenwerken.contacts(),Samenwerken.projects()]);$('client-options').replaceChildren(...contacts.map(c=>new Option(c.organization||c.name,c.organization||c.name)));$('project-options').replaceChildren(...projects.map(p=>new Option(p.name,p.name)));}catch(e){Koppelingen.notice(e.message)}};
   const submit=$('form').onsubmit;$('form').onsubmit=async e=>{e.preventDefault();try{const refs=await Samenwerken.identify($('client').value.trim(),$('project').value.trim());const old=Koppelingen.draft('Uren');Koppelingen.setDraft('Uren',{...old,...refs});if(editing){const entry=data.entries.find(i=>i.id===editing);if(entry&&!entry.billing)Object.assign(entry,refs);}submit(e);const done=new Set(data.entries.map(i=>i.sourceTransferId).filter(Boolean));await BewaarAlles.updateShared(s=>s.inbox=(s.inbox||[]).filter(i=>!done.has(i.id)));document.getElementById('pending-task')?.remove();}catch(e){notify(e.message)}};
   const shared=await BewaarAlles.readShared(),pending=shared.inbox?.find(i=>i.tool==='Uren');
   if(pending){const b=Koppelingen.button('Uren bij '+pending.body.title,'pending-task',handle(async()=>{if(Werkstatus.hasPending())throw Error('Rond eerst het geopende formulier af.');await edit();$('project').value=pending.body.project;$('description').value=pending.body.title;$('hours').value='0';$('minutes').value='0';const contacts=await Samenwerken.contacts(),c=contacts.find(c=>c.id===pending.body.contactId);if(c)$('client').value=c.organization||c.name;Koppelingen.setDraft('Uren',{sourceTaskId:pending.body.taskId,sourceTransferId:pending.id,projectId:pending.body.projectId,contactId:pending.body.contactId});}));b.click();

   }
  }
  if(tool==='Publicatieplanner'){
   const old=render;render=function(){const projects=$('kind-filter').value==='project';$('channel-filter').closest('label').hidden=projects;if(projects)$('channel-filter').value='';for(const option of $('status-filter').options)option.hidden=projects&&option.value==='published';if(projects&&$('status-filter').value==='published')$('status-filter').value='';old();};$('kind-filter').onchange=()=>render();render();
  }
 }
 run().catch(e=>window.Koppelingen?.notice('Samenwerking niet beschikbaar: '+e.message));
})();
// Follow a project or contact across tools, while retaining historical names in records.
(async()=>{
 await Werkmap.suiteReady;await BewaarAlles.ready;
 if(GereedschapskistMode.example)return;
 const tool=document.querySelector('script[data-tool]')?.dataset.tool,K=Koppelingen;
 const href=(folder,file,params)=>{const u=new URL('../'+folder+'/'+file,location.href);u.searchParams.set('werkruimte','eigen');for(const [key,value]of Object.entries(params))u.searchParams.set(key,value);return u.href;};
 function link(text,url){const a=document.createElement('a');a.className='shared-reference';a.textContent=text;a.href=url;return a;}
 if(tool==='Projectbord'){
  let projects=[],contacts=[];try{[projects,contacts]=await Promise.all([Samenwerken.projects(),Samenwerken.contacts()]);}catch(e){K.notice(e.message)}
  const decorate=()=>{for(const row of $('board').querySelectorAll('article.task')){if(row.querySelector('.shared-reference'))continue;const t=data.tasks.find(t=>t.id===row.dataset.id);if(!t)continue;const p=projects.find(p=>p.id===t.projectId),c=contacts.find(c=>c.id===t.contactId);if(p)row.append(link('Project: '+p.name,href('Publicatieplanner','Start Publicatieplanner.html',{project:p.id})));if(c)row.append(link('Contact: '+c.name,href('Contacten','Start Contacten.html',{contact:c.id})));}};
  new MutationObserver(decorate).observe($('board'),{childList:true});decorate();
  const filter=new URL(location.href).searchParams;const id=filter.get('project')||filter.get('contact');if(id){const name=projects.find(p=>p.id===id)?.name||contacts.find(c=>c.id===id)?.name||'Gekoppelde taken';const bar=document.createElement('p');bar.className='tool-purpose';bar.append(document.createTextNode(name+' · '),link('Toon alle taken',href('Projectbord','Start Projectbord.html',{})));document.querySelector('main').prepend(bar);render();}
 }
 if(['Publicatieplanner','Contacten'].includes(tool)){
  const tasks=(await BewaarAlles.readTool('Projectbord')).data.tasks;
  const root=$(tool==='Publicatieplanner'?'content':'cards');
  const decorate=()=>{for(const button of root.querySelectorAll(tool==='Publicatieplanner'?'[data-plan-tasks]':'[data-contact-task]')){const row=button.closest('article');if(!row||row.querySelector('.shared-reference'))continue;const id=button.dataset.planTasks||button.dataset.contactTask,list=tasks.filter(t=>tool==='Publicatieplanner'?t.projectId===id:t.contactId===id);if(list.length)button.after(link(list.length+' taken · '+list.filter(t=>t.state==='done').length+' klaar →',href('Projectbord','Start Projectbord.html',{[tool==='Publicatieplanner'?'project':'contact']:id})));}};
  new MutationObserver(decorate).observe(root,{childList:true});decorate();
  const id=new URL(location.href).searchParams.get(tool==='Publicatieplanner'?'project':'contact');if(id){const item=(data.items||data.contacts).find(i=>i.id===id);if(item){$('search').value=item.title||item.name;render();}}
 }
})().catch(e=>window.Koppelingen?.notice('Project- of contactverwijzing niet geladen: '+e.message));
