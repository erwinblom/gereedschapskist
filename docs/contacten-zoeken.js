'use strict';
// Read contacts without changing the contact book or the receiving administration.
window.ContactenZoeken=(()=>{
 function validate(book){
  if(!book||book.format!=='contacten'||book.version!==1||!Array.isArray(book.contacts)||book.contacts.length>5000)throw Error('Kies een geldig Contacten-bestand.');
  if(!GereedschapskistMode.example&&book._gereedschapskistExample)throw Error('Dit is een voorbeeldbestand. Open je eigen contactenbestand.');
  const ids=new Set();
  for(const c of book.contacts){
   if(!c||typeof c.id!=='string'||!c.id||c.id.length>100||ids.has(c.id))throw Error('Ongeldige of dubbele contactcode.');ids.add(c.id);
   for(const [key,max]of Object.entries({name:160,organization:160,email:254}))if(typeof c[key]!=='string'||c[key].length>max)throw Error('Onvolledige contactgegevens.');
   if(!c.name.trim()||(c.address!==undefined&&(typeof c.address!=='string'||c.address.length>2000)))throw Error('Ongeldige naam of adres.');
  }
  return book;
 }
 async function fromFile(file){if(file.size>20000000)throw Error('Het contactenbestand mag maximaal 20 MB zijn.');return {book:validate(JSON.parse(await file.text())),source:file.name};}
 async function read(){
  await Werkmap.ready;
  if(GereedschapskistMode.example)return {book:validate(GereedschapskistExamples('Contacten')),source:'Voorbeeldcontacten'};
  const session=await BewaarAlles.readTool('Contacten');
  return {book:validate(session.data),source:'Contact houden · gezamenlijke werkruimte'};

 }
 const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('nl');
 function search(contacts,query){const words=normalize(query).trim().split(/\s+/).filter(Boolean);return contacts.filter(c=>words.every(word=>normalize([c.name,c.organization,c.email].join(' ')).includes(word)));}
 return {async add(contact){let result;await BewaarAlles.updateTool('Contacten',book=>{if(!book.contacts.some(c=>c.id===contact.id))book.contacts.push(contact);result=validate(book);});return result;},read,fromFile,validate,search};
})();
