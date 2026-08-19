// Opent een nieuw browsertabblad en kopieert alle stylesheets van de huidige pagina
// erin over, zodat Tailwind-classes daar ook werken. Moet synchroon vanuit een
// click-handler aangeroepen worden, anders blokkeren pop-upblokkers het venster.
export function openPrintWindow(title: string): Window | null {
  const popup = window.open('', '_blank');
  if (!popup) return null;

  popup.document.title = title;
  popup.document.documentElement.lang = 'nl';

  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    popup.document.head.appendChild(node.cloneNode(true));
  });

  popup.document.body.style.margin = '0';
  popup.document.body.style.background = '#f1f5f9';

  const root = popup.document.createElement('div');
  root.id = 'popup-root';
  popup.document.body.appendChild(root);

  return popup;
}
