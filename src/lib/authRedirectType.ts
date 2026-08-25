// Supabase verwerkt en wist de #access_token=...&type=...-hash uit de URL zodra de
// client initialiseert (zie GoTrueClient._getSessionFromURL), en stuurt voor een
// uitnodigingslink daarna gewoon een normale SIGNED_IN-event - net als bij een gewone
// login (alleen een reset-wachtwoordlink krijgt een apart PASSWORD_RECOVERY-event). Om
// toch te kunnen onderscheiden "net via een uitnodiging binnengekomen, nog geen
// wachtwoord ingesteld" van "gewoon ingelogd", lezen we de hash hier zelf uit, vóórdat
// Supabase 'm verwerkt. Dit bestand moet daarom vroeg (synchroon, vanuit main.tsx)
// geïmporteerd worden - niet pas via de lazy-geladen App, want dan kan Supabase de hash
// allang gewist hebben.
export const initialAuthRedirectType = (() => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash).get('type');
})();
