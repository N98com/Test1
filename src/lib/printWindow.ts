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
export function openPrintWindow(title: string): Window | null {
  const popup = window.open('', '_blank');
  if (!popup) return null;

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

  return popup;
}
