# Voorraadbeheer — LISL & EB

Interface om voorraad van beide bedrijven over 4 magazijnen bij te houden.

## Functionaliteit

- **Overzicht & zoeken**: zoek artikelen op artikelnummer, EAN of omschrijving. Toont per artikel
  direct de voorraad per magazijn (M1–M4) en het totaal. Een rij openklappen laat de batches
  (bv. `JUL/26`) per magazijn zien.
- **Artikel toevoegen / inboeken**: nieuwe artikelen aanmaken (artikelnummer, korte omschrijving,
  EAN, gekoppeld bedrijf, aantal per volle doos) of een nieuwe batch inboeken bij een bestaand
  artikel. Bij het inboeken kies je altijd het magazijn en het batchnummer (maand + jaar), en kun
  je het aantal invullen via volle dozen × stuks/doos plus eventuele losse stuks.
- **Magazijnen**: per magazijn (1 t/m 4) een overzicht van alle voorraadregels met artikel,
  bedrijf, batch en aantal, inclusief optie om een foutieve regel te verwijderen.

De 2 bedrijven (LISL, EB) en 4 magazijnen liggen vast in
`src/data/seed.ts`; elk artikel wordt gekoppeld aan precies 1 bedrijf, maar voorraad kan bij het
inboeken altijd handmatig aan elk van de 4 magazijnen toegewezen worden.

## Ontwikkelen

```bash
npm install
npm run dev
```

Data wordt lokaal opgeslagen in de browser (`localStorage`) — er is geen backend nodig.

## Build

```bash
npm run build
```
