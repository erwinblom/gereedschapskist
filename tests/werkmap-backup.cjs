const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;vm.runInThisContext(fs.readFileSync(__dirname+'/../app/werkmap-backup.js','utf8'));
const file=(name,text)=>({kind:'file',async getFile(){return new File([text],name,{lastModified:1700000000000})}});
const dir=(name,entries)=>({name,kind:'directory',async *entries(){yield* entries}});
(async()=>{
const root=dir('Mijn werk',[['Schrijven',dir('Schrijven',[['ideeën.md',file('ideeën.md','# Hallo\nÉén idee.')]])],['Boekhouden',dir('Boekhouden',[['data.json',file('data.json','{"bedrag":125}')],['bon.png',file('bon.png',new Uint8Array([0,255,1,2]))]])]]);
const result=await GereedschapskistBackup(root);assert.equal(result.count,3);fs.writeFileSync('/tmp/gk-backup-test.zip',Buffer.from(await result.blob.arrayBuffer()));
await assert.rejects(()=>GereedschapskistBackup(dir('Leeg',[])),/nog geen bestanden/);
await assert.rejects(()=>GereedschapskistBackup(dir('Fout',[['x',{kind:'file',getFile:async()=>{throw Error('Geen toegang')}}]])),/Geen toegang/);
let calls=0;await assert.rejects(()=>GereedschapskistBackup(dir('Wijziging',[['x',{kind:'file',getFile:async()=>new File(['a'],'x',{lastModified:++calls})}]])),/ondertussen gewijzigd/);
console.log('OK: submappen, Unicode, bijlagen, lege map, leesfout, gewijzigde bestanden');
})();
