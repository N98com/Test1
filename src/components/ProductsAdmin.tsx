import { useState } from 'react';
import type { Company, Product } from '../types';
import { CompanyBadge } from './CompanyBadge';

interface Props {
  products: Product[];
  companies: Company[];
  onUpdateProduct: (id: string, patch: Partial<Omit<Product, 'id' | 'createdAt'>>) => Promise<string | null>;
  onDeleteProduct: (id: string) => Promise<string | null>;
}

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

export function ProductsAdmin({ products, companies, onUpdateProduct, onDeleteProduct }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...products].sort((a, b) => a.articleNumber.localeCompare(b.articleNumber));

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
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Bewerk artikelnummer, EAN, omschrijving, bedrijf of doosinhoud van een bestaand product.
      </p>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[720px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Artikelnr.</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Omschrijving</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">EAN</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bedrijf</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Stuks/doos</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {sorted.map((product) => {
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nog geen artikelen. Voeg er een toe via "Artikel toevoegen / inboeken".
        </p>
      )}
    </div>
  );
}
