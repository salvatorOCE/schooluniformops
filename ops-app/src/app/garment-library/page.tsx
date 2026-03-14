'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Shirt, Plus, Trash2, ImageIcon, Upload, Pencil, ChevronDown, ChevronRight, Search, CheckSquare, Square, FileText, Copy, Loader2, Check } from 'lucide-react';

/** Render description with **bold** shown as bold (safe HTML). */
function descriptionWithBold(text: string): string {
  if (!text?.trim()) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

type Garment = {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
  manufacturer_name?: string | null;
  code?: string | null;
  price?: number | null;
  garment_type?: string | null;
  extra?: Record<string, unknown>;
};

const GARMENT_TYPES = ['Polo', 'Jumper', 'Hat', 'Jacket', 'Shorts', 'Other'] as const;

function fileNameWithoutExt(file: File): string {
  const name = file.name || 'image';
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(0, lastDot) : name;
}

/** Parse "MANUFACTURER_CODE_Color" style name into manufacturer and code for auto-fill. */
function parseGarmentName(name: string): { manufacturer: string; code: string } {
  const parts = (name || '').trim().split('_').filter(Boolean);
  return {
    manufacturer: parts[0] ?? '',
    code: parts[1] ?? '',
  };
}

/** Strip trailing -COLOR from code so PS75-BLACK → PS75 for grouping. */
function getBaseCode(g: Garment): string {
  const c = (g.code ?? '').trim();
  if (!c) {
    const parts = (g.name || '').trim().split(/[_\-\s]+/).filter(Boolean);
    if (parts.length >= 2) return parts[1]!.replace(/-[A-Za-z]+$/, '') || parts[1]!;
    return c;
  }
  return c.replace(/-[A-Za-z]+$/, '') || c;
}

/** Bundle key for grouping (manufacturer + base code, or first two name parts). */
function getBundleKey(g: Garment): string {
  const m = (g.manufacturer_name ?? '').trim();
  const c = getBaseCode(g);
  if (m && c) return `${m}_${c}`;
  const parts = (g.name || '').trim().split('_').filter(Boolean);
  if (parts.length >= 2) {
    const base = parts[1]!.replace(/-[A-Za-z]+$/, '') || parts[1]!;
    return `${parts[0]}_${base}`;
  }
  return g.id;
}

/** Display label for a bundle (manufacturer + base code, no color). */
function getBundleLabel(g: Garment): string {
  const m = (g.manufacturer_name ?? '').trim();
  const c = getBaseCode(g);
  if (m && c) return `${m} ${c}`;
  const parts = (g.name || '').trim().split('_').filter(Boolean);
  if (parts.length >= 2) {
    const base = parts[1]!.replace(/-[A-Za-z]+$/, '') || parts[1]!;
    return `${parts[0]} ${base}`;
  }
  return g.name || 'Other';
}

function formatBundlePrice(garments: Garment[]): string | null {
  const prices = garments
    .map((g) => (g.price != null && !Number.isNaN(Number(g.price)) ? Number(g.price) : null))
    .filter((p): p is number => p !== null);
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  if (min === max) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}

export default function GarmentLibraryPage() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addFile, setAddFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; failed: string[] }>({ done: 0, total: 0, failed: [] });
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    manufacturer_name: '',
    code: '',
    price: '',
    garment_type: '',
    notes: '',
    description: '',
    product_url: '',
  });
  const [fetchingDescription, setFetchingDescription] = useState(false);
  const [findingDescription, setFindingDescription] = useState(false);
  const [copyDescriptionDone, setCopyDescriptionDone] = useState(false);
  const [findDescriptionSuccess, setFindDescriptionSuccess] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({ price: '', manufacturer_name: '', code: '', garment_type: '', description: '' });
  const [bulkEditSaving, setBulkEditSaving] = useState(false);
  const [bulkEditError, setBulkEditError] = useState<string | null>(null);
  const [bulkFindingDescription, setBulkFindingDescription] = useState(false);
  const [bulkFindResult, setBulkFindResult] = useState<{ success: number; failed: number; firstError?: string } | null>(null);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectBundle = (bundleKey: string, select: boolean) => {
    const bundle = bundles.find((b) => b.key === bundleKey);
    if (!bundle) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      bundle.garments.forEach((g) => (select ? next.add(g.id) : next.delete(g.id)));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const filteredGarments = useMemo(() => {
    if (!search.trim()) return garments;
    const q = search.toLowerCase().trim();
    return garments.filter(
      (g) =>
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.manufacturer_name && g.manufacturer_name.toLowerCase().includes(q)) ||
        (g.code && g.code.toLowerCase().includes(q)) ||
        (g.garment_type && g.garment_type.toLowerCase().includes(q))
    );
  }, [garments, search]);

  const bundles = useMemo(() => {
    const map = new Map<string, { label: string; garments: Garment[] }>();
    for (const g of filteredGarments) {
      const key = getBundleKey(g);
      const existing = map.get(key);
      const label = getBundleLabel(g);
      if (existing) {
        existing.garments.push(g);
      } else {
        map.set(key, { label, garments: [g] });
      }
    }
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value })).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredGarments]);

  const toggleBundle = (key: string) => {
    setExpandedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const bundleKeysStable = useMemo(() => bundles.map((b) => b.key).sort().join(','), [bundles]);
  useEffect(() => {
    if (!search.trim() || !bundleKeysStable) return;
    const keys = new Set(bundleKeysStable.split(','));
    setExpandedBundles((prev) => {
      if (prev.size !== keys.size || [...keys].some((k) => !prev.has(k))) return keys;
      return prev;
    });
  }, [search, bundleKeysStable]);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/manufacturer-garments', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error || 'Failed to load';
        setLoadError(msg);
        setGarments([]);
        return;
      }
      setGarments(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setLoadError(msg);
      setGarments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addFile) {
      setAddError('Name and image file required');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const name = addName.trim();
      const { manufacturer, code } = parseGarmentName(name);
      const form = new FormData();
      form.set('name', name);
      form.set('file', addFile);
      if (manufacturer) form.set('manufacturer_name', manufacturer);
      if (code) form.set('code', code);
      const res = await fetch('/api/manufacturer-garments', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Upload failed');
      setShowAdd(false);
      setAddName('');
      setAddFile(null);
      await load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (g: Garment) => {
    setEditError(null);
    setFindDescriptionSuccess(false);
    setEditingGarment(g);
    const parsed = parseGarmentName(g.name);
    const extra = g.extra && typeof g.extra === 'object' ? (g.extra as { notes?: string; description?: string; product_url?: string }) : {};
    setEditForm({
      name: g.name,
      manufacturer_name: (g.manufacturer_name ?? '').trim() || parsed.manufacturer,
      code: (g.code ?? '').trim() || parsed.code,
      price: g.price != null ? String(g.price) : '',
      garment_type: g.garment_type ?? '',
      notes: extra.notes ?? '',
      description: extra.description ?? '',
      product_url: extra.product_url ?? '',
    });
    setEditError(null);
    setCopyDescriptionDone(false);
  };

  const handleFindDescription = async () => {
    if (!editingGarment) return;
    setFindingDescription(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/manufacturer-garments/${editingGarment.id}/find-description`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = (data as { error?: string }).error || 'Find failed';
        setEditError(errMsg);
        return;
      }
      const desc = (data as { description?: string; extra?: { description?: string } }).description
        ?? (data as { extra?: { description?: string } }).extra?.description
        ?? '';
      const productUrl = (data as { product_url?: string; extra?: { product_url?: string } }).product_url
        ?? (data as { extra?: { product_url?: string } }).extra?.product_url
        ?? '';
      setEditForm((f) => ({
        ...f,
        description: typeof desc === 'string' ? desc : f.description,
        product_url: typeof productUrl === 'string' ? productUrl : f.product_url,
      }));
      setGarments((prev) => prev.map((g) => (g.id === editingGarment.id ? { ...g, ...data } : g)));
      setEditingGarment((prev) => (prev?.id === editingGarment.id ? { ...prev!, ...data } : prev));
      setFindDescriptionSuccess(true);
      setTimeout(() => setFindDescriptionSuccess(false), 3000);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to find description');
    } finally {
      setFindingDescription(false);
    }
  };

  const handleFetchDescription = async () => {
    if (!editingGarment) return;
    const url = editForm.product_url.trim();
    if (!url) {
      setEditError('Enter a product URL above, then click Fetch description.');
      return;
    }
    setFetchingDescription(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/manufacturer-garments/${editingGarment.id}/fetch-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Fetch failed');
      const extra = (data as { extra?: { description?: string; product_url?: string } }).extra;
      setEditForm((f) => ({
        ...f,
        description: extra?.description ?? f.description,
        product_url: extra?.product_url ?? f.product_url,
      }));
      setGarments((prev) => prev.map((g) => (g.id === editingGarment.id ? { ...g, ...data } : g)));
      setEditingGarment((prev) => (prev?.id === editingGarment.id ? { ...prev!, ...data } : prev));
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to fetch description');
    } finally {
      setFetchingDescription(false);
    }
  };

  const handleCopyDescription = async () => {
    if (!editForm.description.trim()) return;
    try {
      await navigator.clipboard.writeText(editForm.description);
      setCopyDescriptionDone(true);
      setTimeout(() => setCopyDescriptionDone(false), 2000);
    } catch {
      setEditError('Could not copy to clipboard');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingGarment) return;
    const nameTrim = editForm.name.trim();
    if (!nameTrim) {
      setEditError('Name is required');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/manufacturer-garments/${editingGarment.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameTrim,
          manufacturer_name: editForm.manufacturer_name.trim() || null,
          code: editForm.code.trim() || null,
          price: editForm.price.trim() ? parseFloat(editForm.price) : null,
          garment_type: editForm.garment_type.trim() || null,
          extra: {
            notes: editForm.notes.trim() || undefined,
            description: editForm.description.trim() || undefined,
            product_url: editForm.product_url.trim() || undefined,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Save failed');
      setGarments((prev) => prev.map((g) => (g.id === editingGarment.id ? { ...g, ...data } : g)));
      setEditingGarment(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this garment from the library?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/manufacturer-garments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
      setGarments((prev) => prev.filter((g) => g.id !== id));
      if (editingGarment?.id === id) setEditingGarment(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkEditSave = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const payload: Record<string, string | number | null | Record<string, unknown>> = {};
    if (bulkEditForm.price.trim() !== '') {
      const n = parseFloat(bulkEditForm.price.trim());
      payload.price = Number.isNaN(n) ? null : n;
    }
    if (bulkEditForm.manufacturer_name.trim() !== '') payload.manufacturer_name = bulkEditForm.manufacturer_name.trim();
    if (bulkEditForm.code.trim() !== '') payload.code = bulkEditForm.code.trim();
    if (bulkEditForm.garment_type.trim() !== '') payload.garment_type = bulkEditForm.garment_type.trim();
    const descriptionTrim = bulkEditForm.description.trim();
    if (descriptionTrim) {
      // We'll set extra per garment (merge with existing) in the loop
    }
    if (Object.keys(payload).length === 0 && !descriptionTrim) {
      setBulkEditError('Fill at least one field to update.');
      return;
    }
    setBulkEditSaving(true);
    setBulkEditError(null);
    const failed: string[] = [];
    for (const id of ids) {
      try {
        let body: Record<string, unknown> = { ...payload };
        if (descriptionTrim) {
          const g = garments.find((x) => x.id === id);
          const currentExtra = (g?.extra && typeof g.extra === 'object') ? { ...g.extra } as Record<string, unknown> : {};
          body = { ...body, extra: { ...currentExtra, description: descriptionTrim } };
        }
        const res = await fetch(`/api/manufacturer-garments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        if (!res.ok) failed.push(id);
      } catch {
        failed.push(id);
      }
    }
    setBulkEditSaving(false);
    if (failed.length === 0) {
      setShowBulkEdit(false);
      setBulkEditForm({ price: '', manufacturer_name: '', code: '', garment_type: '', description: '' });
      setSelectedIds(new Set());
      await load();
    } else {
      setBulkEditError(`Failed to update ${failed.length} of ${ids.length} garments.`);
    }
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setBulkUploading(true);
    setBulkProgress({ done: 0, total: bulkFiles.length, failed: [] });
    const failed: string[] = [];
    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      const name = fileNameWithoutExt(file);
      const { manufacturer, code } = parseGarmentName(name);
      const form = new FormData();
      form.set('name', name);
      form.set('file', file);
      if (manufacturer) form.set('manufacturer_name', manufacturer);
      if (code) form.set('code', code);
      try {
        const res = await fetch('/api/manufacturer-garments', {
          method: 'POST',
          credentials: 'include',
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Upload failed');
      } catch {
        failed.push(file.name);
      }
      setBulkProgress((p) => ({ ...p, done: i + 1, failed }));
    }
    setBulkUploading(false);
    await load();
    if (failed.length === 0) {
      setShowBulk(false);
      setBulkFiles([]);
      setBulkProgress({ done: 0, total: 0, failed: [] });
    } else {
      setBulkProgress((p) => ({ ...p, failed }));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Shirt className="w-6 h-6 text-slate-600" />
              Garment library
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              High-res manufacturer garment photos. Add one or bulk upload; name files like <span className="font-mono text-slate-700">MANUFACTURER_CODE_Color.jpg</span> and manufacturer/code are filled automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/stitched-assets"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ImageIcon className="w-4 h-4" />
              Stitched assets
            </Link>
            <button
              type="button"
              onClick={() => setShowBulk(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Upload className="w-4 h-4" />
              Bulk upload
            </button>
            <button
              type="button"
              onClick={() => setShowBulkEdit(true)}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title={selectedIds.size === 0 ? 'Select garments below first' : `Edit ${selectedIds.size} selected`}
            >
              <Pencil className="w-4 h-4" />
              Bulk edit{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-medium hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" />
              Add garment
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        {loadError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Could not load garment library</p>
            <p className="mt-1">{loadError}</p>
            {loadError.toLowerCase().includes('does not exist') || loadError.toLowerCase().includes('relation') ? (
              <p className="mt-2 text-amber-700">
                Run the database migration: <code className="bg-amber-100 px-1 rounded">supabase/migrations/20260310_garment_library.sql</code>
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => load()}
              className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              Retry
            </button>
          </div>
        )}
        {!loadError && loading && (
          <div className="text-center text-slate-500 py-12">Loading…</div>
        )}
        {!loadError && !loading && garments.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <Shirt className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">No garments yet</p>
            <p className="text-sm mt-1">Add high-res manufacturer photos and name them for use in proposals.</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => setShowBulk(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="w-4 h-4" />
                Bulk upload
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
              >
                <Plus className="w-4 h-4" />
                Add garment
              </button>
            </div>
          </div>
        )}
        {!loadError && !loading && garments.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-md flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, manufacturer, code, type…"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400"
                />
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">{selectedIds.size} selected</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {bundles.map(({ key, label, garments: groupGarments }) => {
                const isExpanded = expandedBundles.has(key);
                const priceLabel = formatBundlePrice(groupGarments);
                return (
                  <div key={key} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleBundle(key)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBundle(key); } }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                      )}
                      <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
                        {groupGarments.slice(0, 8).map((g) => (
                          <div
                            key={g.id}
                            className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0"
                          >
                            <img
                              src={g.image_url}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ))}
                        {groupGarments.length > 8 && (
                          <span className="text-xs text-slate-400 w-9 h-9 flex items-center justify-center flex-shrink-0">
                            +{groupGarments.length - 8}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-slate-900 min-w-0 truncate">{label}</span>
                      <span className="text-sm text-slate-500 shrink-0">
                        {groupGarments.length} {groupGarments.length === 1 ? 'colour' : 'colours'}
                      </span>
                      {priceLabel && (
                        <span className="text-sm font-medium text-slate-700 shrink-0">
                          {priceLabel}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds(new Set(groupGarments.map((g) => g.id)));
                          setShowBulkEdit(true);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                        title="Edit category (price, code, type…)"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); selectBundle(key, true); }}
                            className="text-sm font-medium text-slate-600 hover:text-slate-900"
                          >
                            Select all ({groupGarments.length})
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); selectBundle(key, false); }}
                            className="text-sm font-medium text-slate-600 hover:text-slate-900"
                          >
                            Select none
                          </button>
                        </div>
                        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {groupGarments.map((g) => (
                            <li
                              key={g.id}
                              onClick={() => openEdit(g)}
                              className={`rounded-xl border overflow-hidden shadow-sm hover:shadow transition-shadow cursor-pointer group ${selectedIds.has(g.id) ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'}`}
                            >
                              <div className="aspect-square bg-slate-100 relative">
                                <button
                                  type="button"
                                  onClick={(e) => toggleSelect(g.id, e)}
                                  className="absolute top-2 left-2 z-10 p-1 rounded-md bg-white/90 border border-slate-200 shadow-sm hover:bg-white text-slate-500 hover:text-emerald-600"
                                  title={selectedIds.has(g.id) ? 'Deselect' : 'Select for bulk edit'}
                                >
                                  {selectedIds.has(g.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                </button>
                                <img
                                  src={g.image_url}
                                  alt={g.name}
                                  className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end gap-1 p-2">
                                  <span className="text-xs font-medium text-white bg-slate-800/90 px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    Edit
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDelete(g.id, e)}
                                    disabled={deletingId === g.id}
                                    className="p-1.5 rounded-lg bg-white/90 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="p-3">
                                <p className="text-sm font-medium text-slate-900 truncate" title={g.name}>
                                  {g.name}
                                </p>
                                {(g.manufacturer_name || g.code || g.garment_type) && (
                                  <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {[g.manufacturer_name, g.code, g.garment_type].filter(Boolean).join(' · ')}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add garment</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Murray Kids Polo Navy"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">High-res image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setAddFile(file);
                    if (file) setAddName(fileNameWithoutExt(file));
                  }}
                  className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Name, manufacturer and code are filled from the filename (e.g. WINNINGSPIRIT_PS73K_BlackRed).</p>
              </div>
              {addError && (
                <p className="text-sm text-red-600">{addError}</p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setAddError(null);
                    setAddName('');
                    setAddFile(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || !addName.trim() || !addFile}
                  className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {adding ? 'Uploading…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Bulk upload garments</h2>
              <p className="text-sm text-slate-500 mt-1">
                Select multiple images. Each file is added with name from the filename; manufacturer and code are filled from <span className="font-mono">MANUFACTURER_CODE_Color</span>. You only need to set Type in Edit if you like.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setBulkFiles(Array.from(e.target.files ?? []))}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
              />
              {bulkFiles.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {bulkFiles.length} file{bulkFiles.length !== 1 ? 's' : ''} selected
                  </p>
                  <ul className="text-sm text-slate-600 space-y-1 max-h-40 overflow-y-auto">
                    {bulkFiles.map((f, i) => {
                      const name = fileNameWithoutExt(f);
                      const { manufacturer, code } = parseGarmentName(name);
                      return (
                        <li key={i} className="truncate">
                          {f.name} → <span className="font-medium text-slate-800">{name}</span>
                          {(manufacturer || code) && (
                            <span className="text-slate-500 ml-1">({manufacturer}{manufacturer && code ? ' · ' : ''}{code})</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {bulkProgress.total > 0 && (
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
                  {bulkUploading ? (
                    <p className="text-slate-700">
                      Uploading {bulkProgress.done} of {bulkProgress.total}…
                    </p>
                  ) : (
                    <p className="text-slate-700">
                      Done. {bulkProgress.done - bulkProgress.failed.length} uploaded
                      {bulkProgress.failed.length > 0 && `, ${bulkProgress.failed.length} failed`}.
                    </p>
                  )}
                  {bulkProgress.failed.length > 0 && !bulkUploading && (
                    <p className="text-red-600 mt-1 text-xs">
                      Failed: {bulkProgress.failed.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowBulk(false);
                  setBulkFiles([]);
                  setBulkProgress({ done: 0, total: 0, failed: [] });
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {bulkProgress.total > 0 && !bulkUploading ? 'Close' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleBulkUpload}
                disabled={bulkUploading || bulkFiles.length === 0}
                className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {bulkUploading ? `Uploading ${bulkProgress.done}/${bulkProgress.total}…` : `Upload ${bulkFiles.length} file${bulkFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Bulk edit {selectedIds.size} garments</h2>
            <p className="text-sm text-slate-500 mb-4">Only fields you fill will be applied. Leave blank to keep current value.</p>
            {bulkEditError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{bulkEditError}</p>
            )}
            {bulkFindResult && bulkFindResult.success > 0 && (
              <p className="text-sm mb-3 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800">
                Description fetched. Edit it below if needed, then click <strong>Apply to all selected</strong> to save to all {selectedIds.size} garments.
              </p>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price / cost</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={bulkEditForm.price}
                  onChange={(e) => setBulkEditForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={bulkEditForm.manufacturer_name}
                  onChange={(e) => setBulkEditForm((f) => ({ ...f, manufacturer_name: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  value={bulkEditForm.code}
                  onChange={(e) => setBulkEditForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={bulkEditForm.garment_type}
                  onChange={(e) => setBulkEditForm((f) => ({ ...f, garment_type: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Leave unchanged</option>
                  {GARMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (for Canva)</label>
                <p className="text-xs text-slate-600 mb-1.5">
                  Click <span className="font-semibold">Fetch description</span> to look up the product description (manufacturer + code), then edit below and click <span className="font-semibold">Apply to all selected</span> to save the same description to every selected garment.
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedIds.size) return;
                      setBulkEditError(null);
                      setBulkFindResult(null);
                      setBulkFindingDescription(true);
                      const firstId = Array.from(selectedIds)[0];
                      try {
                        const res = await fetch(`/api/manufacturer-garments/${firstId}/find-description`, {
                          method: 'POST',
                          credentials: 'include',
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setBulkEditError((data as { error?: string }).error || 'Could not fetch description.');
                          return;
                        }
                        const desc = (data as { description?: string }).description ?? (data as { extra?: { description?: string } }).extra?.description ?? '';
                        setBulkEditForm((f) => ({ ...f, description: typeof desc === 'string' ? desc : '' }));
                        setBulkFindResult({ success: 1, failed: 0 });
                      } catch (err) {
                        setBulkEditError(err instanceof Error ? err.message : 'Request failed.');
                      } finally {
                        setBulkFindingDescription(false);
                      }
                    }}
                    disabled={bulkFindingDescription || !selectedIds.size}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title="Fetch description for one garment (same product); edit below and Apply to save to all"
                  >
                    {bulkFindingDescription ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {bulkFindingDescription ? 'Fetching…' : 'Fetch description'}
                  </button>
                </div>
                <textarea
                  value={bulkEditForm.description}
                  onChange={(e) => setBulkEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Leave blank to keep current. Applied to all selected."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowBulkEdit(false);
                  setBulkEditError(null);
                  setBulkFindResult(null);
                  setBulkEditForm({ price: '', manufacturer_name: '', code: '', garment_type: '', description: '' });
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkEditSave}
                disabled={bulkEditSaving}
                className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {bulkEditSaving ? `Updating ${selectedIds.size}…` : 'Apply to all selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingGarment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-900">Edit garment</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {editError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
              {findDescriptionSuccess && <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">Description found and saved. You can copy it below.</p>}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (for Canva) — copy and paste into your template</label>
                <p className="text-xs text-slate-600 mb-2">Searches the web by manufacturer + code (or product name), or paste a product page URL and use Firecrawl to fetch the description.</p>
                <div className="mb-2">
                  <input
                    type="url"
                    value={editForm.product_url}
                    onChange={(e) => setEditForm((f) => ({ ...f, product_url: e.target.value }))}
                    placeholder="Paste product page URL for Firecrawl fetch…"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-2"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleFindDescription}
                    disabled={findingDescription}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {findingDescription ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {findingDescription ? 'Finding…' : 'Find description'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFetchDescription}
                    disabled={fetchingDescription || !editForm.product_url.trim()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title="Scrape this URL with Firecrawl and fill description below"
                  >
                    {fetchingDescription ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {fetchingDescription ? 'Fetching…' : 'Fetch from URL (Firecrawl)'}
                  </button>
                  {editForm.description ? (
                    <button
                      type="button"
                      onClick={handleCopyDescription}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {copyDescriptionDone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copyDescriptionDone ? 'Copied' : 'Copy'}
                    </button>
                  ) : null}
                </div>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Product description for proposals. Use Find description or Fetch from URL above. Use **text** for bold."
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y font-sans bg-white"
                />
                {editForm.description.trim() ? (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Preview (bold where you use **text**)</p>
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: descriptionWithBold(editForm.description) }}
                    />
                  </div>
                ) : null}
              </div>
              {editingGarment.image_url && (
                <div className="flex justify-center">
                  <img src={editingGarment.image_url} alt="" className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-slate-50" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={editForm.manufacturer_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, manufacturer_name: e.target.value }))}
                  placeholder="e.g. AUSSIE PACIFIC"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. FL02, 3307"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price / cost</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editForm.price}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={editForm.garment_type}
                    onChange={(e) => setEditForm((f) => ({ ...f, garment_type: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">—</option>
                    {GARMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Extra notes"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setEditingGarment(null); setEditError(null); }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {savingEdit ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
