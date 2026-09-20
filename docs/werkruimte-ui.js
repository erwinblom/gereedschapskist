'use strict';
(()=>{
 const script=document.currentScript,base=new URL('.',script.src),tool=document.querySelector('script[data-tool]')?.dataset.tool;
 const tools={Werkbank:['Schrijven','▶ Begin hier.html'],Ping:['Factureren','Start Ping.html'],Projectbord:['Doen','Start Projectbord.html'],Bronnenkast:['Verzamelen','Start Bronnenkast.html'],Uren:['Uren schrijven','Start Uren.html'],Contacten:['Contact houden','Start Contacten.html'],Publicatieplanner:['Plannen','Start Publicatieplanner.html'],Offerte:['Offreren','Start Offerte.html'],Kasboek:['Boekhouden','Start Kasboek.html']};
 const $=id=>document.getElementById(id);
 const mode=()=>GereedschapskistMode?.example?'voorbeeld':'eigen';
 function report(e){$('wm-message').textContent=e.message;}
 async function navigate(url){try{await BewaarAlles.flush();window.GereedschapskistNavigating=true;location.assign(GereedschapskistKeuze.url(url,mode()).href);setTimeout(()=>window.GereedschapskistNavigating=false,1000);}catch(e){report(e)}}
 async function mount(){
  await Werkmap.ready;await Werkmap.suiteReady;
  // Werkmap mounts after its asynchronous permission settings lookup.
  if(!$('werkmap'))await new Promise(resolve=>{const m=new MutationObserver(()=>{if($('werkmap')){m.disconnect();resolve();}});m.observe(document.body,{childList:true,subtree:true});});
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('werkruimte-ui.css',base);document.head.append(style);
  const map=$('werkmap');map.open=false;
  if(tool){
   document.body.dataset.tool=tool;
   const nav=document.createElement('select');nav.id='tool-switcher';nav.setAttribute('aria-label','Wissel van tool');
   for(const [id,[name]]of Object.entries(tools))nav.add(new Option(name,id,id===tool,id===tool));
   nav.onchange=()=>{const [name,file]=tools[nav.value],url=new URL('Apps/'+nav.value+'/'+file,base);url.searchParams.set('werkruimte',mode());navigate(url.href);};
   document.querySelector('.brandbar,body>header').append(nav);
   const saveId=tool==='Werkbank'?'loose-save':tool==='Ping'?'save':'export';const save=$(saveId);
   if(save){save.hidden=true;save.setAttribute('aria-hidden','true');}
   const open=tool==='Werkbank'?null:$('open');if(open){open.textContent='Importeer bestand';map.querySelector('.wm-actions').append(open);}
   if($('workspace-help-toggle'))$('workspace-help-toggle').textContent='Meer & uitleg';
   const restoreActions=['take-hours','take-tasks','hours-resend','hours-receipt','hours-task','take-receipt','take-quote'];
   const advanced=document.createElement('details');advanced.className='legacy-imports';const title=document.createElement('summary');title.textContent='Los bestand importeren of eerdere overdracht herstellen';advanced.append(title);
   for(const id of restoreActions){const b=$(id);if(b)advanced.append(b);}
   if(advanced.children.length>1)$('workspace-help').append(advanced);
   const help=document.querySelector('.save-help-body');if(help)help.innerHTML='<p><strong>Bewaar alles</strong> bewaart je werk en concepten uit de hele Gereedschapskist in je werkmap. Kies de eerste keer een map en geef toestemming.</p><p>Volgende keer kies je <strong>Open werkmap</strong>. Je hoeft geen losse gegevensbestanden te zoeken. Je browser kan opnieuw om toegang tot de map vragen.</p><p><strong>Toevoegen</strong> en <strong>Wijzigingen toepassen</strong> verwerken je invoer in de tool. Gebruik daarna Bewaar alles. Een definitieve factuur maak je apart; bewaren maakt niets definitief.</p><p>Bij Exporteren kun je een losse JSON, CSV of PDF maken. Download back-up kopieert de laatst bewaarde werkmap. Externe schrijfmappen en nog niet ontvangen links uit de extensie vallen buiten Bewaar alles.</p>';
   const labels={'Registratie bewaren':'Toevoegen','Bewaar en nog een registratie':'Toevoegen en nog een','Contact bewaren':'Wijzigingen toepassen','Taak bewaren':'Wijzigingen toepassen','Plan bewaren':'Wijzigingen toepassen','Boeking bewaren':'Toevoegen','Offerte bewaren':'Wijzigingen toepassen','Bron bewaren':'Wijzigingen toepassen'};
   for(const b of document.querySelectorAll('button'))if(labels[b.textContent.trim()])b.textContent=labels[b.textContent.trim()];
   for(const d of document.querySelectorAll('dialog')){const h=d.querySelector('h2,h3');if(h){h.id=h.id||d.id+'-title';d.setAttribute('aria-labelledby',h.id);}}
   if(tool==='Ping'||tool==='Offerte'){
    const layout=document.querySelector(tool==='Ping'?'.layout':'.workspace'),editor=layout.querySelector('.editor'),preview=layout.querySelector('.preview');
    const tabs=document.createElement('div');tabs.className='document-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Documentweergave');
    editor.id=editor.id||'document-editor';preview.id=preview.id||'document-preview';
    const buttons=['Gegevens','Voorbeeld'].map((name,index)=>{const button=document.createElement('button');button.type='button';button.textContent=name;button.id='document-tab-'+index;button.setAttribute('role','tab');button.setAttribute('aria-controls',index?preview.id:editor.id);tabs.append(button);return button;});
    function select(index){layout.classList.toggle('show-document-preview',index===1);buttons.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});}
    buttons.forEach((b,i)=>{b.onclick=()=>select(i);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-i;select(next);buttons[next].focus();}};});
    layout.insertBefore(tabs,editor);select(0);
   }
   if(tool==='Kasboek'){const label=document.createElement('p');label.className='tool-purpose';label.textContent='Eenvoudig kasboek · inkomsten, uitgaven en bonnen';document.querySelector('main').prepend(label);}
   if(tool==='Werkbank'){
    const hint=document.querySelector('.loose-documents span');if(hint)hint.textContent='Nieuwe documenten gaan mee met Bewaar alles. Een externe map blijft op haar eigen plek.';
    const localSave=$('saveButton');if(localSave)localSave.title='Werk dit document bij in de oorspronkelijke map';
   }
   // Rare actions use the existing help panel; keep their original handlers.
   const simplify=()=>{
    const panel=$('workspace-help');if(!panel)return;
    const toggle=$('workspace-help-toggle');if(toggle&&toggle.textContent!=='Meer & uitleg')toggle.textContent='Meer & uitleg';
    let options=$('tool-extra-actions');if(!options){options=document.createElement('section');options.id='tool-extra-actions';options.className='tool-extra-actions';options.setAttribute('aria-label','Extra acties voor deze tool');const title=document.createElement('h2');title.textContent='Extra acties';options.append(title);panel.prepend(options);}
    for(const id of ['rename','rename-collection','csv','shared-business-defaults','loose-folder']){const button=$(id);if(button&&!options.contains(button)){options.append(button);if(id==='loose-folder')button.textContent='Externe documentenmap openen';}}
    const receive=$('receive-local-links');if(receive&&!options.contains(receive)){const row=receive.parentElement;options.append(row);const message=$('link-local-message');if(message)options.append(message);}
    const example=$('example');if(tool==='Projectbord'&&example&&!panel.contains(example))panel.append(example);
    if(tool==='Contacten'){const heading=[...document.querySelectorAll('.sidebar h2')].find(h=>h.textContent==='Bewaren');if(heading)heading.hidden=true;}
   };
   const emptyHelp={
    Contacten:['contacts','#cards .empty','Voeg je eerste contact toe. Gebruik dit contact daarna voor offertes en facturen.'],
    Uren:['entries','#rows .empty','Voeg je eerste uren toe. Selecteer declarabele registraties om er een factuur van te maken.'],
    Bronnenkast:['items','#cards .empty','Voeg je eerste bron toe: een link, citaat of notitie. Van geselecteerde bronnen kun je een document maken.'],
    Publicatieplanner:['items','#content .empty','Voeg je eerste project, publicatie of activiteit toe. Bij een project kun je daarna taken maken.'],
    Kasboek:['entries','#rows .empty','Voeg je eerste inkomsten of uitgaven toe. Je kunt ook een betaalde factuur overnemen uit Factureren.'],
    Projectbord:['tasks','.column[data-column=todo] .empty','Voeg je eerste taak toe. Verplaats haar tijdens het werken van Te doen naar Bezig en Klaar.']};
   const refine=()=>{simplify();if(GereedschapskistMode.example){const status=$('storage'),text='Oefeninhoud. Je eigen werk en werkmap blijven apart.';if(status&&status.textContent!==text)status.textContent=text;}if(!GereedschapskistMode.example&&emptyHelp[tool]){const [key,selector,text]=emptyHelp[tool],content=Werkmap.allRead();if(content&&Array.isArray(content[key])&&!content[key].length){const el=document.querySelector(selector);if(el&&el.textContent!==text)el.textContent=text;}}};
   refine();new MutationObserver(refine).observe(document.body,{childList:true,subtree:true});
   // Keep a current browser snapshot when following an internal link; no extra disk write.
   document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||a.target||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;const url=new URL(a.href,location.href);if(url.href.startsWith(base.href)&&url.pathname.endsWith('.html')){e.preventDefault();navigate(url.href);}},true);
  }else{
   const bar=document.createElement('section');bar.className='start-workspace';bar.setAttribute('aria-label','Beginnen of verder werken');
   const first=document.createElement('button');first.textContent='Nieuw beginnen';first.className='primary';
   const open=document.createElement('button');open.textContent='Verder werken';
   const examples=document.createElement('button');examples.textContent='Bekijk voorbeelden';examples.className='quiet-action';examples.onclick=()=>GereedschapskistKeuze.choose('voorbeeld').catch(report);
   const state=document.createElement('span');state.className='workspace-name';
   const workChoice=document.createElement('div');workChoice.className='home-work-choice';workChoice.setAttribute('role','group');workChoice.setAttribute('aria-label','Eigen werk');workChoice.append(first,open,state);const browserHint=document.createElement('span');browserHint.className='workspace-name';browserHint.textContent='Gebruik Chrome of Edge op je computer voor je werkmap.';workChoice.append(browserHint);
   const exampleChoice=document.createElement('div');exampleChoice.className='home-example-choice';const exampleHint=document.createElement('span');exampleHint.id='home-example-hint';exampleHint.textContent='Vrij uitproberen, zonder werkmap.';examples.setAttribute('aria-describedby',exampleHint.id);exampleChoice.append(examples,exampleHint);
   bar.append(workChoice,exampleChoice,$('wm-backup'));document.querySelector('.titlebar').after(bar);
   const details=document.createElement('details');details.className='home-more';const summary=document.createElement('summary');summary.textContent='Meer & uitleg';details.append(summary,map);bar.after(details);
   const message=$('wm-message');bar.after(message);
   async function begin(){if(await Werkmap.startNew())await GereedschapskistKeuze.choose('eigen');}
   async function resume(){if(await Werkmap.continueWork())await GereedschapskistKeuze.choose('eigen');}
   function refresh(){const example=GereedschapskistKeuze.mode==='voorbeeld'||!GereedschapskistKeuze.mode&&!Werkmap.active;
    first.hidden=false;first.textContent='Nieuw beginnen';first.onclick=()=>begin().catch(report);open.textContent='Verder werken';open.onclick=()=>resume().catch(report);
    exampleChoice.hidden=example;examples.hidden=example;
    if(Werkmap.active&&!example){details.append(first,exampleChoice);workChoice.prepend(open);}else{workChoice.prepend(first,open);bar.insertBefore(exampleChoice,$('wm-backup'));}
    if(example)bar.prepend(state);else workChoice.append(state);
    state.textContent=example?'Voorbeeldproject: Buurtwerkplaats De Proeftuin · je eigen werk staat apart':Werkmap.active?'Werkmap: '+Werkmap.name:'Nieuw beginnen: kies een opslagplek. Wij maken de hoofdmap en negen submappen.';
    $('wm-backup').hidden=!Werkmap.active||example;
    for(const a of document.querySelectorAll('.grid a'))a.href=GereedschapskistKeuze.url(a.href,example?'voorbeeld':'eigen').href;
   }
   document.addEventListener('werkmap-gekozen',refresh);refresh();
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount().catch(report),{once:true});else mount().catch(report);
})();
