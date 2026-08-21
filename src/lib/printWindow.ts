// Opent een nieuw browsertabblad en kopieert alle CSS van de huidige pagina erin
// over, zodat Tailwind-classes daar ook werken. Moet synchroon vanuit een
// click-handler aangeroepen worden, anders blokkeren pop-upblokkers het venster.
//
// De CSS wordt als platte tekst overgenomen (via de al geladen CSSOM) in <style>-
// tags, in plaats van <link>-tags die het bestand opnieuw zouden laten ophalen: een
// net geopend "about:blank"-tabblad kan zijn eigen resources niet betrouwbaar
// ophalen (geverifieerd: zelfs een handmatige fetch() daarbinnen bleef hangen), dus
// een <link> daar zou stilletjes nooit laden — met als gevolg dat de sticker
// onopgemaakt/te groot gerenderd wordt en (bij lange tekst) buiten de rand loopt.
function populatePrintWindow(popup: Window, title: string) {
  popup.document.title = title;
  popup.document.documentElement.lang = 'nl';

  const viewportMeta = popup.document.createElement('meta');
  viewportMeta.name = 'viewport';
  viewportMeta.content = 'width=device-width, initial-scale=1';
  popup.document.head.appendChild(viewportMeta);

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const cssText = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
      const styleEl = popup.document.createElement('style');
      styleEl.textContent = cssText;
      popup.document.head.appendChild(styleEl);
    } catch {
      // Cross-origin stylesheet waarvan de regels niet uitgelezen mogen worden: overslaan.
    }
  }

  popup.document.body.style.margin = '0';
  popup.document.body.style.background = '#f1f5f9';

  const root = popup.document.createElement('div');
  root.id = 'popup-root';
  popup.document.body.appendChild(root);
}

export function openPrintWindow(title: string): Window | null {
  const popup = window.open('', '_blank');
  if (!popup) return null;
  populatePrintWindow(popup, title);
  return popup;
}

// Browsers kunnen een tabblad op de achtergrond "ontladen" (discarding) om
// geheugen vrij te maken, bv. na een tijdje niet actief te zijn geweest of bij
// geheugendruk. Bij terugkeer laadt de browser de tab dan opnieuw vanaf zijn
// URL — maar een about:blank-tabblad heeft geen echte URL om vanaf te
// herladen, dus na zo'n ontlading is de hele inhoud (CSS, #popup-root, de
// React-portal-inhoud) gewoon leeg, zonder dat het tabblad daadwerkelijk
// gesloten is (popup.closed blijft false). Roep dit periodiek aan vanuit de
// preview-component om dat te detecteren en de inhoud opnieuw op te bouwen
// i.p.v. de sticker/label stilletjes te laten "verdwijnen". Geeft true terug
// als er opnieuw opgebouwd is (caller moet dan een her-render forceren en
// eventuele event listeners opnieuw aan popup.document hangen, want dat is nu
// een nieuw Document-object).
export function ensurePrintWindowContent(popup: Window, title: string): boolean {
  if (popup.closed) return false;
  if (popup.document.getElementById('popup-root')) return false;
  populatePrintWindow(popup, title);
  return true;
}
