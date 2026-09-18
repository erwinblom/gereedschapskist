'use strict';
// ZIP without compression: standard, portable files without an external service.
window.GereedschapskistBackup=async function(root){
 const encoder=new TextEncoder(),files=[],parts=[],central=[];let total=0,offset=0;
 const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
 async function walk(dir,path=''){
  for await(const [name,handle] of dir.entries()){
   if(name==='.'||name==='..'||/[\\/]/.test(name))throw Error('Ongeldige bestandsnaam in de werkmap.');
   const entry=path+name;
   if(handle.kind==='directory')await walk(handle,entry+'/');
   else{const file=await handle.getFile();total+=file.size;if(total>250*1024*1024||files.length>=10000)throw Error('Deze werkmap is te groot voor een browserback-up. Kopieer de map via je computer.');files.push({path:entry,file,handle});}
  }
 }
 await walk(root);if(!files.length)throw Error('Je werkmap bevat nog geen bestanden. Bewaar eerst je werk.');
 for(const item of files){
  const bytes=new Uint8Array(await item.file.arrayBuffer()),name=encoder.encode(root.name+'/'+item.path);if(name.length>65535)throw Error('Een bestandspad is te lang.');
  let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0;
  const date=new Date(item.file.lastModified),year=Math.max(1980,Math.min(2107,date.getFullYear())),day=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate(),time=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1);
  function header(size,signature){const a=new Uint8Array(size),v=new DataView(a.buffer);v.setUint32(0,signature,true);return [a,v]}
  const [local,l]=header(30,0x04034b50);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(10,time,true);l.setUint16(12,day,true);l.setUint32(14,crc,true);l.setUint32(18,bytes.length,true);l.setUint32(22,bytes.length,true);l.setUint16(26,name.length,true);
  parts.push(local,name,bytes);
  const [record,c]=header(46,0x02014b50);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(12,time,true);c.setUint16(14,day,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.push(record,name);offset+=30+name.length+bytes.length;
 }
 // Reject changed files rather than presenting a silently stale backup as current.
 for(const item of files){const now=await item.handle.getFile();if(now.size!==item.file.size||now.lastModified!==item.file.lastModified)throw Error('Een bestand is ondertussen gewijzigd. Probeer opnieuw nadat je klaar bent met bewaren.');}
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,central.reduce((n,a)=>n+a.length,0),true);v.setUint32(16,offset,true);
 return {blob:new Blob([...parts,...central,end],{type:'application/zip'}),count:files.length};
};
