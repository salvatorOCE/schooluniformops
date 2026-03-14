'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FileText, Plus, Search, ExternalLink, ChevronRight, LayoutTemplate, ChevronDown, ChevronUp, Trash2, Pencil, Download } from 'lucide-react';
import type { Proposal, ProposalTemplate } from '@/lib/types';

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
}

function statusColor(status: string): string {
    switch (status) {
        case 'sent': return 'bg-emerald-100 text-emerald-800';
        case 'final': return 'bg-blue-100 text-blue-800';
        default: return 'bg-slate-100 text-slate-700';
    }
}

export default function ProposalsPage() {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setLoadError(null);
        setProposals([]);
        setTemplates([]);
        try {
            const [proposalsRes, templatesRes] = await Promise.all([
                fetch('/api/proposals', { credentials: 'include' }),
                fetch('/api/proposal-templates', { credentials: 'include' }),
            ]);
            const proposalsData = proposalsRes.ok ? await proposalsRes.json() : [];
            const templatesData = templatesRes.ok ? await templatesRes.json() : [];
            setProposals(Array.isArray(proposalsData) ? proposalsData : []);
            setTemplates(Array.isArray(templatesData) ? templatesData : []);
            const errors: string[] = [];
            if (!proposalsRes.ok) {
                const err = await proposalsRes.json().catch(() => ({}));
                console.warn('Proposals fetch failed:', proposalsRes.status, err);
                errors.push((err as { error?: string })?.error || 'Proposals');
            }
            if (!templatesRes.ok) {
                const err = await templatesRes.json().catch(() => ({}));
                console.warn('Templates fetch failed:', templatesRes.status, err);
                errors.push((err as { error?: string })?.error || 'Templates');
            }
            if (errors.length) setLoadError(errors.join('; '));
        } catch (e) {
            console.error('Failed to load', e);
            setLoadError('Network or unexpected error. Check console.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Delete this template? Proposals created from it will keep their content.')) return;
        try {
            const res = await fetch(`/api/proposal-templates/${id}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) throw new Error('Delete failed');
            setTemplates((prev) => prev.filter((t) => t.id !== id));
        } catch (err) {
            console.error(err);
            alert('Failed to delete template');
        }
    };

    const handleDeleteProposal = async (p: Proposal, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Delete proposal "${p.title || p.school_name}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/proposals/${p.id}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) throw new Error(res.status === 404 ? 'Proposal not found' : 'Delete failed');
            setProposals((prev) => prev.filter((x) => x.id !== p.id));
        } catch (err) {
            console.error(err);
            alert('Failed to delete proposal');
        }
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return proposals;
        const q = search.toLowerCase().trim();
        return proposals.filter(
            (p) =>
                (p.school_name && p.school_name.toLowerCase().includes(q)) ||
                (p.school_code && p.school_code.toLowerCase().includes(q)) ||
                (p.title && p.title.toLowerCase().includes(q))
        );
    }, [proposals, search]);

    if (loading && proposals.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
                <div className="p-8 text-center text-slate-500">Loading proposals...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 min-w-0 overflow-x-hidden">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0">
                <div className="w-full min-w-0 flex flex-col px-4 py-5 gap-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 min-w-0">
                        <div className="shrink-0 text-left">
                            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-emerald-600" />
                                Proposals
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">Track proposals sent to schools. View, record replies, delete. Flow: Garment library → Stitched assets → create in Canva → save here for the school.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/proposals/templates/new"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg shadow-sm transition-colors"
                            >
                                <LayoutTemplate className="w-4 h-4" />
                                Upload template (PDF)
                            </Link>
                            <Link
                                href="/proposals/new"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                New proposal
                            </Link>
                        </div>
                    </div>
                    {loadError && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                            Could not load data: {loadError}. Ensure Supabase is configured and migrations are applied.
                        </div>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by school name, code, or title..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        />
                    </div>
                    {templates.length > 0 && (
                        <>
                            <p className="text-xs text-slate-500">
                                Download a template PDF to create proposals in Canva. Upload your own (from Canva) via &quot;Upload template (PDF)&quot;.
                                {' '}
                                <Link href="/proposals/templates" className="text-emerald-600 hover:underline">View all templates →</Link>
                            </p>
                            <button
                                type="button"
                                onClick={() => setTemplatesOpen((o) => !o)}
                                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                            >
                                <LayoutTemplate className="w-4 h-4" />
                                Templates ({templates.length})
                                {templatesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </>
                    )}
                    {templatesOpen && templates.length > 0 && (
                        <ul className="space-y-2 border border-slate-200 rounded-lg bg-slate-50 p-3">
                            {templates.map((t) => (
                                <li key={t.id}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Link
                                            href={`/proposals/templates/${t.id}/edit`}
                                            className="flex-1 min-w-0 flex items-center gap-2 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
                                        >
                                            <LayoutTemplate className="w-4 h-4 text-slate-500 shrink-0" />
                                            <span className="font-medium text-slate-900">{t.name || 'Untitled Template'}</span>
                                            <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        </Link>
                                        {t.pdf_url ? (
                                            <a
                                                href={t.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download PDF
                                            </a>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteTemplate(t.id, e)}
                                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                                            title="Delete template"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 min-w-0">
                <div className="max-w-4xl mx-auto">
                    {filtered.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600 font-medium">No proposals yet</p>
                            <p className="text-slate-500 text-sm mt-1">Create a proposal from a template (download from Templates), build it in Canva with stitched assets, then add it here to track and record replies.</p>
                            <Link
                                href="/proposals/new"
                                className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                            >
                                <Plus className="w-4 h-4" />
                                New proposal
                            </Link>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {filtered.map((p) => (
                                <li key={p.id}>
                                    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all group">
                                        <Link
                                            href={`/proposals/${p.id}`}
                                            className="flex-1 flex items-center gap-4 min-w-0"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 truncate">{p.title || `Proposal for ${p.school_name}`}</p>
                                                <p className="text-sm text-slate-500 truncate">{p.school_name} {p.school_code && `(${p.school_code})`}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                                                {p.status}
                                            </span>
                                            <span className="text-sm text-slate-400">{formatDate(p.created_at)}</span>
                                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                                        </Link>
                                        {p.pdf_url && (
                                            <a
                                                href={`${p.pdf_url}${p.pdf_url.includes('?') ? '&' : '?'}v=${encodeURIComponent((p as { updated_at?: string }).updated_at || '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg shrink-0"
                                                title="Open PDF"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteProposal(p, e)}
                                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                                            title="Delete proposal"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
