let outlineCollapsed = true;
let outlineHeadings = [];
let documentFocused = false;
function documentFocusButton() {
 return `<button class="edit-btn document-focus" aria-pressed="${documentFocused}" onclick="toggleDocumentFocus()">${documentFocused ? 'Focus sluiten' : 'Focus'}</button>`;
}
function toggleDocumentFocus() {
 documentFocused = !documentFocused;
 document.getElementById('app').classList.toggle('document-focused', documentFocused);
 document.querySelectorAll('.document-focus').forEach(button => {
  button.textContent = documentFocused ? 'Focus sluiten' : 'Focus';
  button.setAttribute('aria-pressed', String(documentFocused));
 });
 setOutlineVisibility(!!document.querySelector('#content .markdown-content'));
}

function setOutlineVisibility(hasDocument) {
 const panel = document.getElementById('focusPanel');
 const button = document.getElementById('focusToggle');
 panel.hidden = !hasDocument || outlineHeadings.length < 2 || outlineCollapsed;
 button.hidden = !hasDocument || outlineHeadings.length < 2;
 button.textContent = panel.hidden ? 'Inhoud tonen' : 'Inhoud verbergen';
 button.setAttribute('aria-expanded', String(!panel.hidden));
 document.getElementById('app').classList.toggle('focus-hidden', panel.hidden);
}
function toggleFocus() {
 outlineCollapsed = !outlineCollapsed;
 setOutlineVisibility(!!document.querySelector('#content .markdown-content'));
}
function updateDocumentOutline() {
 const body = document.querySelector('#content .markdown-content');
 const nav = document.getElementById('documentOutline');
 outlineHeadings = body ? Array.from(body.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(heading => !heading.closest('.frontmatter, .backlinks-section')) : [];
 setOutlineVisibility(!!body);
 nav.replaceChildren();
 if (!body) return;
 if (!outlineHeadings.length) {
  const message = document.createElement('p');
  message.textContent = 'Dit document heeft nog geen koppen.';
  nav.append(message); return;
 }
 const minimum = Math.min(...outlineHeadings.map(heading => Number(heading.tagName.slice(1))));
 for (const heading of outlineHeadings) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = heading.textContent.trim() || 'Kop zonder tekst';
  button.style.paddingLeft = (Number(heading.tagName.slice(1)) - minimum) * 12 + 8 + 'px';
  button.addEventListener('click', () => {
   if (window.innerWidth <= 900) { outlineCollapsed = true; setOutlineVisibility(true); }
   heading.scrollIntoView({behavior:'auto', block:'start'});
   for (const item of nav.querySelectorAll('button')) item.removeAttribute('aria-current');
   button.setAttribute('aria-current', 'location');
  });
  nav.append(button);
 }
}
let outlineTimer;
const outlineObserver = new MutationObserver(() => {
 clearTimeout(outlineTimer);
 outlineTimer = setTimeout(updateDocumentOutline, 100);
});
outlineObserver.observe(document.getElementById('content'), {childList:true, subtree:true, characterData:true});
updateDocumentOutline();

async function createNewFolder(){
 const target=document.getElementById('newItemTarget').value;
 const parent=folderHandlesByPath.get(target)||directoryHandles[0];
 if(!parent)return showNotification('Open eerst een map','error');
 try{
  if(!(await verifyPermission(parent,'readwrite')))return showNotification('Open de map opnieuw en geef toestemming om wijzigingen te bewaren.','error');
  const answer=prompt('Hoe heet de nieuwe map?');if(answer===null)return;
  const name=answer.trim();
  if(!name||name==='.'||name==='..'||/[\/\\\0]/.test(name))return showNotification('Vul een mapnaam in zonder schuine strepen.','error');
  for await(const entry of parent.values()){if(entry.name.toLowerCase()===name.toLowerCase())return showNotification('Er bestaat al een bestand of map met deze naam.','error');}
  const handle=await parent.getDirectoryHandle(name,{create:true});
  await loadFiles();
  showNotification('Map aangemaakt: '+name);
 }catch(error){showNotification('Map aanmaken mislukt: '+error.message,'error');}
}
document.getElementById('fileList').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[role="button"]')){event.preventDefault();event.target.click();}});
window.addEventListener('beforeunload',event=>{if(wysiwygDirty){event.preventDefault();event.returnValue='';}});
if(!('showDirectoryPicker' in window)){for(const button of document.querySelectorAll('.start-folder')){button.disabled=true;button.textContent='Open Schrijfkamer in Chrome of Edge';}}

updateProjectControls();

function syncTaskCheckboxes(editor) {
 for (const checkbox of editor.querySelectorAll('input[type="checkbox"]')) checkbox.toggleAttribute('checked', checkbox.checked);
}
function placeTaskCaret(editor, force = false) {
 const selection=window.getSelection();
 if(!selection?.rangeCount || !selection.isCollapsed)return;
 const range=selection.getRangeAt(0), node=range.startContainer;
 const element=node.nodeType===1?node:node.parentElement;
 const item=element?.closest('li');
 if(!item || !editor.contains(item))return;
 const box=item.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
 if(!box)return;
 let space=box.nextSibling;
 if(space?.nodeType!==3){space=document.createTextNode(' ');box.after(space);}
 else if(!space.data.startsWith(' '))space.insertData(0,' ');
 const after=document.createRange();after.setStart(space,1);after.collapse(true);
 if(force || range.compareBoundaryPoints(Range.START_TO_START,after)<0){selection.removeAllRanges();selection.addRange(after);}
}
function prepareTaskLists(editor) {
 for (const checkbox of editor.querySelectorAll('li input[type="checkbox"]')) {
  checkbox.disabled = false;
  checkbox.setAttribute('aria-label', 'Taak afvinken');
  const list = checkbox.closest('li')?.parentElement;
  if (list?.matches('ul,ol')) list.dataset.taskList = 'true';
 }
 for (const list of editor.querySelectorAll('[data-task-list]')) {
  for (const item of list.children) {
   if (item.tagName !== 'LI' || item.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]')) continue;
   const box = document.createElement('input'); box.type='checkbox'; box.setAttribute('aria-label','Taak afvinken');
   item.prepend(box, document.createTextNode(' '));
  }
 }
 placeTaskCaret(editor);
}
function insertTaskList() {
 const editor=document.getElementById('wysiwygEditor'); if(!editor)return;
 editor.focus();
 const selectedList=()=>{
  const node=window.getSelection()?.anchorNode;
  const element=node?.nodeType===1?node:node?.parentElement;
  return element&&editor.contains(element)?element.closest('ul,ol'):null;
 };
 let list=selectedList();
 if(!list){document.execCommand('insertUnorderedList',false);list=selectedList();}
 if(list){list.dataset.taskList='true';prepareTaskLists(editor);}
 else {document.execCommand('insertHTML',false,'<ul data-task-list="true"><li><input type="checkbox" aria-label="Taak afvinken"> Nieuwe taak</li></ul>');}
 placeTaskCaret(editor,true);
 wysiwygDirty=true;updateWysiwygModifiedState();
}

// Keep creation and folder management compact, including keyboard dismissal.
document.querySelectorAll('.sidebar-menu').forEach(menu => {
 menu.addEventListener('toggle', () => {
  if(menu.open) document.querySelectorAll('.sidebar-menu').forEach(other => {if(other !== menu) other.open = false;});
 });
 menu.addEventListener('click', event => {if(event.target.closest('button')) menu.open = false;});
});
document.addEventListener('click', event => {
 if(!event.target.closest('.sidebar-menu')) document.querySelectorAll('.sidebar-menu').forEach(menu => {menu.open=false;});
});
document.addEventListener('keydown', event => {
 if(event.key === 'Escape') document.querySelectorAll('.sidebar-menu[open]').forEach(menu => {menu.open=false;menu.querySelector('summary').focus();});
});
