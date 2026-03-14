'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutTemplate, Plus, Download, Pencil, Trash2 } from 'lucide-react';
import type { ProposalTemplate } from '@/lib/types';

export default function TemplatesListPage() {
    const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/proposal-templates', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load templates');
            const data = await res.json();
            setTemplates(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete template "${name}"? Proposals created from it will keep their content.`)) return;
        try {
            const res = await fetch(`/api/proposal-templates/${id}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) throw new Error('Delete failed');
            setTemplates((prev) => prev.filter((t) => t.id !== id));
        } catch (e) {
            console.error(e);
            alert('Failed to delete template');
        }
    };

    if (loading && templates.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
                <div className="p-8 text-center text-slate-500">Loading templates…</div>
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
                                <LayoutTemplate className="w-6 h-6 text-emerald-600" />
                                Proposal templates
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Download a PDF template to create proposals in Canva. Upload a template you made in Canva so anyone can download and use it.
                            </p>
                        </div>
                        <Link
                            href="/proposals/templates/new"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Upload template (PDF)
                        </Link>
                    </div>
                    {error && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 min-w-0">
                <div className="max-w-3xl mx-auto">
                    {templates.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600 font-medium">No templates yet</p>
                            <p className="text-slate-500 text-sm mt-1">
                                Upload a PDF template (e.g. from Canva) so your team can download it and create proposals.
                            </p>
                            <Link
                                href="/proposals/templates/new"
                                className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                            >
                                <Plus className="w-4 h-4" />
                                Upload template (PDF)
                            </Link>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {templates.map((t) => (
                                <li key={t.id}>
                                    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all flex-wrap">
                                        <div className="flex-1 min-w-0 flex items-center gap-3">
                                            <LayoutTemplate className="w-5 h-5 text-slate-500 shrink-0" />
                                            <span className="font-medium text-slate-900">{t.name || 'Untitled Template'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {t.pdf_url ? (
                                                <a
                                                    href={t.pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Download PDF
                                                </a>
                                            ) : (
                                                <span className="text-sm text-slate-400">No PDF — upload in Edit</span>
                                            )}
                                            <Link
                                                href={`/proposals/templates/${t.id}/edit`}
                                                className="inline-flex items-center gap-2 px-3 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium"
                                            >
                                                <Pencil className="w-4 h-4" />
                                                Edit
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(t.id, t.name || 'Untitled Template')}
                                                className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                                                title="Delete template"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-6">
                        <Link
                            href="/proposals"
                            className="text-sm text-slate-500 hover:text-slate-700"
                        >
                            ← Back to Proposals
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
