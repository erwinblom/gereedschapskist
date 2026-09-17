# Gereedschapskist

Negen kleine tools. Geen account, installatie, externe database of API-sleutel nodig. Je werkt met je eigen bestanden.

**[Direct gebruiken](https://erwinblom.github.io/gereedschapskist/)** · **[Download voor offline gebruik](https://github.com/erwinblom/gereedschapskist/releases/latest/download/Gereedschapskist.zip)**

Download de ZIP, pak hem volledig uit en open **Begin hier.html**. De online en downloadversie hebben dezelfde bediening en gebruiken dezelfde bestanden. Ze synchroniseren niet automatisch.

| Tool | Waarvoor? |
|---|---|
| Schrijfkamer | Markdown-documenten lezen, schrijven en ordenen |
| Ping | Facturen maken en definitief vastleggen |
| Projectbord | Taken, deadlines en prioriteiten |
| Bronnenkast | Links, citaten en notities |
| Uren | Gewerkte tijd bijhouden |
| Contacten | Contactgegevens, gesprekken en vervolgacties |
| Planner | Publicaties en conceptteksten |
| Offerte | Voorstellen met prijzen en afspraken |
| Kasboek | Inkomsten, uitgaven en bonnen |

## Bewaar je werk

Gebruik de bewaarknop voor een bestand op je computer. Browseropslag is geen back-up. Bewaar het actuele bestand voordat je overstapt tussen online en offline. Vooral bij Ping gebruik je steeds één actuele administratie; werk niet onafhankelijk in meerdere kopieën.

Chrome en Edge op een computer zijn de aanbevolen browsers. Organisatiebeleid kan bestandskeuze, downloaden of maptoegang beperken. Schrijfkamer kan ook losse Markdown-bestanden openen zonder toestemming voor een hele map. De downloadversie werkt zonder netwerk; de website vraagt verbinding bij het openen.

[Privacy](app/PRIVACY.md) · [Gebruiksaanwijzing](app/LEESMIJ.txt)

## Ontwikkeling

`app/` is de enige bron voor de tools. `docs/` is de gegenereerde website voor GitHub Pages. Bewerk `app/` en voer daarna uit:

```sh
python3 scripts/build.py
python3 scripts/check.py
```

Dat maakt ook `dist/Gereedschapskist.zip`. Publiceer de ZIP en SHA256SUMS.txt bij dezelfde release als de website. GitHub Pages gebruikt `main` → `/docs`. Er zijn geen Node-pakketten of builddiensten nodig.

De bestaande technische mapnamen zijn behouden voor compatibiliteit; de zichtbare appnaam is bijvoorbeeld Schrijfkamer en Planner.

## Herkomst en licenties

Eigen code: MIT, zie [LICENSE](LICENSE). Schrijfkamer bouwt voort op **Markdown Browser van Joost Plattel**. Zie [herkomst](app/Apps/Werkbank/HERKOMST.md) en [licenties van gebruikte bibliotheken](app/Apps/Werkbank/THIRD_PARTY_NOTICES.md). Bijdragen zijn welkom via issues en pull requests.
