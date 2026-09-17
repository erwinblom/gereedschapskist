# Bronnenkast JSON versie 1

UTF-8 JSON: `format: "bronnenkast"`, `version: 1`, `items: []`.

Ieder item heeft:
- `id`: unieke tekst, maximaal 100 tekens.
- `title`: niet-leeg, maximaal 180 tekens.
- `source`: maker/bron, niet-leeg, maximaal 160 tekens.
- `url`: leeg of volledige HTTP(S)-URL zonder gebruikersnaam/wachtwoord, maximaal 2000 tekens.
- `category`: `Sociaal`, `Technisch` of `Beide`.
- `tags`: maximaal 20 niet-lege onderwerpen van maximaal 60 tekens.
- `summary`, `quote`, `notes`: afzonderlijke tekstvelden, elk maximaal 10000 tekens.
- `favorite`: boolean.
- `checked`: lege tekst of raadpleegdatum YYYY-MM-DD. Informatieve provenance, geen bewijs van externe controle. Bij handmatig bewerken leegt de app dit veld.

Import normaliseert de bekende velden, weigert onbekende formaatversies en valideert alles voordat de collectie verandert. Maximaal 20 MB en 5000 bronnen per import: beschermingsgrenzen, geen prestatiegarantie. Geen automatische koppeling of synchronisatie. Bestanden zijn niet versleuteld.
