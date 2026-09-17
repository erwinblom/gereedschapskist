'use strict';
// One fictional project shared by the nine independent tools.
window.GereedschapskistExamples = function(tool) {
 const now=new Date(),pad=n=>String(n).padStart(2,'0');
 const day=offset=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
 const date=day(0),company={name:'Maakruimte Voorbeeld',address:'Voorbeeldstraat 1\n1234 AB Voorbeeldstad',email:'maakruimte@example.com',kvk:'',vat:''};
 const contacts={format:'contacten',version:1,contacts:[
  {id:'voorbeeld-sam',name:'Sam Voorbeeld',organization:'Buurtwerkplaats De Proeftuin',role:'Projectcoördinator',email:'sam@example.com',phone:'',tags:['buurtwerkplaats','opdrachtgever'],notes:'Fictief contact. Coördineert de eerste reparatiemiddag.',nextDate:day(1),nextAction:'Voorstel voor de workshop bespreken',conversations:[{id:'voorbeeld-gesprek',date:day(-2),text:'Oefennotitie: we willen een toegankelijke werkplaats waar buurtbewoners samen repareren en kennis delen.'}]},
  {id:'voorbeeld-noor',name:'Noor Demo',organization:'Buurtwerkplaats De Proeftuin',role:'Vrijwilligerscoördinator',email:'noor@example.com',phone:'',tags:['vrijwilligers','buurtwerkplaats'],notes:'Fictief contact. Verzamelt ideeën en helpt vrijwilligers op weg.',nextDate:date,nextAction:'Lijst met benodigd gereedschap doornemen',conversations:[]}
 ]};
 const quote={id:'voorbeeld-offerte',state:'draft',title:'Reparatieworkshop voor de buurtwerkplaats',reference:'VOORBEELD',date,validUntil:day(14),customer:'Buurtwerkplaats De Proeftuin',contactPerson:'Sam Voorbeeld',sourceContactId:'voorbeeld-sam',address:'Oefenplein 2\n1234 AB Voorbeeldstad',email:'sam@example.com',intro:'Fictief voorstel: samen met bewoners een eerste reparatiemiddag voorbereiden en begeleiden.',conditions:'Oefenmateriaal — niet versturen.\nPlanning: in overleg.\nInbegrepen: voorbereiding en begeleiding.\nMaterialen spreken we vooraf af.',business:company,lines:[{description:'Voorbereiding (uren)',quantity100:200,cents:7500,vat:21},{description:'Reparatieworkshop begeleiden',quantity100:100,cents:45000,vat:21}]};
 const sources=window.GereedschapskistExampleSources;
 const documents={
  'Buurtwerkplaats — projectplan.md':'# Buurtwerkplaats De Proeftuin\n\n> Voorbeeldproject met fictieve afspraken. Je kunt deze tekst veilig bewerken.\n\n## Waarom?\nEen plek waar buurtbewoners kapotte spullen repareren, elkaar ontmoeten en kennis delen.\n\n## Eerste proefmiddag\nWe beginnen klein: een ruimte, drie vrijwilligers en vijf reparaties. Sam coördineert het project; Noor helpt vrijwilligers op weg.\n\n## Aanpak\n- [x] Idee met bewoners bespreken\n- [ ] Een geschikte ruimte vinden\n- [ ] Gereedschap verzamelen\n- [ ] De eerste reparatiemiddag plannen\n\n## Hoe weten we of het werkt?\nNa afloop vragen we wat bezoekers hebben geleerd en wat de volgende keer eenvoudiger kan.\n\nBekijk ook [[Buurtwerkplaats — gespreksnotities.md]].\n',
  'Buurtwerkplaats — gespreksnotities.md':'# Gesprek met Sam en Noor\n\n> Fictieve gespreksnotities om Schrijven uit te proberen.\n\n## Wat hoorden we?\nBewoners willen elkaar helpen, maar missen een plek en gereedschap.\n\n## Afgesproken\nSam zoekt een ruimte. Noor spreekt twee vrijwilligers. We maken een voorstel voor een eerste workshop.\n\n## Open vraag\nHoe zorgen we dat ook mensen zonder technische ervaring durven meedoen?\n'
 };
 switch(tool){
  case 'Werkbank': return Object.entries(documents).map(([name,content])=>[name,{name,content,relativePath:'converter/'+name}]);
  case 'Contacten': return contacts;
  case 'Offerte': return {format:'offerte',version:1,quotes:[quote]};
  case 'Ping': return {format:'ping-local',version:2,sequences:{},business:{...company,iban:''},invoices:[{id:'voorbeeld-factuur',state:'draft',title:quote.title,date,deliveryDate:date,due:day(14),customer:quote.customer,contactPerson:quote.contactPerson,address:quote.address,email:quote.email,note:'OEFENFACTUUR — niet versturen. Deze factuur hoort bij een fictieve workshop.',lines:[{description:'Voorbereiding (uren)',quantity:2,cents:7500,vat:21},{description:'Reparatieworkshop begeleiden',quantity:1,cents:45000,vat:21}]}]};
  case 'Projectbord': return {format:'projectbord',version:1,name:'Buurtwerkplaats De Proeftuin',tasks:[
   {id:'voorbeeld-taak-1',title:'Een ruimte voor de proefmiddag vinden',notes:'Sam bekijkt welke plek toegankelijk is en voldoende werktafels heeft.',state:'doing',priority:'high',due:day(3)},
   {id:'voorbeeld-taak-2',title:'Gereedschap verzamelen',notes:'Noor vraagt vrijwilligers welk gereedschap zij kunnen meenemen.',state:'todo',priority:'normal',due:day(5)},
   {id:'voorbeeld-taak-3',title:'Bewoners uitnodigen',notes:'Maak een korte uitnodiging met tijd, plek en wat mensen kunnen meenemen.',state:'todo',priority:'normal',due:day(7)},
   {id:'voorbeeld-taak-4',title:'Idee met bewoners bespreken',notes:'Fictief voorbeeld: de eerste reacties zijn verzameld.',state:'done',priority:'normal',due:day(-2)}]};
  case 'Bronnenkast': return structuredClone(sources);
  case 'Uren': return {format:'uren',version:1,entries:[{id:'voorbeeld-uren-1',date,client:'Buurtwerkplaats De Proeftuin',project:'Eerste reparatiemiddag',description:'Workshop voorbereiden',minutes:120,billable:true},{id:'voorbeeld-uren-2',date,client:'Buurtwerkplaats De Proeftuin',project:'Eerste reparatiemiddag',description:'Workshop begeleiden',minutes:180,billable:true},{id:'voorbeeld-uren-3',date,client:'Eigen organisatie',project:'Buurtwerkplaats',description:'Ideeën en bronnen verzamelen',minutes:45,billable:false}]};
  case 'Publicatieplanner': return {format:'publicatieplanner',version:2,items:[{id:'voorbeeld-plan-1',kind:'project',title:'Buurtwerkplaats De Proeftuin opzetten',channel:'',state:'active',date:day(-2),endDate:day(14),text:'Samen repareren, ontmoeten en kennis delen.',notes:'Fictief project. Losse taken staan in het voorbeeld van Doen.',url:''},{id:'voorbeeld-plan-2',kind:'meeting',title:'Met bewoners de proefmiddag voorbereiden',channel:'',state:'draft',date:day(3),endDate:'',text:'Sam en Noor verzamelen ideeën en spreken de praktische zaken door.',notes:'Fictieve bijeenkomst.',url:''},{id:'voorbeeld-plan-3',kind:'publication',title:'Uitnodiging: repareer mee in de buurt',channel:'Nieuwsbrief',state:'draft',date:day(7),endDate:'',text:'Heb je iets dat kapot is? Kom samen met buurtgenoten kijken of we het kunnen repareren.\n\nVul hier de echte datum en locatie in.',notes:'Voorbeeldtekst — nog niet publiceren.',url:''}]};
  case 'Kasboek': return {format:'kasboek',version:1,entries:[{id:'voorbeeld-boeking-1',date,type:'income',party:'Buurtwerkplaats De Proeftuin',description:'Ontvangen betaling reparatieworkshop (fictief)',category:'Workshops',cents:72600,receipt:null},{id:'voorbeeld-boeking-2',date,type:'expense',party:'Voorbeeldwinkel',description:'Materialen voor de reparatiemiddag (fictief)',category:'Materialen',cents:4850,receipt:null},{id:'voorbeeld-boeking-3',date,type:'expense',party:'Voorbeeldwinkel',description:'Koffie en thee voor vrijwilligers (fictief)',category:'Bijeenkomst',cents:1500,receipt:null}]};
 }
};

window.GereedschapskistExampleSources = {
  "format": "bronnenkast",
  "version": 1,
  "items": [
    {
      "id": "start-01",
      "title": "Buurtzorg: anders organiseren",
      "source": "Buurtzorg International",
      "url": "https://www.buurtzorg.com/about-us/",
      "category": "Sociaal",
      "tags": [
        "zorg",
        "zelforganisatie"
      ],
      "summary": "Buurtzorg beschrijft een verpleegkundig geleid zorgmodel waarin de cliënt centraal staat en teams decentraal werken. De organisatie presenteert dit als alternatief voor sterker opgeknipte zorgorganisaties.",
      "notes": "Onderzoeksvraag: welke beslissingen kun je bij de mensen leggen die het werk uitvoeren? De bron is de organisatie zelf; resultaatclaims vragen onafhankelijke controle.",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    },
    {
      "id": "start-02",
      "title": "Repair Café: repareren als ontmoeting",
      "source": "Repair Café International",
      "url": "https://www.repaircafe.org/en/about/",
      "category": "Sociaal",
      "tags": [
        "reparatie",
        "gemeenschap"
      ],
      "summary": "Repair Cafés brengen mensen samen om spullen te repareren met hulp van vrijwilligers. Naast langer gebruik van producten draait het initiatief om het delen van vaardigheden.",
      "notes": "Onderzoeksvraag: hoe verandert een praktische activiteit in een blijvend lokaal netwerk?",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    },
    {
      "id": "start-03",
      "title": "Decidim: digitale democratie",
      "source": "Decidim",
      "url": "https://docs.decidim.org/en/develop/features/general-description.html",
      "category": "Beide",
      "tags": [
        "democratie",
        "open source"
      ],
      "summary": "Decidim is vrije software voor participatie. Organisaties kunnen er voorstellen, gesprekken, bijeenkomsten en participatieve besluitvorming mee organiseren.",
      "notes": "Onderzoeksvraag: hoe verbind je online deelname aan echte zeggenschap? Beschikbare functies bewijzen nog geen democratische impact.",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    },
    {
      "id": "start-04",
      "title": "Precious Plastic: kennis om lokaal te recyclen",
      "source": "Precious Plastic",
      "url": "https://www.preciousplastic.com/about/open-source",
      "category": "Beide",
      "tags": [
        "open hardware",
        "circulariteit"
      ],
      "summary": "Precious Plastic deelt ontwerpen, instructies en andere kennis voor plasticrecycling. Het uitgangspunt is dat lokale makers die kennis kunnen toepassen, aanpassen en verder delen.",
      "notes": "Onderzoeksvraag: wat is er naast een open ontwerp nodig om een lokale werkplaats draaiend te houden?",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    },
    {
      "id": "start-05",
      "title": "OpenStreetMap: een kaart als gemeenschappelijk werk",
      "source": "OpenStreetMap",
      "url": "https://www.openstreetmap.org/about",
      "category": "Beide",
      "tags": [
        "open data",
        "gemeenschap"
      ],
      "summary": "OpenStreetMap is een wereldkaart die door een gemeenschap wordt opgebouwd en onderhouden. De kaartgegevens zijn beschikbaar als open data onder licentievoorwaarden.",
      "notes": "Onderzoeksvraag: hoe organiseer je kwaliteit en onderhoud wanneer iedereen kan bijdragen?",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    },
    {
      "id": "start-06",
      "title": "Home Assistant: meer controle over je slimme huis",
      "source": "Home Assistant",
      "url": "https://www.home-assistant.io/",
      "category": "Technisch",
      "tags": [
        "lokale software",
        "privacy"
      ],
      "summary": "Home Assistant is open-source-software voor huisautomatisering die lokale controle en privacy centraal stelt. Het verbindt apparaten en maakt automatiseringen mogelijk.",
      "notes": "Onderzoeksvraag: hoeveel afhankelijkheid van leveranciers kun je verminderen? De mogelijkheden verschillen per apparaat en integratie.",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    },
    {
      "id": "start-07",
      "title": "Raspberry Pi Foundation: leren maken met computers",
      "source": "Raspberry Pi Foundation",
      "url": "https://www.raspberrypi.org/about/",
      "category": "Sociaal",
      "tags": [
        "onderwijs",
        "digitale vaardigheden"
      ],
      "summary": "De Raspberry Pi Foundation is een educatieve organisatie die mensen helpt kennis en vaardigheden rond computers en digitale technologie te ontwikkelen.",
      "notes": "Onderzoeksvraag: hoe maak je van toegang tot technologie ook het vermogen om zelf iets te maken?",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    },
    {
      "id": "start-08",
      "title": "WikiHouse: open ontwerpen voor bouwen",
      "source": "WikiHouse",
      "url": "https://www.wikihouse.cc/",
      "category": "Technisch",
      "tags": [
        "open hardware",
        "bouwen"
      ],
      "summary": "WikiHouse ontwikkelt een open-source-bouwsysteem met digitaal vervaardigde onderdelen. Het project onderzoekt hoe digitale ontwerpen het maken van gebouwen toegankelijker kunnen maken.",
      "notes": "Onderzoeksvraag: welke onderdelen kun je standaardiseren zonder de lokale situatie te negeren? Een open ontwerp neemt vergunningen of constructieve eisen niet weg.",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    },
    {
      "id": "start-09",
      "title": "Local-first: software die begint bij jouw gegevens",
      "source": "Ink & Switch",
      "url": "https://www.inkandswitch.com/essay/local-first/",
      "category": "Technisch",
      "tags": [
        "lokale software",
        "eigenaarschap"
      ],
      "summary": "Dit essay uit 2019 beschrijft principes voor software die lokaal werken en zeggenschap over gegevens combineert met samenwerking. Het verkent ook technische mogelijkheden en beperkingen.",
      "notes": "Onderzoeksvraag: welke functies blijven bruikbaar als de maker of een clouddienst verdwijnt? Dit is een ontwerpvisie, geen garantie voor elke lokale app.",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    },
    {
      "id": "start-10",
      "title": "ActivityPub: sociale netwerken laten samenwerken",
      "source": "W3C",
      "url": "https://www.w3.org/TR/activitypub/",
      "category": "Technisch",
      "tags": [
        "open standaarden",
        "sociale netwerken"
      ],
      "summary": "ActivityPub is een W3C-standaard voor gedecentraliseerde sociale netwerktoepassingen. De specificatie beschrijft communicatie tussen gebruikerssoftware en servers en tussen servers onderling.",
      "notes": "Onderzoeksvraag: wat levert een gedeeld protocol op voor keuzevrijheid? Een technische standaard lost moderatie en bestuur niet vanzelf op.",
      "quote": "",
      "favorite": false,
      "checked": "2026-09-16"
    }
  ]
};
