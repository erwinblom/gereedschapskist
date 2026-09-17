# Uren JSON versie 1

UTF-8 JSON met `format: "uren"`, `version: 1`, `entries: []`.

Registratie:
- `id`: unieke niet-lege tekst, maximaal 100 tekens.
- `date`: geldige lokale kalenderdatum YYYY-MM-DD, 1900–9999.
- `client`, `project`: niet-lege tekst, maximaal 200 tekens.
- `description`: niet-lege tekst, maximaal 2000 tekens.
- `minutes`: geheel getal 1–1440; enige opgeslagen maat voor tijdsduur.
- `billable`: boolean.

Totalen en weekgrenzen worden berekend. Geen start/eindtijden of tijdzones. Import valideert de hele collectie voor vervanging en neemt alleen bekende velden over. Beschermingsgrenzen: 20 MB en 20000 registraties; geen prestatiegarantie. Onbekende versies worden geweigerd. Bestanden zijn niet versleuteld.

Optionele koppelvelden per registratie:
- `rateCents`: null of geheel aantal eurocenten per uur, 0–100000000; voor factureren minimaal 1.
- `vat`: 0, 9 of 21.
- `sourceTaskId`, `sourceTransferId`: tekst, maximaal 100 tekens.
- `billing`: `{batchId, status, signature}` met status `prepared` of `invoiced`. Bij invoiced ook `invoiceId` en `number`. `signature` is SHA-256 van de oorspronkelijke facturabele velden; zie ../../koppelingen/FORMAAT.md.
Deze velden blijven behouden bij bewaren, openen en bewerken. Kopiëren maakt een nieuwe registratie zonder bron- of factuurverwijzing. Oudere appversies herkennen deze extra velden niet en kunnen ze verliezen; gebruik de huidige versie.
