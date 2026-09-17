# Ping JSON versie 2

UTF-8 JSON: `format: "ping-local"`, `version: 2`, `business`, `invoices`, `sequences`.

`business` bevat de standaardbedrijfsgegevens voor concepten: name, address, email, iban, kvk, vat (tekst).
`sequences` koppelt het viercijferige jaar aan het volgende gehele volgnummer (1–1000000). Nummer 1000000 is de grens: de reeks is dan vol. Bij import wordt de teller minstens boven alle aanwezige definitieve nummers gezet en niet onder de bestaande lokale teller teruggezet.

Elke factuur bevat id, state (draft/final), title, date, deliveryDate, due, customer, address, email, note en lines. Optioneel: contactPerson (max 160), sourceContactId (max 100). Een regel heeft description, quantity (0,01–100000; maximaal twee decimalen), cents (0–100000000) en vat (0/9/21). Bedragen zijn gehele eurocenten; btw wordt per regel afgerond. Totalen moeten veilige gehele getallen zijn.

Een definitieve factuur bevat bovendien:
- number: YYYY-NNN (minstens drie cijfers; maximaal zes).
- finalizedAt: tijdstip in ISO-notatie.
- business: zelfstandige kopie van bedrijfsgegevens.
- finalTotals: net, tax, gross en groups per btw-tarief, gecontroleerd tegen de regels.

Klantgegevens en regels blijven in de factuur zelf staan. Bestaande definitieve records kunnen niet via import of herstel worden vervangen of weggelaten. De bescherming werkt op inhoud van het record, niet als digitale handtekening. Een concept bevat geen definitieve velden.

Versie 1 wordt bij openen omgezet naar versie 2: bestaande facturen blijven concept, met een lege leverdatum. Versie 2 is niet achterwaarts compatibel met oude Ping-apps. Maximaal 5000 facturen en 500 regels per factuur; bestandslimiet 20 MB bij import en definitief maken.

Definitief maken schrijft factuur en teller in één localStorage-record. Web Locks serialiseert definitief maken in dezelfde browsercontext; vergelijking met het laatst gelezen record blokkeert achterhaalde vensters. Bij mislukte opslag wordt de wijziging niet toegepast. De garantie is lokaal en betreft één actueel administratiebestand.

Offerte-overdracht: optioneel sourceQuoteId (maximaal 100 tekens) voorkomt dubbele overname binnen de actuele administratie. draftBusiness bevat bij overgenomen concepten een zelfstandige kopie van de offertebedrijfsgegevens, plus IBAN. Bij definitief maken verhuist die naar business. Regelbedragen worden eerst op eurocenten afgerond, daarna wordt btw berekend. Gebruik voor bestanden met decimale aantallen de actuele app.
