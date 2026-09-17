# Controle van het voorbereidingspakket

13 september 2026.

## Geslaagd

- Starten via een lokaal HTML-bestand in een afzonderlijk Chrome-testprofiel.
- Projectkeuze, lezen, opgemaakt bewerken, opslaan en zoeken.
- Opmaakknoppen, taken, metadata en documentlinks behouden bij opslaan.
- Afbeelding, videolink en documentlink invoegen.
- Hernoemen, verplaatsen, nieuwe map en nieuw bestand.
- Bescherming tegen een extern veranderd bestand.
- Verwijderen na bevestiging en annuleren van verwijderen.
- Focus, inhoudsopgave en thema wisselen.
- Geen externe netwerkverzoeken tijdens deze proef.
- Zeven voorbeeldbestanden en elf interne voorbeeldlinks gecontroleerd.
- Alle scripts syntactisch gecontroleerd; alle lokale HTML-assets en documentatielinks aanwezig.
- Vier bibliotheekbestanden gelijk aan officiële distributies; hashes in vendor/manifest.json.
- Geen privégeschiedenis, sleutelbestanden, persoonlijke mapnamen of persoonlijke project-ID's aangetroffen in het pakket.

## Grenzen van de controle

De browserproef gebruikt gesimuleerde maphandles. De echte toestemmingsdialoog, blijvende browsertoegang en Edge zijn in deze ronde niet apart getest. Test met de meegeleverde demomap: open, wijzig een zin, sla op, sluit de browser, open opnieuw en controleer de tekst. Bij opnieuw openen kan de browser weer toestemming vragen.

De nulmeting voor netwerkverkeer geldt voor de proef. Webafbeeldingen en het bewust afspelen van YouTube kunnen wel verbinding maken; zie PRIVACY.md.

De toestemming van Joost Plattel is op 13 september 2026 verwerkt: de applicatie krijgt MIT met naamsvermelding; bibliotheken houden hun eigen licenties. Zie HERKOMST.md. Dit pakket is voorbereid voor publicatie en nog niet openbaar gepubliceerd.
