import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Company, Product } from '../types';
import { CompanyBadge } from './CompanyBadge';
import { Field } from './Field';

const UNITS_PER_BOX_OPTIONS = [10, 20, 50, 100, 1000];

interface Props {
  products: Product[];
  companies: Company[];
  isAdmin: boolean;
  onAddProduct: (input: Omit<Product, 'id' | 'createdAt'>) => Promise<{ product: Product | null; error: string | null }>;
  onUpdateProduct: (id: string, patch: Partial<Omit<Product, 'id' | 'createdAt'>>) => Promise<string | null>;
  onDeleteProduct: (id: string) => Promise<string | null>;
}

type Feedback = { text: string; type: 'error' | 'success' };

interface Draft {
  articleNumber: string;
  description: string;
  ean: string;
  companyId: string;
  unitsPerBox: string;
}

function draftFor(product: Product): Draft {
  return {
    articleNumber: product.articleNumber,
    description: product.description,
    ean: product.ean,
    companyId: product.companyId,
    unitsPerBox: String(product.unitsPerBox),
  };
}

export function ProductsAdmin({ products, companies, isAdmin, onAddProduct, onUpdateProduct, onDeleteProduct }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newArticleNumber, setNewArticleNumber] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEan, setNewEan] = useState('');
  const [newCompanyId, setNewCompanyId] = useState(companies[0]?.id ?? '');
  const [newUnitsPerBox, setNewUnitsPerBox] = useState('50');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [productUrl, setProductUrl] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const [query, setQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');

  const sorted = [...products].sort((a, b) => a.articleNumber.localeCompare(b.articleNumber));

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = sorted
    .filter((product) => companyFilter === 'all' || product.companyId === companyFilter)
    .filter(
      (product) =>
        !normalizedQuery ||
        product.articleNumber.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        product.ean.toLowerCase().includes(normalizedQuery),
    );

  function resetNewForm() {
    setNewArticleNumber('');
    setNewDescription('');
    setNewEan('');
    setNewUnitsPerBox('50');
    setProductUrl('');
  }

  async function handleFetchFromUrl() {
    const url = productUrl.trim();
    if (!url) return;

    setFetchingUrl(true);
    setFeedback(null);
    const { data, error: invokeError } = await supabase.functions.invoke('fetch-product', { body: { url } });
    setFetchingUrl(false);

    if (invokeError) {
      setFeedback({ text: `Ophalen via link is mislukt: ${invokeError.message}`, type: 'error' });
      return;
    }

    if (data?.description) setNewDescription(data.description);
    if (data?.articleNumber) setNewArticleNumber(data.articleNumber);
    if (data?.ean) setNewEan(data.ean);
    if (data?.companyId) setNewCompanyId(data.companyId);

    if (data?.error) {
      setFeedback({ text: data.error, type: 'error' });
    } else if (data?.description && data?.articleNumber && data?.ean) {
      setFeedback({ text: 'Gegevens overgenomen van de link. Controleer en pas eventueel aan.', type: 'success' });
    } else {
      setFeedback({
        text: 'Onverwachte reactie van de server. Controleer of de Edge Function "fetch-product" correct is gedeployed (met de juiste code, niet het lege voorbeeld).',
        type: 'error',
      });
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const articleNumber = newArticleNumber.trim();
    const ean = newEan.trim();

    if (!articleNumber || !newDescription.trim() || !ean || !newCompanyId) {
      setFeedback({ text: 'Vul artikelnummer, omschrijving, EAN en bedrijf in.', type: 'error' });
      return;
    }

    const duplicateArticle = products.some((p) => p.articleNumber.trim().toLowerCase() === articleNumber.toLowerCase());
    const duplicateEan = products.some((p) => p.ean.trim().toLowerCase() === ean.toLowerCase());
    if (duplicateArticle && duplicateEan) {
      setFeedback({ text: `Artikelnummer "${articleNumber}" en EAN "${ean}" zijn beide al in gebruik.`, type: 'error' });
      return;
    }
    if (duplicateArticle) {
      setFeedback({ text: `Artikelnummer "${articleNumber}" is al in gebruik.`, type: 'error' });
      return;
    }
    if (duplicateEan) {
      setFeedback({ text: `EAN "${ean}" is al in gebruik.`, type: 'error' });
      return;
    }

    setCreating(true);
    const { product, error: createError } = await onAddProduct({
      articleNumber,
      description: newDescription.trim(),
      ean,
      companyId: newCompanyId,
      unitsPerBox: Number(newUnitsPerBox) || 1,
    });
    setCreating(false);

    if (createError || !product) {
      setFeedback({ text: createError ?? 'Aanmaken van artikel is mislukt.', type: 'error' });
      return;
    }

    resetNewForm();
    setShowNewForm(false);
    setFeedback({ text: `Artikel ${product.articleNumber} aangemaakt. Ga naar "Inboeken" om voorraad toe te voegen.`, type: 'success' });
  }

  function startEdit(product: Product) {
    setError(null);
    setEditingId(product.id);
    setDraft(draftFor(product));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    if (!draft.articleNumber.trim() || !draft.description.trim() || !draft.ean.trim() || !draft.companyId) {
      setError('Vul artikelnummer, omschrijving, EAN en bedrijf in.');
      return;
    }
    setSaving(true);
    const err = await onUpdateProduct(id, {
      articleNumber: draft.articleNumber.trim(),
      description: draft.description.trim(),
      ean: draft.ean.trim(),
      companyId: draft.companyId,
      unitsPerBox: Number(draft.unitsPerBox) || 1,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setEditingId(null);
    setDraft(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Dit artikel verwijderen? Bijbehorende voorraadregels verdwijnen ook.')) return;
    setError(null);
    const err = await onDeleteProduct(id);
    if (err) setError(err);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isAdmin
            ? 'Bewerk artikelnummer, EAN, omschrijving, bedrijf of doosinhoud van een bestaand product.'
            : 'Overzicht van alle artikelen.'}
        </p>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setShowNewForm((v) => !v);
              setFeedback(null);
            }}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {showNewForm ? 'Annuleren' : '+ Nieuw artikel toevoegen'}
          </button>
        )}
      </div>

      {isAdmin && showNewForm && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-600">
            <Field label="Artikel toevoegen via link (ledinbouwspotsleds.nl of ecobright.nl)">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="input"
                  placeholder="https://www.ledinbouwspotsleds.nl/..."
                />
                <button
                  type="button"
                  onClick={handleFetchFromUrl}
                  disabled={fetchingUrl || !productUrl.trim()}
                  className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {fetchingUrl ? 'Ophalen...' : 'Ophalen'}
                </button>
              </div>
            </Field>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Titel, artikelnummer en EAN worden automatisch overgenomen en het bedrijf wordt automatisch bepaald op basis van de link. Controleer de velden hieronder voordat je opslaat.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Artikelnummer">
              <input
                value={newArticleNumber}
                onChange={(e) => setNewArticleNumber(e.target.value)}
                className="input"
                placeholder="bv. LED-SP-2700-01"
                required
              />
            </Field>
            <Field label="EAN-code">
              <input
                value={newEan}
                onChange={(e) => setNewEan(e.target.value)}
                className="input"
                placeholder="bv. 8710000000000"
                required
              />
            </Field>
            <Field label="Korte omschrijving" full>
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="input"
                placeholder="bv. Inbouwspot rond wit 2700K"
                required
              />
            </Field>
            <Field label="Bedrijf">
              <select value={newCompanyId} onChange={(e) => setNewCompanyId(e.target.value)} className="input" required>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Aantal per volle doos">
              <select value={newUnitsPerBox} onChange={(e) => setNewUnitsPerBox(e.target.value)} className="input" required>
                {UNITS_PER_BOX_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Field>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {creating ? 'Bezig...' : 'Artikel aanmaken'}
          </button>
        </form>
      )}

      {feedback && (
        <p className={`rounded-md px-3 py-2 text-sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'}`}>
          {feedback.text}
        </p>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
          placeholder="Zoek op artikelnummer, omschrijving of EAN..."
          type="search"
        />
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">Alle bedrijven</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[720px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikelnr.</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Omschrijving</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">EAN</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bedrijf</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Stuks/doos</th>
              {isAdmin && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {filtered.map((product) => {
              const isEditing = editingId === product.id;
              if (isEditing && draft) {
                return (
                  <tr key={product.id} className="bg-slate-50 dark:bg-slate-800">
                    <td className="px-3 py-2">
                      <input
                        value={draft.articleNumber}
                        onChange={(e) => setDraft({ ...draft, articleNumber: e.target.value })}
                        className="input"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        className="input"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={draft.ean}
                        onChange={(e) => setDraft({ ...draft, ean: e.target.value })}
                        className="input"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={draft.companyId}
                        onChange={(e) => setDraft({ ...draft, companyId: e.target.value })}
                        className="input"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={draft.unitsPerBox}
                        onChange={(e) => setDraft({ ...draft, unitsPerBox: e.target.value })}
                        className="input text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => saveEdit(product.id)}
                        disabled={saving}
                        className="mr-3 text-xs font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        {saving ? 'Opslaan...' : 'Opslaan'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        Annuleren
                      </button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{product.articleNumber}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{product.description}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{product.ean}</td>
                  <td className="px-3 py-2">
                    <CompanyBadge companyId={product.companyId} name={companies.find((c) => c.id === product.companyId)?.name ?? '—'} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{product.unitsPerBox}</td>
                  {isAdmin && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="mr-3 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Verwijderen
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {sorted.length === 0
            ? isAdmin
              ? 'Nog geen artikelen. Klik op "+ Nieuw artikel toevoegen" om er een aan te maken.'
              : 'Nog geen artikelen.'
            : 'Geen artikelen gevonden voor deze zoekopdracht.'}
        </p>
      )}
    </div>
  );
}
