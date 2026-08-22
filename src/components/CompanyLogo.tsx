// Kleine, vereenvoudigde zwart-witversie van het bedrijfslogo, puur als
// visuele herkenning onder de batch op de sticker. Geen exacte reproductie
// van het echte logo (op deze afdrukschaal, een paar mm, is fijn detail toch
// niet leesbaar) — wel herkenbaar aan silhouet, als inline SVG zodat het
// scherp blijft op elke schaal en er geen los PNG-bestand ingeladen hoeft te
// worden.

function EcobrightMark({ heightMm }: { heightMm: number }) {
  return (
    <svg viewBox="0 0 24 24" style={{ height: `${heightMm}mm`, width: `${heightMm}mm` }} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#000" />
      <path
        fill="#fff"
        d="M12 5.5c-2.8 0-5 2.2-5 5 0 1.9 1.1 3.5 2.6 4.3.3.2.4.4.4.7v.8h4v-.8c0-.3.1-.5.4-.7 1.5-.8 2.6-2.4 2.6-4.3 0-2.8-2.2-5-5-5z"
      />
      <rect x="10" y="16.6" width="4" height="1.1" rx="0.3" fill="#fff" />
      <rect x="10.3" y="18" width="3.4" height="1" rx="0.3" fill="#fff" />
    </svg>
  );
}

function LedInbouwSpotsMark({ heightMm }: { heightMm: number }) {
  return (
    <svg viewBox="0 0 24 24" style={{ height: `${heightMm}mm`, width: `${heightMm}mm` }} aria-hidden="true">
      <path fill="#000" d="M13 2 4.09 14H12l-1.36 8.75L20 9h-8z" />
    </svg>
  );
}

export function CompanyLogo({ companyId, heightMm = 4 }: { companyId: string; heightMm?: number }) {
  if (companyId === 'eb') return <EcobrightMark heightMm={heightMm} />;
  if (companyId === 'lisl') return <LedInbouwSpotsMark heightMm={heightMm} />;
  return null;
}
