# Voorraadbeheer — LISL & EB

Interface om voorraad van beide bedrijven over 4 magazijnen bij te houden, achter een
inlogscherm met twee rollen (Admin/Gebruiker).

## Functionaliteit

- **Login & accounts**: de hele app zit achter een inlogscherm. Accounts worden door een
  Admin aangemaakt (via het Supabase-dashboard, zie "Supabase-project opzetten" hieronder),
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
- **Artikel toevoegen / inboeken**: nieuwe artikelen aanmaken (alleen Admin) of een nieuwe
  batch inboeken bij een bestaand artikel. Bij het inboeken kies je altijd het magazijn en
  het batchnummer (maand + jaar), en kun je het aantal invullen via volle dozen ×
  stuks/doos plus eventuele losse stuks. Met "Bulk" boek je in één keer meerdere bestaande
  artikelen tegelijk in.
- **Uitboeken**: voorraad afboeken uit een specifieke batch/magazijn, bijvoorbeeld wanneer
  een volle doos wordt aangebroken en ingepakt. Dit systeem houdt alleen volle dozen bij.
  Met "Bulk" boek je meerdere artikelen tegelijk uit.
- **Magazijnen**: per magazijn (1 t/m 4) een overzicht van alle voorraadregels, met optie
  om een foutieve regel te verwijderen.
- **Producten** (Admin): bestaande artikelen bewerken of verwijderen.
- **Historie** (Admin): logboek van alle in-, uit- en correctieboekingen.
- **Accounts** (Admin): overzicht van alle accounts met hun rol, met een dropdown om de
  rol te wijzigen.

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
4. Nieuwe accounts voeg je later toe via Dashboard → Authentication → Users →
   "Invite user" — de nieuwe gebruiker stelt zelf een wachtwoord in en krijgt automatisch
   rol "Gebruiker", die een Admin daarna kan aanpassen in het Accounts-scherm van de app.
5. Kopieer de **Project URL** en **anon/publishable key** (Project Settings → API).

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
