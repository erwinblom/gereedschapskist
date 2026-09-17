# Contacten JSON versie 1

UTF-8 JSON met `format: "contacten"`, `version: 1`, `contacts: []`.

Contact:
- `id`: unieke niet-lege tekst, maximaal 100 tekens.
- `name`: niet-lege tekst, maximaal 160 tekens.
- `organization`, `role`: tekst, maximaal 160 tekens.
- `email`: leeg of eenvoudig gevalideerd e-mailadres, maximaal 254 tekens. Geen verificatie van bestaan of afleverbaarheid.
- `phone`: tekst, maximaal 80 tekens; geen nummercontrole.
- `notes`: tekst, maximaal 10000 tekens.
- `tags`: maximaal 20 niet-lege teksten van maximaal 60 tekens.
- `nextDate`: leeg of geldige kalenderdatum YYYY-MM-DD vanaf 1900.
- `nextAction`: tekst, maximaal 300 tekens; verplicht bij een datum.
- `conversations`: maximaal 1000 notities, ieder met een binnen het contact unieke niet-lege tekst-`id` (maximaal 100), geldige `date` en niet-lege `text` (maximaal 10000).

Import valideert de hele verzameling vóór vervanging, normaliseert bekende velden en weigert onbekende versies. Maximaal 20 MB en 5000 contacten; beschermingsgrenzen, geen prestatiegarantie. Geen versleuteling of synchronisatie. Sorteervolgorde wordt berekend: aandacht eerst, dan eerstvolgende datum en naam.
