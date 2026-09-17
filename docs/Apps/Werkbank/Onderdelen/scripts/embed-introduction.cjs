const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),marked=require(path.join(root,'Onderdelen/vendor/marked.min.js'));
const source=fs.readFileSync(path.join(root,'Werkbank/00 - Begin hier.md'),'utf8');
// Linked demo documents require a folder permission; show their names until then.
const html=marked.parse(source.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g,'**$1**'));
const file=path.join(root,'▶ Begin hier.html');let page=fs.readFileSync(file,'utf8');
const intro='<!-- introduction:start --><article class="markdown-content"><p class="eyebrow">BEGIN HIER</p>'+html+'<p><button class="edit-btn" onclick="addFolder()">Open een werkmap</button></p></article><!-- introduction:end -->';
if(page.includes('<!-- introduction:start -->'))page=page.replace(/<!-- introduction:start -->[\s\S]*?<!-- introduction:end -->/,()=>intro);
else page=page.replace(/(<div class="content" id="content">)\s*<div class="welcome">[\s\S]*?<\/div>/,(_,start)=>start+'\n'+intro);
fs.writeFileSync(file,page);
