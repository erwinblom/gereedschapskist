# Projectbord JSON, versie 1

UTF-8 JSON met `format: "projectbord"`, `version: 1`, `name` en `tasks`.

`name`: niet-lege tekst, maximaal 100 tekens.

Elk item in `tasks` bevat:
- `id`: unieke niet-lege tekst, maximaal 100 tekens;
- `title`: niet-lege tekst, maximaal 160 tekens;
- `notes`: tekst, maximaal 10000 tekens;
- `state`: `todo`, `doing` of `done`;
- `priority`: `normal`, `high` of `low`;
- `due`: lege tekst of een geldige datum YYYY-MM-DD.

De volgorde in de lijst bepaalt de volgorde binnen de kolommen. Deadlines zijn datums zonder tijdzone; verstreken betekent vóór de lokale huidige datum, behalve bij taken in `done`. Totalen en voortgang worden berekend, niet opgeslagen.

Import valideert het volledige bestand voordat het bord wordt vervangen; onbekende velden worden niet overgenomen. Beschermingsgrenzen: 20 MB per import, 10000 taken. Dit zijn geen prestatiegaranties. Onbekende versienummers worden geweigerd. Toekomstige wijzigingen van dit formaat vereisen expliciete migratie.

Optioneel per taak: `project` (tekst, maximaal 200 tekens) en `sourceLink` (64 hextekens, bronidentiteit van overgenomen taak). Deze velden blijven behouden bij bewerken en importeren. Gebruik de huidige appversie om deze velden te behouden.
