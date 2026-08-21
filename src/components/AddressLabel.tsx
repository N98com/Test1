import { useState } from 'react';
import { Field } from './Field';
import { parseAddressBlock } from '../lib/addressParse';
import { AddressLabelPreview, type AddressLabelData } from './AddressLabelPreview';
import { openPrintWindow } from '../lib/printWindow';

const EMPTY: AddressLabelData = {
  name: '',
  street: '',
  houseNumber: '',
  postcode: '',
  city: '',
  province: '',
  country: '',
};

export function AddressLabel() {
  const [raw, setRaw] = useState('');
  const [data, setData] = useState<AddressLabelData>(EMPTY);
  const [previewWindow, setPreviewWindow] = useState<Window | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  function handleParse() {
    if (!raw.trim()) return;
    setData(parseAddressBlock(raw));
  }

  function setField<K extends keyof AddressLabelData>(key: K, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  const hasData = Object.values(data).some((v) => v.trim() !== '');

  function handlePrint() {
    // Moet synchroon in de click-handler gebeuren, anders blokkeren pop-upblokkers dit.
    const popup = openPrintWindow('Brief label');
    if (!popup) {
      setPrintError('Kon geen nieuw tabblad openen. Sta pop-ups toe voor deze site en probeer opnieuw.');
      return;
    }
    setPreviewWindow(popup);
    setPrintError(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Plak hieronder de persoonsgegevens (naam en adres, in willekeurige volgorde).
      </p>

      <Field label="Geplakte gegevens">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={4}
          placeholder="Bijv. Jan de Vries Hoofdstraat 12a 1234AB Amsterdam 06 12345678 jan@example.com Nederland"
          className="input"
        />
      </Field>

      <button
        type="button"
        onClick={handleParse}
        disabled={!raw.trim()}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        Gegevens overnemen
      </button>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Labelgegevens</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Naam" full>
            <input value={data.name} onChange={(e) => setField('name', e.target.value)} className="input" />
          </Field>
          <Field label="Straatnaam">
            <input value={data.street} onChange={(e) => setField('street', e.target.value)} className="input" />
          </Field>
          <Field label="Huisnummer">
            <input value={data.houseNumber} onChange={(e) => setField('houseNumber', e.target.value)} className="input" />
          </Field>
          <Field label="Postcode">
            <input value={data.postcode} onChange={(e) => setField('postcode', e.target.value)} className="input" />
          </Field>
          <Field label="Woonplaats">
            <input value={data.city} onChange={(e) => setField('city', e.target.value)} className="input" />
          </Field>
          <Field label="Provincie">
            <input value={data.province} onChange={(e) => setField('province', e.target.value)} className="input" />
          </Field>
          <Field label="Land (alleen indien niet Nederland)">
            <input value={data.country} onChange={(e) => setField('country', e.target.value)} className="input" />
          </Field>
        </div>
      </div>

      <button
        type="button"
        onClick={handlePrint}
        disabled={!hasData}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        Label printen
      </button>

      {printError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{printError}</p>
      )}

      {previewWindow && (
        <AddressLabelPreview
          data={data}
          popup={previewWindow}
          onClose={() => setPreviewWindow(null)}
        />
      )}
    </div>
  );
}
