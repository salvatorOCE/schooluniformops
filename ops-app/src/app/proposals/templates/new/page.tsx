'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const TEMPLATE_PDF_BUCKET = 'proposal-template-pdfs';

export default function NewTemplatePage() {
    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please choose a PDF file.');
            return;
        }
        if (file.type !== 'application/pdf') {
            setError('File must be a PDF.');
            return;
        }
        if (!supabase) {
            setError('Storage not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
            return;
        }
        setCreating(true);
        setError(null);
        try {
            // 1) Create template and get signed upload credentials (no file through Next.js = no body size limit)
            const res = await fetch('/api/proposal-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: (name || 'Untitled Template').trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create template');
            const { upload: uploadCreds } = data;
            if (!uploadCreds?.path || !uploadCreds?.token) {
                throw new Error('Server did not return upload credentials');
            }
            // 2) Upload file directly to Supabase Storage (1:1, no parsing)
            const { error: uploadError } = await supabase.storage
                .from(TEMPLATE_PDF_BUCKET)
                .uploadToSignedUrl(uploadCreds.path, uploadCreds.token, file, {
                    contentType: 'application/pdf',
                });
            if (uploadError) throw new Error(uploadError.message || 'Upload to storage failed');
            router.push('/proposals/templates');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create template');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 min-w-0">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                <div className="px-4 py-4 sm:px-6 flex items-center gap-4">
                    <Link href="/proposals" className="p-2 text-slate-500 hover:text-slate-700 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-emerald-600" />
                        New template (upload PDF)
                    </h1>
                </div>
            </div>
            <div className="flex-1 p-4 sm:p-6 max-w-md mx-auto w-full">
                <p className="text-slate-600 mb-6">
                    Upload your own PDF to use as a proposal template. When you create a new proposal and select this template, that PDF will be used as the starting document for the proposal.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Template name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Standard uniform proposal"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">PDF file</label>
                        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                            <Upload className="w-10 h-10 text-slate-400 mb-2" />
                            <span className="text-sm text-slate-600">
                                {file ? file.name : 'Choose a PDF file'}
                            </span>
                            <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                disabled={creating}
                            />
                        </label>
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
                            type="submit"
                            disabled={creating || !file}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg"
                        >
                            {creating ? 'Creating…' : 'Create template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
