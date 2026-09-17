# Kasboek JSON, versie 1

Een UTF-8 JSON-object met `format: "kasboek"`, `version: 1` en `entries`.
Iedere boeking bevat:

- `id`: unieke tekenreeks, maximaal 100 tekens.
- `date`: geldige datum `YYYY-MM-DD`, vanaf 1900.
- `type`: `income` of `expense`.
- `party`: partij, verplicht, maximaal 200 tekens.
- `description`: omschrijving, verplicht, maximaal 2000 tekens.
- `category`: categorie, verplicht, maximaal 100 tekens.
- `cents`: positief geheel aantal eurocenten, maximaal 100000000.
- `receipt`: `null` of `{name, size, mime, base64}`.

Een bon bevat oorspronkelijke bytes als base64 zonder data-URL-prefix. `size` is de oorspronkelijke bestandsgrootte. Ondersteunde MIME-typen: application/pdf, image/png, image/jpeg, image/webp. De bestandsnaam bevat geen pad en is maximaal 240 tekens. Grootte maximaal 2.000.000 bytes per bon; het totale JSON-bestand maximaal 20.000.000 bytes en 10.000 boekingen.

Invoer controleert velden, unieke IDs, datums, base64, bestandsgrootte en bestandssignatuur. Dit is geen virusscan. Bonnen worden uitsluitend als bestand gedownload. Bestanden zijn niet versleuteld.

CSV is UTF-8 met BOM en puntkomma's. Bedragen gebruiken een decimale komma; centen zijn ook afzonderlijk opgenomen. Potentiële spreadsheetformules in tekst krijgen een apostrof. CSV is een uitvoerformaat en bevat geen bonbytes. Gebruik JSON voor volledige overdracht en herstel.

Optioneel per boeking: `sourceInvoiceId` (maximaal 100 tekens), `sourceInvoiceNumber` (YYYY-NNN met 3 tot 6 volgnummercijfers) en `sourceInvoiceKey` (SHA-256 van uitgeveridentiteit plus nummer). Hiermee voorkomt Ontvangst overnemen herhaling binnen dezelfde administratie. De metadata blijft bij bewerken behouden; gebruik de huidige appversie.
