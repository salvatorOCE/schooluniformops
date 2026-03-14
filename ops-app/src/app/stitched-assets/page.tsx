'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ImageIcon, Shirt, Building2, Upload, Loader2, CheckCircle2, XCircle, Download, Trash2 } from 'lucide-react';

type School = { id: string; code: string; name: string; logo_url: string | null };
type SchoolLogo = { id: string; label: string; image_url: string; created_at?: string };
type Garment = { id: string; name: string; image_url: string };
type StitchedAsset = {
  id: string;
  school_id: string;
  manufacturer_garment_id: string;
  image_url: string;
  created_at: string;
  manufacturer_garments: Garment | null;
};

export default function StitchedAssetsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [assets, setAssets] = useState<StitchedAsset[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingGarments, setLoadingGarments] = useState(false);
  const [logos, setLogos] = useState<SchoolLogo[]>([]);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [selectedLogoId, setSelectedLogoId] = useState<string>('');
  const [newLogoLabel, setNewLogoLabel] = useState('');
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogoId, setDeletingLogoId] = useState<string | null>(null);
  const [showStitch, setShowStitch] = useState(false);
  const [stitchLogoId, setStitchLogoId] = useState<string>('');
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<Set<string>>(new Set());
  const [stitching, setStitching] = useState(false);
  const [stitchResults, setStitchResults] = useState<{ garment_id: string; garment_name: string; ok: boolean; error?: string }[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);
  const hasLogo = logos.length > 0;

  useEffect(() => {
    let cancelled = false;
    setLoadingSchools(true);
    fetch('/api/schools/list', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setSchools(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingSchools(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) {
      setAssets([]);
      setLogos([]);
      setSelectedLogoId('');
      return;
    }
    setLoadingAssets(true);
    fetch(`/api/school-stitched-assets?school_id=${encodeURIComponent(selectedSchoolId)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setAssets(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoadingAssets(false));
    setLoadingLogos(true);
    fetch(`/api/schools/${selectedSchoolId}/logos`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setLogos(list);
        setSelectedLogoId(list.length > 0 ? list[0].id : '');
      })
      .finally(() => setLoadingLogos(false));
  }, [selectedSchoolId]);

  useEffect(() => {
    setLoadingGarments(true);
    fetch('/api/manufacturer-garments', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setGarments(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoadingGarments(false));
  }, []);

  const handleAddLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !newLogoFile) return;
    const label = newLogoLabel.trim() || (newLogoFile.name ? newLogoFile.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ') : 'Logo');
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.set('label', label);
      form.set('file', newLogoFile);
      const res = await fetch(`/api/schools/${selectedSchoolId}/logos`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Upload failed');
      setLogos((prev) => [...prev, data as SchoolLogo]);
      setNewLogoLabel('');
      setNewLogoFile(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async (logoId: string) => {
    if (logoId === 'legacy' || !selectedSchoolId) return;
    if (!confirm('Remove this logo from the school?')) return;
    setDeletingLogoId(logoId);
    try {
      const res = await fetch(`/api/schools/${selectedSchoolId}/logos/${logoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Delete failed');
      }
      setLogos((prev) => prev.filter((l) => l.id !== logoId));
      if (selectedLogoId === logoId) {
        const remaining = logos.filter((l) => l.id !== logoId);
        setSelectedLogoId(remaining.length > 0 ? remaining[0].id : '');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingLogoId(null);
    }
  };

  const handleStitch = async () => {
    if (!selectedSchoolId || selectedGarmentIds.size === 0) return;
    setStitching(true);
    setStitchResults(null);
    try {
      const res = await fetch('/api/school-stitched-assets/stitch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: selectedSchoolId,
          logo_id: stitchLogoId || undefined,
          garment_ids: Array.from(selectedGarmentIds),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Stitch failed');
      setStitchResults((data as { results?: typeof stitchResults }).results ?? null);
      setShowStitch(false);
      setSelectedGarmentIds(new Set());
      if (selectedSchoolId) {
        const listRes = await fetch(`/api/school-stitched-assets?school_id=${encodeURIComponent(selectedSchoolId)}`, {
          credentials: 'include',
        });
        const list = await listRes.json();
        setAssets(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Stitch request failed');
    } finally {
      setStitching(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Remove this stitched image? You can re-stitch it later.')) return;
    setDeletingId(assetId);
    try {
      const res = await fetch(`/api/school-stitched-assets/${assetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Delete failed');
      }
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleGarment = (id: string) => {
    setSelectedGarmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-slate-600" />
              Stitched assets
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Select a school, add its logo, then stitch the logo onto garment photos. Use the results in your Canva proposal.
            </p>
          </div>
          <Link
            href="/garment-library"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Shirt className="w-4 h-4" />
            Garment library
          </Link>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Building2 className="w-4 h-4 inline mr-1.5" />
            School
          </label>
          <select
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select school…</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
          {loadingSchools && <p className="text-sm text-slate-500 mt-1">Loading schools…</p>}
        </div>

        {selectedSchoolId && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">School logos</h3>
              {loadingLogos ? (
                <p className="text-sm text-slate-500">Loading logos…</p>
              ) : !hasLogo ? (
                <p className="text-sm text-amber-700 mb-3">Add at least one logo (e.g. Standard, Senior) to stitch onto garments.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {logos.map((logo) => (
                    <div
                      key={logo.id}
                      className={`flex items-center gap-2 rounded-lg border-2 p-2 ${selectedLogoId === logo.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedLogoId(logo.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        <img src={logo.image_url} alt={logo.label} className="w-10 h-10 object-contain rounded border border-slate-200 bg-white" />
                        <span className="text-sm font-medium text-slate-800">{logo.label}</span>
                      </button>
                      {logo.id !== 'legacy' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteLogo(logo.id)}
                          disabled={deletingLogoId === logo.id}
                          className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Remove this logo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={handleAddLogo} className="flex flex-wrap items-end gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Standard, Senior)"
                  value={newLogoLabel}
                  onChange={(e) => setNewLogoLabel(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-40"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewLogoFile(e.target.files?.[0] ?? null)}
                  className="text-sm file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm"
                />
                <button
                  type="submit"
                  disabled={!newLogoFile || uploadingLogo}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-700 text-white px-3 py-2 text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
                >
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Add logo
                </button>
              </form>
            </div>
            {hasLogo && (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStitchLogoId(selectedLogoId || (logos[0]?.id ?? ''));
                    setShowStitch(true);
                  }}
                  disabled={stitching || garments.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {stitching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  Stitch logo onto garments
                </button>
              </div>
            )}

            {loadingAssets ? (
              <p className="text-sm text-slate-500">Loading stitched assets…</p>
            ) : assets.length === 0 && hasLogo ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                <ImageIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm">No stitched images yet. Click “Stitch logo onto garments” and select garments.</p>
              </div>
            ) : assets.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Stitched images for this school — use in Canva</h2>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {assets.map((a) => {
                    const name = (a.manufacturer_garments as Garment | null)?.name ?? 'Garment';
                    return (
                      <li key={a.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="aspect-square bg-slate-100 relative">
                          <img src={a.image_url} alt={name} className="w-full h-full object-contain" />
                        </div>
                        <div className="p-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-700 truncate flex-1" title={name}>
                            {name}
                          </p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <a
                              href={a.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                              title="Open in new tab (copy to Canva)"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(a.id)}
                              disabled={deletingId === a.id}
                              className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Remove this stitched image"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </>
        )}

        {stitchResults && stitchResults.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Last stitch run</h3>
            <ul className="space-y-1 text-sm">
              {stitchResults.map((r) => (
                <li key={r.garment_id} className="flex items-center gap-2">
                  {r.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className={r.ok ? 'text-slate-700' : 'text-red-600'}>
                    {r.garment_name} {r.ok ? '— saved' : `— ${r.error ?? 'failed'}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showStitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Stitch logo onto garments</h2>
              <p className="text-sm text-slate-500 mt-1">Choose which logo to use, then select garments.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Logo to embroider</p>
                <div className="flex flex-wrap gap-2">
                  {logos.map((logo) => (
                    <label
                      key={logo.id}
                      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 cursor-pointer ${stitchLogoId === logo.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}
                    >
                      <input
                        type="radio"
                        name="stitchLogo"
                        value={logo.id}
                        checked={stitchLogoId === logo.id}
                        onChange={() => setStitchLogoId(logo.id)}
                        className="sr-only"
                      />
                      <img src={logo.image_url} alt={logo.label} className="w-8 h-8 object-contain rounded border border-slate-200 bg-white" />
                      <span className="text-sm font-medium text-slate-800">{logo.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Garments</p>
              <ul className="space-y-2">
                {garments.map((g) => (
                  <li key={g.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedGarmentIds.has(g.id)}
                      onChange={() => toggleGarment(g.id)}
                      className="rounded border-slate-300"
                    />
                    <img src={g.image_url} alt="" className="w-12 h-12 object-contain rounded border border-slate-200 bg-slate-50" />
                    <span className="text-sm font-medium text-slate-800">{g.name}</span>
                  </li>
                ))}
              </ul>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowStitch(false);
                  setSelectedGarmentIds(new Set());
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStitch}
                disabled={stitching || selectedGarmentIds.size === 0}
                className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {stitching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Stitching… (this may take a minute)
                  </>
                ) : (
                  `Stitch ${selectedGarmentIds.size} garment${selectedGarmentIds.size !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
