'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import type { ProposalTemplate } from '@/lib/types';

interface SchoolOption {
    id: string;
    code: string;
    name: string;
}

export default function NewProposalPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [loadingSchools, setLoadingSchools] = useState(true);
    const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/proposal-templates', { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load templates');
                const data = await res.json();
                const list = Array.isArray(data) ? data : [];
                setTemplates(list.filter((t: ProposalTemplate) => t.pdf_url));
                if (list.length > 0 && !selectedTemplateId) {
                    const firstWithPdf = list.find((t: ProposalTemplate) => t.pdf_url);
                    if (firstWithPdf) setSelectedTemplateId(firstWithPdf.id);
                }
            } catch (e) {
                console.error(e);
                setTemplates([]);
            } finally {
                setLoadingTemplates(false);
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/schools/list', { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load schools');
                const data = await res.json();
                setSchools(
                    Array.isArray(data)
                        ? data.map((s: { id: string; code: string; name: string }) => ({
                              id: s.id,
                              code: s.code,
                              name: s.name,
                          }))
                        : []
                );
            } catch (e) {
                console.error(e);
                setSchools([]);
            } finally {
                setLoadingSchools(false);
            }
        })();
    }, []);

    const handleCreate = async () => {
        if (!selectedSchool) {
            setError('Please select a school.');
            return;
        }
        if (!selectedTemplateId) {
            setError('Please select a template.');
            return;
        }
        setCreating(true);
        setError(null);
        try {
            const res = await fetch('/api/proposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    school_id: selectedSchool.id,
                    school_name: selectedSchool.name,
                    school_code: selectedSchool.code,
                    title: `Uniform Proposal for ${selectedSchool.name}`,
                    status: 'draft',
                    template_id: selectedTemplateId,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create proposal');
            router.push(`/proposals/${data.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create proposal');
        } finally {
            setCreating(false);
        }
    };

    const pdfTemplates = templates.filter((t) => t.pdf_url);
    const canSubmit = selectedSchool && selectedTemplateId && !creating;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                <div className="px-4 py-4 sm:px-6 flex items-center gap-4">
                    <Link href="/proposals" className="p-2 text-slate-500 hover:text-slate-700 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-emerald-600" />
                        New proposal
                    </h1>
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 max-w-md mx-auto w-full space-y-6">
                <p className="text-slate-600">
                    Select a school and a template. The template PDF will be copied to the proposal as-is.
                </p>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Template</label>
                    <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                    >
                        <option value="">— Select template —</option>
                        {pdfTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name || 'Untitled Template'}
                            </option>
                        ))}
                    </select>
                    {!loadingTemplates && pdfTemplates.length === 0 && (
                        <p className="text-sm text-amber-600 mt-1">
                            No templates with PDF yet. Upload a template PDF first.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">School</label>
                    <select
                        value={selectedSchool?.id ?? ''}
                        onChange={(e) => {
                            const id = e.target.value;
                            setSelectedSchool(schools.find((s) => s.id === id) ?? null);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                    >
                        <option value="">— Select school —</option>
                        {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} ({s.code})
                            </option>
                        ))}
                    </select>
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
                        Cancel
                    </Link>
                    <button
                        onClick={handleCreate}
                        disabled={!canSubmit}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg"
                    >
                        {creating ? 'Creating…' : 'Create proposal'}
                    </button>
                </div>
            </div>
        </div>
    );
}
