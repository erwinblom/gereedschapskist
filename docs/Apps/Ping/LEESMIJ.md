# Ping lokaal — facturen

Open Start Ping.html in Chrome of Edge. Werk op één computer, in één Ping-venster en met één actueel gegevensbestand.

## Een factuur maken

1. Maak een nieuwe factuur. Vul je bedrijfsgegevens, klant, adres en regels in. Contacten kun je overnemen uit een Contacten-bestand of hier toevoegen.
2. Vul factuurdatum en leverdatum in. Een betaaltermijn is optioneel.
3. Klik Controleer en maak definitief. Ontbrekende gegevens verschijnen onder het formulier.
4. Controleer het document en het voorgestelde nummer. Bij de eerste factuur van een jaar kun je het eerste volgnummer kiezen; begin boven de nummers die je elders al gebruikte.
5. Klik Maak definitief. Pas nu wordt het nummer toegewezen. Annuleren verbruikt geen nummer.
6. Bewaar je gegevensbestand en bewaar of print de PDF. Je verstuurt de factuur zelf.

## Wat vaststaat

Een definitieve factuur is alleen-lezen in Ping. Nummer, datum, klantgegevens, bedrijfsgegevens, regels en berekende totalen worden samen bewaard. Aanpassingen aan bedrijfsgegevens in een nieuw concept veranderen bestaande definitieve facturen niet. Definitieve facturen zijn niet verwijderbaar of terug te zetten naar concept. Creditnota's en correctiefacturen zijn nog niet ingebouwd.

Per kalenderjaar bestaat een reeks: 2026-001, 2026-002, enzovoort. Ping bewaart de volgende waarde in het gegevensbestand. Een nieuwe jaarreeks begint op 001 tenzij je bij de eerste factuur anders kiest. Een opslagfout verbruikt geen nummer en maakt niets definitief.

## Bewaren en herstel

Browseropslag is een tussentijdse kopie. Bewaar na definitief maken altijd het actuele JSON-bestand buiten de appmap. Een PDF bevat niet je volledige administratie. Oude bestanden (versie 1) worden als concepten ingelezen; nieuwe uitvoer gebruikt versie 2 en is niet bedoeld voor oudere Ping-versies.

In dezelfde administratie blokkeert import of herstel een bestand dat definitieve facturen mist of verandert. Een achterhaald tweede venster mag geen nieuw nummer toekennen. Wis je browsergegevens of gebruik je een andere appmap/browser, dan kan Ping alleen weten wat er in het geopende bestand staat. Gebruik dus steeds het meest recente bestand, geen afzonderlijke kopieën van dezelfde administratie.

Alleen-lezen is bescherming binnen de app; JSON is open en niet cryptografisch verzegeld.

## Controle en toepassingsgebied

De controle vraagt bedrijfsnaam en adres, KvK-nummer, klantnaam en adres, omschrijving, factuurdatum, leverdatum en omschreven regels. Bij btw wordt een btw-id gevraagd; bij regels zonder btw een toelichting. Ingevulde e-mailadressen en datums worden gecontroleerd. De controle verifieert niet of registratienummers, adressen of de gekozen btw-behandeling inhoudelijk juist zijn.

Deze versie richt zich op eenvoudige Nederlandse facturen in euro. Btw-opties: 0, 9 en 21 procent. Aantallen zijn gehele getallen. Bijzondere regelingen, buitenlandse facturen, creditnota's en automatische verzending zijn niet ingebouwd.

Referentie voor de basisvelden: https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/administratie_bijhouden/facturen_maken/factuureisen/

## Contacten

Kies contact opent een Contacten-bestand. Alleen de gekozen klantgegevens gaan naar de factuur. Het adres wordt leeggemaakt en vul je zelf in. Nieuw contact maakt een bijgewerkt Contacten-bestand als download, inclusief de bestaande contacten en notities. Open de download later in Contacten. Er is geen automatische synchronisatie.

## Getest

Ontbrekende velden, annuleren zonder nummer, instelbaar startnummer, opeenvolgende nummers, jaarwisseling, vaste bedrijfsgegevens, alleen-lezen, JSON en PDF, herladen, oude bestandsversie, import met ontbrekende/gewijzigde/dubbele definitieve facturen, opslagfout en tweede venster. Contacten overnemen en nieuw contact teruglezen blijven getest. Desktop en mobiel zijn visueel bekeken.

KOPPELINGEN
Uren overnemen maakt een concept met één regel per registratie. Bedragen worden uit exacte minuten berekend. Elke omschrijving noemt tijd en tarief; aantal 1 betekent het berekende bedrag voor die registratie. Na definitief maken: Uren als gefactureerd terugmelden om in Uren schrijven het definitieve nummer vast te leggen. Boek als ontvangen maakt een overdracht voor Boekhouden nadat je betaaldatum en volledige ontvangst bevestigt. Deelbetalingen worden niet door deze koppeling verwerkt. Bewaar steeds je facturenbestand. Bewaar daarna je bijgewerkte gegevensbestand. Met Mijn werkmap staat de overdracht in Exports bij de tool; anders start een download.
