# Ontwerpregels Gereedschapskist

Het werk krijgt de meeste aandacht, de bediening ondersteunt en uitleg blijft op de achtergrond. Deze regel geldt voor alle negen tools en voor nieuwe functies.

- Hoofdactie: één zwarte knop per werkgebied, bijvoorbeeld Nieuwe factuur. Een geopend formulier mag zijn eigen primaire bewaarknop hebben.
- Bestandsbediening: rustige omlijnde knoppen voor openen en bewaren. Onbewaarde wijzigingen worden apart gemeld met een rode stip én tekst; een download is geen bevestigde schrijfactie.
- Filters: compacte koel lichtgrijze strook (#f1f3f5), kleine labels, normale letterdikte. Zijbalkfilters blijven rustige navigatie; de actieve keuze heeft een zwarte markering.
- Weergaven: tabs met zwarte onderstreping voor de actieve keuze. Behoud aria-pressed en zichtbare toetsenbordfocus.
- Nevenacties: tekstknoppen bij het onderdeel waarop ze werken. Een koppeling bij een specifieke taak, factuur of contact hoort bij die inhoud.
- Statussen: kleine labels met zachte achtergrond (#eef0f2), zonder knopuiterlijk. Rood betekent aandacht of een fout en staat altijd naast verklarende tekst.
- Uitleg: achter Bewaren & uitleg. Opslagfouten en andere belangrijke meldingen blijven buiten dat paneel zichtbaar.
- Kleur: wit voor inhoud, koel lichtgrijs voor bediening, zwart voor hoofdacties. Geen beige, kleurdecoratie of overbodige kaders.

Implementatie: app/compact.css en app/compact.js bepalen de gedeelde hiërarchie. app/werkstatus.js verzorgt de bestandsstatus. Voeg bij nieuwe functies geen algemene zwarte knop of grote informatiebalk toe zonder de bestaande hiërarchie te toetsen. Behoud IDs en handlers bij verplaatsingen; controleer desktop, mobiele breedte, toetsenbordfocus en de relevante bewaar-/overdrachtsflow. De homepage is het overzicht; deze bedieningsregels gelden voor de tools.
