# Voorraadbeheer — LISL & EB

Interface om voorraad van beide bedrijven over 4 magazijnen bij te houden, achter een
inlogscherm met twee rollen (Admin/Gebruiker).

## Functionaliteit

- **Login & accounts**: de hele app zit achter een inlogscherm. Accounts worden door een
  Admin aangemaakt via het formulier in het Accounts-scherm (stuurt een uitnodigingsmail),
  niet via self-signup.
- **Rollen**:
  - **Admin**: alles, inclusief artikelen aanmaken/bewerken (artikelnummer, EAN,
    omschrijving, bedrijf, doosinhoud), Historie inzien en accountrollen beheren.
  - **Gebruiker**: in-/uitboeken (los + bulk) en voorraad inzien. Geen nieuwe artikelen
    aanmaken, geen artikelnummer/EAN wijzigen, geen toegang tot Historie — dit wordt niet
    alleen in de interface verborgen maar ook afgedwongen door de database (Row Level
    Security), dus ook rechtstreekse API-calls worden geweigerd.
- **Overzicht & zoeken**: zoek artikelen op artikelnummer, EAN of omschrijving. Toont per
  artikel direct de voorraad per magazijn (M1–M4) en het totaal. Een rij openklappen laat
  de batches (bv. `JUL/26`) per magazijn zien.
- **Inboeken**: kies het magazijn en het batchnummer (maand + jaar)
  voor de hele batch, en zoek daaronder per regel een bestaand artikel op (artikelnummer,
  EAN of omschrijving). Het aantal is altijd volle dozen × stuks/doos — dit systeem houdt
  alleen volle dozen bij, geen losse stuks. Zodra je bij de laatste regel het aantal dozen
  invult, komt er automatisch een nieuwe lege regel bij, zodat je in één moeite door meerdere
  artikelen kunt inboeken.
- **Uitboeken**: zoek per regel een artikel, kies de batch/magazijn waaruit je afboekt
  (bijvoorbeeld wanneer een volle doos wordt aangebroken en ingepakt) en vul het aantal
  aangebroken dozen in — ook hier komt automatisch een nieuwe regel bij zodra je een regel
  compleet hebt ingevuld.
- **Magazijnen**: per magazijn (1 t/m 4) een overzicht van alle voorraadregels, met optie
  om een foutieve regel te verwijderen.
- **Producten** (Admin): nieuwe artikelen aanmaken (artikelnummer, EAN, omschrijving,
  bedrijf, doosinhoud) via "+ Nieuw artikel toevoegen", en bestaande artikelen bewerken of
  verwijderen. Voorraad voor een nieuw artikel boek je daarna in via "Inboeken". Een
  nieuw artikel kan ook via een productlink van ledinbouwspotsleds.nl of
  ecobright.nl aangemaakt worden: titel, artikelnummer en EAN worden automatisch
  overgenomen van de pagina en het bedrijf (LISL/EB) wordt automatisch bepaald op basis
  van het domein — de velden blijven daarna gewoon bewerkbaar voordat je opslaat. Het
  aantal per volle doos staat standaard op 50, met de keuze uit 10/20/50/100/1000.
  Ledinbouwspotsleds.nl heeft botbeveiliging (Anubis) die automatisch ophalen soms
  blokkeert — in dat geval verschijnt een duidelijke melding en vul je de drie velden
  handmatig in; ecobright.nl heeft die beveiliging niet.
- **Stickers** (Admin): artikelen selecteren (nieuwste eerst) en labels genereren voor een
  Zebra-labelprinter (150 × 100 mm, PostNL-formaat). Elke sticker toont artikelnummer,
  omschrijving en aantal per doos in één kader en de batch in een tweede kader; de
  lettergrootte per kader krimpt automatisch mee zodat de tekst altijd past.
- **Historie** (Admin): logboek van alle in-, uit- en correctieboekingen, inclusief het
  account dat de mutatie heeft uitgevoerd.
- **Accounts** (Admin): nieuwe accounts uitnodigen via e-mail met een rol, plus een
  overzicht van alle accounts met een dropdown om de rol te wijzigen.

De interface is responsive (tabnavigatie en tabellen scrollen binnen hun eigen kader op
smalle schermen) en heeft een licht/donker thema-schakelaar rechtsboven in de header.

## Supabase-project opzetten (eenmalig)

De data staat in [Supabase](https://supabase.com) (gratis tier: Postgres-database +
authenticatie).

1. Maak een gratis Supabase-account en nieuw project aan.
2. Draai `supabase/schema.sql` in de Supabase SQL Editor — dit maakt alle tabellen,
   beveiligingsregels (RLS) en de standaard bedrijven/magazijnen aan.
3. Maak jezelf als eerste account aan: Dashboard → Authentication → Users → "Add user"
   (met "Auto Confirm User" aangevinkt), en zet je eigen rol op admin:
   ```sql
   update public.profiles set role = 'admin' where email = 'jouw-email@voorbeeld.nl';
   ```
4. Kopieer de **Project URL** en **anon/publishable key** (Project Settings → API).
5. Zet de Edge Function `create-account` live (nodig voor het "Nieuw account toevoegen"
   formulier in het Accounts-scherm — hiermee kan een Admin zelf collega's uitnodigen
   zonder de Supabase Dashboard te hoeven gebruiken):
   - Dashboard → **Edge Functions** → **"Deploy a new function"** → **"Via Editor"**
   - Naam: `create-account`
   - Plak de inhoud van `supabase/functions/create-account/index.ts` en klik **Deploy**
   - Geen extra secrets nodig — Supabase geeft de functie automatisch toegang tot je
     project (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
   - Alternatief zonder Dashboard-editor: `npx supabase functions deploy create-account`
     (vereist inloggen met `npx supabase login` en het project linken).

Zonder deze Edge Function werkt de rest van de app gewoon door — alleen het
"Nieuw account toevoegen"-formulier geeft dan een foutmelding. Als tijdelijk alternatief
kun je een account ook handmatig aanmaken via Dashboard → Authentication → Users →
"Invite user"; die krijgt automatisch rol "Gebruiker", aan te passen in het
Accounts-scherm.

6. Zet de Edge Function `fetch-product` live (nodig voor "Artikel toevoegen via link" in
   het Producten-scherm):
   - Dashboard → **Edge Functions** → **"Deploy a new function"** → **"Via Editor"**
   - Naam: `fetch-product`
   - Plak de inhoud van `supabase/functions/fetch-product/index.ts` en klik **Deploy**
   - Geen extra secrets nodig, zelfde als bij `create-account` hierboven.

Zonder deze Edge Function werkt de rest van de app gewoon door — alleen het
"Ophalen"-knopje bij "Artikel toevoegen via link" geeft dan een foutmelding; een nieuw
artikel handmatig aanmaken blijft gewoon werken.

### Bestaand project bijwerken: kolom voor "Door" in Historie

Heb je `supabase/schema.sql` al eerder gedraaid (vóór de `movements`-tabel een
`created_by`-kolom kreeg)? Draai dan eenmalig dit los in de SQL Editor — het volledige
script opnieuw draaien geeft anders foutmeldingen over tabellen die al bestaan:

```sql
alter table public.movements
  add column created_by uuid references public.profiles(id) default auth.uid();
```

## Ontwikkelen

Maak een `.env.local` bestand (wordt niet gecommit) met:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-of-publishable-key
```

```bash
npm install
npm run dev
```

## Build & deploy

```bash
npm run build
```

Voor de GitHub Pages-deploy (`.github/workflows/deploy-pages.yml`) moeten dezelfde twee
waarden als **repository secrets** gezet zijn: Settings → Secrets and variables →
Actions → `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY`. Zonder deze secrets toont de
gedeployde site een duidelijke configuratiemelding in plaats van een lege pagina.
