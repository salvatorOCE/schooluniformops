'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, ExternalLink, Upload, Sparkles, Check, MessageSquare, Save } from 'lucide-react';
import type { Proposal, ProposalTemplate } from '@/lib/types';

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

function statusColor(status: string): string {
    switch (status) {
        case 'sent':
            return 'bg-emerald-100 text-emerald-800';
        case 'final':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-slate-100 text-slate-700';
    }
}

export default function ProposalDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [template, setTemplate] = useState<ProposalTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [titleEdit, setTitleEdit] = useState('');
    const [statusEdit, setStatusEdit] = useState<Proposal['status']>('draft');
    const [logoUploading, setLogoUploading] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [pdfJustGenerated, setPdfJustGenerated] = useState(false);
    const [lastGenerationNote, setLastGenerationNote] = useState<string | null>(null);
    const [replyEdit, setReplyEdit] = useState('');
    const [replyAtEdit, setReplyAtEdit] = useState('');
    const [savingReply, setSavingReply] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const loadProposal = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(`/api/proposals/${id}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Proposal not found');
            const data = await res.json();
            setProposal(data);
            setTitleEdit(data.title ?? '');
            setStatusEdit((data.status as Proposal['status']) || 'draft');
            setReplyEdit(data.reply_text ?? '');
            setReplyAtEdit(data.reply_at ? data.reply_at.slice(0, 16) : '');
            if (data.template_id) {
                const tRes = await fetch(`/api/proposal-templates/${data.template_id}`, {
                    credentials: 'include',
                });
                if (tRes.ok) {
                    const tData = await tRes.json();
                    setTemplate(tData);
                }
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadProposal();
    }, [loadProposal]);

    useEffect(() => {
        if (!pdfJustGenerated) return;
        const t = setTimeout(() => {
            setPdfJustGenerated(false);
            setLastGenerationNote(null);
        }, 12000);
        return () => clearTimeout(t);
    }, [pdfJustGenerated]);

    useEffect(() => {
        setPdfJustGenerated(false);
        setLastGenerationNote(null);
    }, [id]);

    const handleSave = async () => {
        if (!id || !proposal) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/proposals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title: titleEdit.trim() || proposal.title, status: statusEdit }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
            const data = await res.json();
            setProposal(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        setLogoUploading(true);
        setError(null);
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
            const res = await fetch(`/api/proposals/${id}/upload-logo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ dataUrl }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Logo upload failed');
            }
            const data = await res.json();
            setProposal(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Logo upload failed');
        } finally {
            setLogoUploading(false);
            e.target.value = '';
        }
    };

    const handleSaveReply = async () => {
        if (!id) return;
        setSavingReply(true);
        setError(null);
        try {
            const replyAt = replyAtEdit.trim() ? new Date(replyAtEdit).toISOString() : null;
            const res = await fetch(`/api/proposals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    reply_text: replyEdit.trim() || null,
                    reply_at: replyAt,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Save reply failed');
            const data = await res.json();
            setProposal(data);
            setReplyEdit(data.reply_text ?? '');
            setReplyAtEdit(data.reply_at ? data.reply_at.slice(0, 16) : '');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save reply failed');
        } finally {
            setSavingReply(false);
        }
    };

    const handleGeneratePdfWithLogo = async () => {
        if (!id || !proposal) return;
        if (!proposal.logo_url) {
            setError('Upload a school logo first.');
            return;
        }
        if (!proposal.pdf_url) {
            setError('Proposal has no PDF yet.');
            return;
        }
        setGeneratingPdf(true);
        setError(null);
        try {
            const res = await fetch(`/api/proposals/${id}/generate-pdf-with-logo`, {
                method: 'POST',
                credentials: 'include',
            });
            const contentType = res.headers.get('content-type') ?? '';
            let data: { error?: string };
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                throw new Error(res.ok ? 'Invalid response' : text.slice(0, 200) || `Request failed (${res.status})`);
            }
            if (!res.ok) throw new Error(data.error || 'Generate PDF failed');
            setProposal(data as Proposal);
            setPdfJustGenerated(true);
            const meta = (data as { _generation?: { mode?: string; stitchApiUsed?: boolean; debug?: { sourcePdf: string; replicateTokenSet?: boolean; pages: { pageIndex: number; regions: string[] }[] } } })._generation;
            if (meta?.mode === 'hybrid') {
                let note = meta.stitchApiUsed
                    ? 'Hybrid: stitch API was used for garments.'
                    : 'Hybrid: garments pasted back unchanged (stitch API not used or failed).';
                if (meta.debug?.replicateTokenSet === false) {
                    note += ' Set REPLICATE_API_TOKEN in ops-app/.env.local and restart the server to use Nano Banana.';
                }
                if (meta.debug?.pages?.length) {
                    const summary = meta.debug.pages.map((p) => `P${p.pageIndex}: ${p.regions.length ? p.regions.join(', ') : '0 regions'}`).join(' | ');
                    note += ` [${meta.debug.sourcePdf} PDF. ${summary}]`;
                }
                setLastGenerationNote(note);
            } else {
                setLastGenerationNote(null);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Generate PDF failed');
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading && !proposal) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50">
                <div className="p-8 text-center text-slate-500">Loading proposal…</div>
            </div>
        );
    }

    if (error && !proposal) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 p-8">
                <p className="text-red-600">{error}</p>
                <Link href="/proposals" className="mt-4 text-emerald-600 hover:underline">
                    Back to proposals
                </Link>
            </div>
        );
    }

    if (!proposal) return null;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                <div className="px-4 py-4 sm:px-6 flex items-center gap-4">
                    <Link href="/proposals" className="p-2 text-slate-500 hover:text-slate-700 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-emerald-600" />
                        Proposal
                    </h1>
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                    <div>
                        <p className="text-sm text-slate-500">School</p>
                        <p className="font-medium text-slate-900">
                            {proposal.school_name}
                            {proposal.school_code && ` (${proposal.school_code})`}
                        </p>
                    </div>
                    {template && (
                        <div>
                            <p className="text-sm text-slate-500">Template</p>
                            <p className="font-medium text-slate-900">{template.name || 'Untitled Template'}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Title</p>
                        <input
                            type="text"
                            value={titleEdit}
                            onChange={(e) => setTitleEdit(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                        />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Status</p>
                        <select
                            value={statusEdit}
                            onChange={(e) => setStatusEdit(e.target.value as Proposal['status'])}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                        >
                            <option value="draft">draft</option>
                            <option value="final">final</option>
                            <option value="sent">sent</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>Created {formatDate(proposal.created_at)}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(proposal.status)}`}>
                            {proposal.status}
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                    <p className="text-sm text-slate-500">School logo</p>
                    {proposal.logo_url ? (
                        <div className="flex items-center gap-3">
                            <img
                                src={proposal.logo_url}
                                alt="School logo"
                                className="h-14 w-14 object-contain border border-slate-200 rounded-lg"
                            />
                            <div className="flex flex-col gap-2">
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                    disabled={logoUploading}
                                />
                                <button
                                    type="button"
                                    onClick={() => logoInputRef.current?.click()}
                                    disabled={logoUploading}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                                >
                                    <Upload className="w-4 h-4" />
                                    {logoUploading ? 'Uploading…' : 'Change logo'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                className="hidden"
                                onChange={handleLogoUpload}
                                disabled={logoUploading}
                            />
                            <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                disabled={logoUploading}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg disabled:opacity-50"
                            >
                                <Upload className="w-4 h-4" />
                                {logoUploading ? 'Uploading…' : 'Upload school logo'}
                            </button>
                        </div>
                    )}
                    {proposal.logo_url && proposal.pdf_url && (
                        <button
                            type="button"
                            onClick={handleGeneratePdfWithLogo}
                            disabled={generatingPdf}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50"
                        >
                            <Sparkles className="w-4 h-4" />
                            {generatingPdf ? 'Applying logo…' : 'Generate PDF with logo'}
                        </button>
                    )}
                </div>

                {proposal.pdf_url && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <p className="text-sm text-slate-500 mb-2">Proposal PDF</p>
                        <div className="flex flex-wrap items-center gap-3">
                            <a
                                href={`${proposal.pdf_url}${proposal.pdf_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(proposal.updated_at || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Open PDF
                            </a>
                            {pdfJustGenerated && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                                    <Check className="w-4 h-4 shrink-0" />
                                    New Proposal PDF complete
                                </span>
                            )}
                        </div>
                        {lastGenerationNote && (
                            <p className="mt-2 text-xs text-slate-500 max-w-md">{lastGenerationNote}</p>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Reply from school
                    </p>
                    <textarea
                        value={replyEdit}
                        onChange={(e) => setReplyEdit(e.target.value)}
                        placeholder="Record the school’s reply or notes here…"
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 resize-y"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            Reply date
                            <input
                                type="datetime-local"
                                value={replyAtEdit}
                                onChange={(e) => setReplyAtEdit(e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={handleSaveReply}
                            disabled={savingReply}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                        >
                            <Save className="w-4 h-4" />
                            {savingReply ? 'Saving…' : 'Save reply'}
                        </button>
                    </div>
                    {proposal.reply_at && (
                        <p className="text-xs text-slate-500">
                            Last saved: {formatDate(proposal.reply_at)}
                        </p>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <Link
                        href="/proposals"
                        className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                    >
                        Back to list
                    </Link>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
