'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { School, Search, RefreshCw, Download, Plus, X, Pencil } from 'lucide-react';
import { useData } from '@/lib/data-provider';
import { exportToCSV } from '@/lib/csv-export';
import { useMobile } from '@/lib/mobile-context';
import type { SchoolListRow } from '@/lib/types';

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
}

export default function AllSchoolsPage() {
    const adapter = useData();
    const { isMobile } = useMobile();
    const [schools, setSchools] = useState<SchoolListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddSchool, setShowAddSchool] = useState(false);
    const [addingSchool, setAddingSchool] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolCode, setNewSchoolCode] = useState('');
    const [editSchool, setEditSchool] = useState<SchoolListRow | null>(null);
    const [editXeroContactId, setEditXeroContactId] = useState('');
    const [savingXero, setSavingXero] = useState(false);
    const [xeroEditError, setXeroEditError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/schools/list', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load schools');
            const data = await res.json();
            setSchools(data);
        } catch (e) {
            console.error('Failed to load schools', e);
            setSchools([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return schools;
        const q = search.toLowerCase().trim();
        return schools.filter(
            (s) =>
                (s.code && s.code.toLowerCase().includes(q)) ||
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.slug && s.slug.toLowerCase().includes(q))
        );
    }, [schools, search]);

    const handleAddSchool = async () => {
        if (!newSchoolName?.trim() || !newSchoolCode?.trim()) return;
        setAddingSchool(true);
        setAddError(null);
        try {
            await adapter.createSchool(newSchoolName.trim(), newSchoolCode.trim().toUpperCase());
            setShowAddSchool(false);
            setNewSchoolName('');
            setNewSchoolCode('');
            await load();
        } catch (e) {
            setAddError(e instanceof Error ? e.message : 'Failed to add school');
        } finally {
            setAddingSchool(false);
        }
    };

    const handleSaveXeroContactId = async () => {
        if (!editSchool) return;
        setSavingXero(true);
        setXeroEditError(null);
        try {
            const res = await fetch(`/api/schools/${editSchool.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ xero_contact_id: editXeroContactId.trim() || null }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed (${res.status})`);
            }
            setEditSchool(null);
            await load();
        } catch (e) {
            setXeroEditError(e instanceof Error ? e.message : 'Failed to update');
        } finally {
            setSavingXero(false);
        }
    };

    if (loading && schools.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
                <div className="p-8 text-center text-slate-500">Loading all schools...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 min-w-0 overflow-x-hidden">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0">
                <div className={`w-full min-w-0 flex flex-col ${isMobile ? 'px-3 py-2 gap-1.5' : 'px-0 py-5 gap-4'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 min-w-0">
                        <div className="shrink-0 text-left">
                            <h1 className={`font-bold text-slate-900 tracking-tight inline-flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                                <School className={`text-slate-500 shrink-0 ${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
                                <span>All Schools</span>
                            </h1>
                            {!isMobile && (
                                <p className="text-slate-500 font-medium mt-0.5 text-sm">
                                    Schools and their product and order counts. Add or manage schools here.
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="relative w-full sm:w-64 shrink-0">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search code, name, slug..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddSchool(true);
                                    setAddError(null);
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add school
                            </button>
                            <button
                                onClick={load}
                                disabled={loading}
                                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    exportToCSV(filtered, {
                                        filename: 'schools',
                                        columns: [
                                            { key: 'code', label: 'Code' },
                                            { key: 'name', label: 'Name' },
                                            { key: 'slug', label: 'Slug' },
                                            { key: 'product_count', label: 'Products' },
                                            { key: 'order_count', label: 'Orders' },
                                            { key: 'created_at', label: 'Created' },
                                            { key: 'updated_at', label: 'Updated' },
                                        ],
                                    })
                                }
                                disabled={filtered.length === 0}
                                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                title="Export CSV"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="text-sm text-slate-500">
                        {filtered.length} school{filtered.length !== 1 ? 's' : ''}
                        {search && ` (filtered from ${schools.length})`}
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-6 min-w-0">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider w-14">Logo</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Code</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Name</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Slug</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Xero Contact ID</th>
                                    <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Products</th>
                                    <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Orders</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Created</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/80">
                                        <td className="px-3 py-2.5">
                                            {s.logo_url ? (
                                                <img
                                                    src={s.logo_url}
                                                    alt=""
                                                    className="w-10 h-10 object-contain rounded border border-slate-200 bg-white"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <School className="w-5 h-5" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-slate-700 font-medium">{s.code ?? '—'}</td>
                                        <td className="px-3 py-2.5 font-medium text-slate-900">{s.name ?? '—'}</td>
                                        <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">{s.slug ?? '—'}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-xs text-slate-600 truncate max-w-[140px]" title={s.xero_contact_id ?? undefined}>
                                                    {s.xero_contact_id ? `${s.xero_contact_id.slice(0, 8)}…` : '—'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditSchool(s);
                                                        setEditXeroContactId(s.xero_contact_id ?? '');
                                                        setXeroEditError(null);
                                                    }}
                                                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                    title="Edit Xero Contact ID"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right text-slate-700">{s.product_count ?? 0}</td>
                                        <td className="px-3 py-2.5 text-right text-slate-700">{s.order_count ?? 0}</td>
                                        <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(s.created_at)}</td>
                                        <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(s.updated_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-slate-500">
                            {search ? 'No schools match your search.' : 'No schools yet.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Add School modal */}
            {showAddSchool && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <School className="w-5 h-5 text-slate-500" />
                                Add School
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddSchool(false);
                                    setAddError(null);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {addError && (
                                <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm border border-red-100">
                                    {addError}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">School Name</label>
                                <input
                                    type="text"
                                    value={newSchoolName}
                                    onChange={(e) => setNewSchoolName(e.target.value)}
                                    placeholder="e.g. Flaxmill Primary School"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">School Code</label>
                                <input
                                    type="text"
                                    value={newSchoolCode}
                                    onChange={(e) => setNewSchoolCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. FLAXMILL"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddSchool(false);
                                    setAddError(null);
                                }}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddSchool}
                                disabled={addingSchool || !newSchoolName.trim() || !newSchoolCode.trim()}
                                className="px-4 py-2 text-sm font-semibold text-white bg-[#002D2B] rounded-lg hover:bg-[#004440] disabled:opacity-50"
                            >
                                {addingSchool ? 'Adding...' : 'Add School'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Xero Contact ID modal */}
            {editSchool && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-900">Xero Contact — {editSchool.name}</h3>
                            <button
                                type="button"
                                onClick={() => { setEditSchool(null); setXeroEditError(null); }}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {xeroEditError && (
                                <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm border border-red-100">
                                    {xeroEditError}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Xero Contact ID (UUID)</label>
                                <input
                                    type="text"
                                    value={editXeroContactId}
                                    onChange={(e) => setEditXeroContactId(e.target.value)}
                                    placeholder="Leave blank to auto-create on first invoice"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => { setEditSchool(null); setXeroEditError(null); }}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveXeroContactId}
                                disabled={savingXero}
                                className="px-4 py-2 text-sm font-semibold text-white bg-[#002D2B] rounded-lg hover:bg-[#004440] disabled:opacity-50"
                            >
                                {savingXero ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
