'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, ExternalLink, Upload, Save } from 'lucide-react';
import type { ProposalTemplate } from '@/lib/types';

export default function TemplateEditPage() {
    const params = useParams();
    const id = params?.id as string;
    const [template, setTemplate] = useState<ProposalTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const loadTemplate = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(`/api/proposal-templates/${id}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Template not found');
            const data = await res.json();
            setTemplate(data);
            setName(data.name || 'Untitled Template');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadTemplate();
    }, [loadTemplate]);

    const handleSaveName = async () => {
        if (!id) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/proposal-templates/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: name.trim() || 'Untitled Template' }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
            const data = await res.json();
            setTemplate(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleReplacePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;
        setUploading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`/api/proposal-templates/${id}/upload-pdf`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            setTemplate(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center">
                <p className="text-slate-500">Loading…</p>
            </div>
        );
    }
    if (error && !template) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center gap-4">
                <p className="text-red-600">{error}</p>
                <Link href="/proposals" className="text-emerald-600 hover:underline">Back to Proposals</Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                <div className="px-4 py-4 sm:px-6 flex items-center gap-4">
                    <Link href="/proposals" className="p-2 text-slate-500 hover:text-slate-700 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-emerald-600" />
                        Edit template
                    </h1>
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 flex flex-col min-h-0">
                <div className="max-w-2xl w-full mx-auto space-y-6 flex-shrink-0">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Template name</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                                placeholder="e.g. Standard proposal"
                            />
                            <button
                                type="button"
                                onClick={handleSaveName}
                                disabled={saving}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Template PDF</label>
                        {template?.pdf_url ? (
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <a
                                        href={template.pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-medium"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open in new tab
                                    </a>
                                    <label className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700">
                                        <Upload className="w-4 h-4" />
                                        {uploading ? 'Uploading…' : 'Replace PDF'}
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={handleReplacePdf}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-slate-500 mb-2">Upload a PDF to use as this template.</p>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                    <span className="text-sm text-slate-600">
                                        {uploading ? 'Uploading…' : 'Choose a PDF file'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={handleReplacePdf}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    <Link
                        href="/proposals"
                        className="inline-block px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                    >
                        Back to Proposals
                    </Link>
                </div>

                {template?.pdf_url && (
                    <div className="mt-6 flex-1 min-h-0 flex flex-col max-w-4xl w-full mx-auto">
                        <h2 className="text-sm font-medium text-slate-700 mb-2">Preview — scroll through template</h2>
                        <div className="flex-1 min-h-[400px] bg-slate-200 rounded-xl border border-slate-300 overflow-hidden shadow-inner">
                            <iframe
                                src={`${template.pdf_url}#toolbar=1&navpanes=1&scrollbar=1`}
                                title="Template PDF preview"
                                className="w-full h-full min-h-[500px]"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
