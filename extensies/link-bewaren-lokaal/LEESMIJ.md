# Link Bewaren — lokaal (proefversie 0.1.0)

Een aparte Chrome-extensie voor de Gereedschapskist. Zonder Google Sheet, Apps Script, account of API-sleutel. De bestaande Link Bewaren blijft intact: deze extensie heeft een eigen naam, icoon en opslag. Laad deze map als NIEUWE extensie; vervang de oude map niet.

## Installeren voor je eigen test

1. Pak Link-Bewaren-lokaal.zip uit op een vaste plek op je computer.
2. Open chrome://extensions in Chrome en zet rechtsboven Ontwikkelaarsmodus aan.
3. Kies Uitgepakte extensie laden en selecteer de map met manifest.json.
4. Pin Link Bewaren — lokaal via het puzzelstukje in Chrome. Het icoon is rood met een witte pijl.

Dit is een testinstallatie; nog geen Chrome Web Store-publicatie. Op beheerde computers kan installatie geblokkeerd zijn. Verzamelen blijft zonder extensie bruikbaar.

## Gebruiken

Open een webpagina, selecteer eventueel tekst en klik op het rode icoon. Controleer titel, link, citaat en notitie. Klik Bewaar link lokaal. De link blijft lokaal wachten, ook als Verzamelen gesloten is of je Chrome herstart.

Klik Open Verzamelen, gebruik je eigen werkruimte en kies Ontvang links. Maximaal 100 links per keer. Ze worden toegevoegd aan de bestaande collectie in categorie Inbox. Bestaande broncodes worden overgeslagen, bestaande inhoud wordt niet overschreven. Bewaar daarna met Bewaar alles of Bewaar bestand. De rest van de Gereedschapskist werkt zoals voorheen.

De automatische overdracht werkt alleen met:
https://erwinblom.github.io/gereedschapskist/Apps/Bronnenkast/Start%20Bronnenkast.html

De downloadversie volgt later. Wel kun je het JSON-herstelbestand ook offline in Verzamelen openen. Let op: Bestand openen vervangt de collectie na bevestiging; het voegt niet samen.

## Herstel

Een bevestigde ontvangst haalt de link uit de wachtrij, maar de extensie bewaart een herstelkopie. Onder Herstel en eigen bestanden kun je alle links exporteren als een gewoon Verzamelen JSON-bestand. Met Bied alle links opnieuw aan komen ze opnieuw beschikbaar. Bestaande broncodes worden niet dubbel toegevoegd; bewust verwijderde links kunnen terugkomen. Twee afzonderlijke captures van dezelfde URL mogen bestaan, bijvoorbeeld met verschillende citaten.

Browseropslag is geen eigen bestand. Verwijderen van deze extensie wist die opslag. Exporteer eerst, ook vóór een herinstallatie. Er is een grens van 5000 links en de opslaglimiet van Chrome. Bij een schrijffout wordt geen succes gemeld. Deze proefversie wist herstelkopieën niet automatisch.

## Privacy en grenzen

De extensie maakt geen verbinding met Google Sheets of een eigen server. Alleen de geopende pagina kan bij jouw klik worden gelezen (activeTab). De Gereedschapskist-pagina kan via de lokale verbinding wachtende links ontvangen en ontvangst bevestigen. Een online site kan in principe lezen wat je er importeert; de broncode van de Gereedschapskist blijft daarom belangrijk.

Titel, URL, geselecteerde tekst en eigen notitie worden bewaard. Geen volledige artikelen, afbeeldingen, automatische samenvattingen of synchronisatie tussen computers. Privévensters en interne Chrome-pagina's zijn geen ondersteunde capture-route. De gewone website zelf moet natuurlijk online bereikbaar zijn.

Open source onder de licentie van de Gereedschapskist. Zie LICENSE in de repository.
