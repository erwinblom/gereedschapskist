const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../projects.js'),'utf8');
const fn=source.slice(source.indexOf('function projectStartPath'),source.indexOf('function defaultStartPath'));
const context={};vm.createContext(context);vm.runInContext(fn,context);const choose=context.projectStartPath;
test('start folder stays inside selected project and falls back safely',()=>{
 const paths=['Werk/Roman','Werk/Roman/Concepten','Werk/Anders'];
 assert.equal(choose(paths,'Werk/Roman',null),'Werk/Roman/Inbox');
 assert.equal(choose(paths,'Werk/Roman','Werk/Roman/Concepten'),'Werk/Roman/Concepten');
 assert.equal(choose(paths,'Werk/Roman','Werk/Anders'),'Werk/Roman/Inbox');
 assert.equal(choose(paths,'Werk/Roman','Werk/Roman/Verdwenen'),'Werk/Roman/Inbox');
 assert.equal(choose(paths,'all','Werk/Roman'),'');
});
