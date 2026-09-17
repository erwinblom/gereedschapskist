# Planner JSON versie 1

UTF-8 JSON met `format: "publicatieplanner"`, `version: 1` en `items: []`.

Een item bevat:
- `id`: unieke niet-lege tekst, maximaal 100 tekens.
- `title`: niet-lege tekst, maximaal 180 tekens.
- `channel`: niet-lege tekst, maximaal 100 tekens.
- `state`: `idea`, `draft`, `ready` of `published`.
- `date`: leeg of geldige kalenderdatum YYYY-MM-DD van 1900 tot en met 9999; geen tijd of tijdzone.
- `text`: concepttekst, maximaal 100000 tekens. Witruimte blijft behouden.
- `notes`: eigen notities, maximaal 10000 tekens.
- `url`: leeg of HTTP(S)-link zonder inloggegevens, maximaal 2000 tekens.

Import valideert de hele verzameling voor vervanging, neemt alleen bekende velden over en weigert onbekende versies. Maximaal 5000 items en 20 MB; beschermingsgrenzen, geen prestatiegarantie. De kalender begint op maandag. Status published wordt door de gebruiker toegekend en is geen extern geverifieerde publicatiestatus.

Lijstsortering: datum oplopend, vervolgens titel; ongedateerde items onderaan. Filters, gekozen maand en schermweergave zijn geen brongegevens en staan niet in het exportbestand. Geen synchronisatie of versleuteling.
