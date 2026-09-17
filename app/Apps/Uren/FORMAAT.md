# Uren JSON versie 1

UTF-8 JSON met `format: "uren"`, `version: 1`, `entries: []`.

Registratie:
- `id`: unieke niet-lege tekst, maximaal 100 tekens.
- `date`: geldige lokale kalenderdatum YYYY-MM-DD, 1900–9999.
- `client`, `project`: niet-lege tekst, maximaal 120 tekens.
- `description`: niet-lege tekst, maximaal 2000 tekens.
- `minutes`: geheel getal 1–1440; enige opgeslagen maat voor tijdsduur.
- `billable`: boolean.

Totalen en weekgrenzen worden berekend. Geen tarieven, start/eindtijden of tijdzones. Import valideert de hele collectie voor vervanging en neemt alleen bekende velden over. Beschermingsgrenzen: 20 MB en 20000 registraties; geen prestatiegarantie. Onbekende versies worden geweigerd. Bestanden zijn niet versleuteld.
