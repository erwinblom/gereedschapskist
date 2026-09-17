# Offerte JSON versie 1

UTF-8 JSON met `format: "offerte"`, `version: 1`, `quotes: []`.

Per offerte:
- `id`: unieke niet-lege tekst, maximaal 100 tekens.
- `state`: `draft`, `sent`, `accepted` of `declined` (handmatig).
- `title`: niet-lege tekst, maximaal 200 tekens.
- `reference`: tekst, maximaal 100 tekens; geen automatische of unieke nummering.
- `date`, `validUntil`: leeg of geldige kalenderdatum YYYY-MM-DD vanaf 1900. Geldigheid niet vóór de offertedatum.
- `customer`: tekst, maximaal 200 tekens.
- `address`: tekst, maximaal 2000 tekens.
- `email`: tekst, maximaal 254 tekens. Browser controleert de syntaxis bij formulierbewerkingen; import controleert type en lengte.
- `intro`: tekst, maximaal 10000 tekens.
- `conditions`: tekst, maximaal 20000 tekens.
- `business`: onafhankelijke kopie van `name` (200), `address` (2000), `email` (254), `kvk` (100) en `vat` (100), alle tekst.
- `lines`: maximaal 100 regels met `description` (tekst, maximaal 2000), `quantity100` (geheel getal 1–1000000), `cents` (geheel getal 0–100000000), `vat` (0, 9 of 21).

`quantity100` is het aantal in honderdsten: 150 betekent 1,5. `cents` is prijs per stuk in eurocenten. Het netto regeltotaal is afgerond(quantity100 × cents / 100). Btw per regel is afgerond(netto × vat / 100). Alle opgeslagen rekenwaarden zijn gehele getallen; totalen worden afgeleid.

Import valideert de hele verzameling voordat iets wordt vervangen en neemt alleen bekende velden over. Maximaal 5000 offertes en 20 MB per import zijn beschermingsgrenzen, geen prestatiegaranties. Onbekende versies worden geweigerd. Bestanden zijn niet versleuteld. Er is geen vergrendeling of extern bewijs bij statussen.

## Contactovername

Optionele velden per offerte: `contactPerson` (tekst, maximaal 160 tekens) en `sourceContactId` (tekst, maximaal 100 tekens). Oudere bestanden zonder deze velden blijven geldig; ontbrekende waarden worden lege tekst. De broncode is alleen een verwijzing en veroorzaakt geen synchronisatie. Een offerte bewaart altijd een zelfstandige kopie. Oudere appversies kunnen deze nieuwe velden bij import laten vervallen; gebruik deze versie of nieuwer.
