'use strict';
(()=>{
 const layout=document.querySelector('.layout'),sidebar=document.querySelector('.sidebar'),tools=document.querySelector('.tools');
 layout.classList.add('library-layout');
 const nav=$('categories');nav.setAttribute('aria-label','Bibliotheekweergave');tools.before(nav);
 const categoryLabel=document.createElement('label');categoryLabel.htmlFor='library-category';categoryLabel.textContent='Categorie';
 const category=document.createElement('select');category.id='library-category';category.onchange=()=>{filter=category.value?'cat:'+category.value:'Alles';render()};tools.append(categoryLabel,category);
 const footer=document.createElement('div');footer.className='library-footer';footer.append($('undo'),$('storage'));$('cards').after(footer);sidebar.remove();
 const detail=document.createElement('dialog');detail.id='library-detail';detail.setAttribute('aria-labelledby','library-detail-title');document.body.append(detail);
 function show(id){const i=data.items.find(x=>x.id===id);if(!i)return;detail.innerHTML=`<div class="library-detail-body"><button class="detail-close" type="button" aria-label="Sluiten">×</button><p class="eyebrow">BEWAARDE BRON · ${esc(i.category)}</p><h2 id="library-detail-title">${esc(i.title)}</h2><p class="source">${esc(i.source)}</p>${i.summary?`<h3>Samenvatting</h3><p class="detail-text">${esc(i.summary)}</p>`:''}${i.quote?`<h3>Citaat</h3><blockquote class="detail-text">${esc(i.quote)}</blockquote>`:''}${i.notes?`<h3>Eigen notities</h3><p class="detail-text">${esc(i.notes)}</p>`:''}<div class="actions">${i.url?`<a href="${esc(safeURL(i.url))}" target="_blank" rel="noopener noreferrer">Open bron ↗</a>`:''}<button class="detail-edit" type="button">Bewerken</button></div></div>`;detail.querySelector('.detail-close').onclick=()=>detail.close();detail.querySelector('.detail-edit').onclick=()=>{detail.close();edit(id)};detail.showModal();}
 function decorate(){
  nav.innerHTML=[['Alles','Alles'],['cat:Inbox','Inbox'],['Favorieten','Favorieten']].map(([key,label])=>`<button data-category="${key}" aria-pressed="${filter===key}">${label} <span>${data.items.filter(i=>key==='Alles'||key==='Favorieten'&&i.favorite||key==='cat:'+i.category).length}</span></button>`).join('');
  category.innerHTML='<option value="">Alle categorieën</option>'+[...new Set(data.items.map(i=>i.category))].sort((a,b)=>a.localeCompare(b,'nl')).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');category.value=filter.startsWith('cat:')?filter.slice(4):'';
  for(const card of $('cards').querySelectorAll('.card')){const id=card.querySelector('[data-edit]')?.dataset.edit,i=data.items.find(i=>i.id===id);if(!i)continue;card.classList.toggle('inbox',i.category==='Inbox');const heading=card.querySelector('h2'),title=document.createElement('button');title.className='library-title';title.textContent=i.title;title.onclick=()=>show(id);heading.replaceChildren(title);const preview=document.createElement('p');preview.className='library-note';preview.textContent=i.notes||i.quote||i.summary||'Nog geen notitie.';heading.after(preview);const summary=card.querySelector(':scope > p:not(.source):not(.library-note)');if(summary)summary.remove();card.querySelector('details')?.remove();}
 }
 const original=render;render=function(){original();decorate()};$('search').oninput=()=>render();$('topic').onchange=()=>render();render();
 const style=document.createElement('link');style.rel='stylesheet';style.href='../../bibliotheek.css';document.head.append(style);
})();
