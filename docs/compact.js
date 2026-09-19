'use strict';
// Reuse existing controls and event handlers; only their placement changes.
document.addEventListener('DOMContentLoaded',()=>{
 const header=document.querySelector('.brandbar,body>header'),status=document.getElementById('file-status');
 if(!header||!status)return;
 document.body.classList.add('compact-tools');
 const strip=document.createElement('div');strip.className='workspace-strip';header.after(strip);strip.append(status);
 const toggle=document.createElement('button');toggle.id='workspace-help-toggle';toggle.type='button';toggle.textContent='Bewaren & uitleg';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','workspace-help');strip.append(toggle);
 const panel=document.createElement('section');panel.id='workspace-help';panel.hidden=true;panel.setAttribute('aria-label','Bewaren en uitleg');strip.after(panel);
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
 const banner=document.querySelector('.example-mode'),switcher=document.getElementById('workspace-switch');
 if(banner){if(GereedschapskistMode.example&&switcher)strip.insertBefore(switcher,toggle);panel.append(banner);}
 const help=document.querySelector('.save-help');if(help)panel.append(help);
 const badge=document.querySelector('.suite-badge');if(badge)panel.append(badge);
 const links=document.createElement('p');links.innerHTML='<a href="../../Uitleg.html">Uitleg en gebruik</a> · <a href="../../Over.html">Over de Gereedschapskist</a>';panel.append(links);
 function placeWorkmap(){const map=document.getElementById('werkmap');if(!map||panel.contains(map))return;panel.prepend(map);map.open=true;
 const saveAll=document.getElementById('wm-backup');
 if(GereedschapskistMode.example){const preview=document.createElement('button');preview.id='save-all-preview';preview.type='button';preview.textContent='Bewaar alles';preview.disabled=true;preview.title='Kies Begin met mijn eigen werk om je eigen werk te bewaren.';strip.insertBefore(preview,toggle);}
 else if(saveAll){strip.insertBefore(saveAll,toggle);saveAll.title='Bewaar je werk uit alle tools, inclusief onvoltooide invoer.';saveAll.addEventListener('click',e=>{if(Werkmap.active)return;e.preventDefault();e.stopImmediatePropagation();panel.hidden=false;toggle.setAttribute('aria-expanded','true');document.getElementById('wm-choose')?.focus();document.getElementById('wm-message').textContent='Kies één keer een werkmap. Daarna kun je hier met Bewaar alles je werk uit alle tools bewaren.';},true);}
 const message=document.getElementById('wm-message');if(message)panel.after(message);}
 placeWorkmap();const observer=new MutationObserver(()=>{placeWorkmap();if(panel.querySelector('#werkmap'))observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});
 const offerFilter=document.querySelector('body[data-tool=Offerte] #filter');if(offerFilter){const wrap=document.createElement('div');wrap.className='filter-strip';const label=document.querySelector('label[for=filter]');offerFilter.before(wrap);if(label)wrap.append(label);wrap.append(offerFilter);}
 const main=document.querySelector('main'),heading=main?.querySelector(':scope>.heading,:scope>.intro');
 if(heading){
  heading.classList.add('work-actions');
  if(!heading.querySelector('#board-name,#collection-name')){const brand=header.querySelector('.brand');if(brand){brand.setAttribute('role','heading');brand.setAttribute('aria-level','1');}}
  const intro=heading.firstElementChild;
  if(intro&&!intro.querySelector('#board-name,#collection-name')){intro.classList.add('compact-intro');panel.append(intro);}
  else if(intro){for(const p of intro.querySelectorAll('.eyebrow,p.intro'))panel.append(p);}
  const actions=document.getElementById('link-actions');if(actions){const group=heading.querySelector('.actions');if(group){while(actions.firstChild)group.prepend(actions.lastChild);actions.remove();}else heading.append(actions);}
 }
 const note=main?.querySelector(':scope>.banner');if(note)panel.append(note);
 const preview=document.querySelector('body[data-tool=Ping] .preview');if(preview){const actions=document.createElement('div');actions.className='link-actions';for(const id of ['invoice-received','invoice-hours-receipt']){const b=document.getElementById(id);if(b)actions.append(b);}preview.append(actions);}
 const style=document.createElement('link');style.rel='stylesheet';style.href='../../compact.css';document.head.append(style);
});
