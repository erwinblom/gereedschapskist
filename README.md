# Gereedschapskist

Negen kleine tools. Geen account, installatie, externe database of API-sleutel nodig. Je werkt met je eigen bestanden.

**[Direct gebruiken](https://erwinblom.github.io/gereedschapskist/)** · **[Download voor offline gebruik](https://github.com/erwinblom/gereedschapskist/releases/latest/download/Gereedschapskist.zip)**

Download de ZIP, pak hem volledig uit en open **Begin hier.html**. De online en downloadversie hebben dezelfde bediening en gebruiken dezelfde bestanden. Ze synchroniseren niet automatisch.

| Tool | Waarvoor? |
|---|---|
| Schrijven | Markdown-documenten lezen, schrijven en ordenen |
| Factureren | Facturen maken en definitief vastleggen |
| Doen | Taken, deadlines en prioriteiten |
| Verzamelen | Links, citaten en notities |
| Uren schrijven | Gewerkte tijd bijhouden |
| Contact houden | Contactgegevens, gesprekken en vervolgacties |
| Plannen | Projecten, publicaties en activiteiten |
| Offreren | Voorstellen met prijzen en afspraken |
| Boekhouden | Inkomsten, uitgaven en bonnen |

## Eerst proberen

Nieuwe gebruikers beginnen met voorbeelden rond de fictieve Buurtwerkplaats De Proeftuin. Kies Begin met mijn eigen werk voor een lege eigen werkruimte. Bestaande eigen gegevens blijven behouden. Met Bekijk voorbeelden kun je later opnieuw oefenen, apart van je eigen werk. Voorbeeldfacturen krijgen geen definitief nummer. Gedownloade JSON-voorbeelden hebben voorbeeld in de bestandsnaam en kunnen niet als eigen administratie worden geopend. Bewaar je eigen werk altijd zelf in een bestand.

## Bewaar je werk

**Bewaar bestand** downloadt je werk. Kies de volgende keer **Bestand openen** en selecteer je laatst bewaarde bestand. Bewaar opnieuw na wijzigingen. Browseropslag is geen back-up. Bewaar het actuele bestand voordat je overstapt tussen online en offline. Vooral bij Factureren gebruik je steeds één actuele administratie; werk niet onafhankelijk in meerdere kopieën.

Chrome en Edge op een computer zijn de aanbevolen browsers. Organisatiebeleid kan bestandskeuze, downloaden of maptoegang beperken. Schrijven kan ook losse Markdown-bestanden openen zonder toestemming voor een hele map. De downloadversie werkt zonder netwerk; de website vraagt verbinding bij het openen.

[Privacy](app/PRIVACY.md) · [Gebruiksaanwijzing](app/LEESMIJ.txt)

## Ontwikkeling

`app/` is de enige bron voor de tools. `docs/` is de gegenereerde website voor GitHub Pages. Bewerk `app/` en voer daarna uit:

```sh
python3 scripts/build.py
python3 scripts/check.py
```

Dat maakt ook `dist/Gereedschapskist.zip`. Publiceer de ZIP en SHA256SUMS.txt bij dezelfde release als de website. GitHub Pages gebruikt `main` → `/docs`. Er zijn geen Node-pakketten of builddiensten nodig.

De bestaande technische mapnamen zijn behouden voor compatibiliteit; de zichtbare appnaam is bijvoorbeeld Schrijven en Plannen.

## Herkomst en licenties

Eigen code: MIT, zie [LICENSE](LICENSE). Schrijfkamer bouwt voort op **Markdown Browser van Joost Plattel**. Zie [herkomst](app/Apps/Werkbank/HERKOMST.md) en [licenties van gebruikte bibliotheken](app/Apps/Werkbank/THIRD_PARTY_NOTICES.md). Bijdragen zijn welkom via issues en pull requests.
