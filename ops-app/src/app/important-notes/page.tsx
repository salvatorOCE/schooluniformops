'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImportantNote, ImportantNotePriority } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import {
    StickyNote,
    Calendar,
    Send,
    Trash2,
    Pencil,
    X,
    Loader2,
    Camera,
} from 'lucide-react';

function formatNoteDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
    if (isToday) {
        return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ImportantNotesPage() {
    const [notes, setNotes] = useState<ImportantNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [pendingUrls, setPendingUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editBody, setEditBody] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [priority, setPriority] = useState<ImportantNotePriority>('NORMAL');
    const [isPinned, setIsPinned] = useState(false);
    const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'PINNED' | 'PRIORITY'>('PINNED');

    const loadNotes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/notes');
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const raw = (data as any).error as string | undefined;
                if (raw && raw.includes('Important Notes table is missing')) {
                    throw new Error(
                        'Important Notes table is missing in Supabase. Run the migration `20260225_important_notes.sql` and then reload this page.'
                    );
                }
                throw new Error(raw || 'Failed to load notes');
            }
            const data = await res.json();
            setNotes(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load notes');
            setNotes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        setUploading(true);
        setError(null);
        const newUrls: string[] = [];
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const form = new FormData();
                form.append('file', file);
                const res = await fetch('/api/notes/upload', { method: 'POST', body: form });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Upload failed');
                newUrls.push(data.url);
            }
            setPendingUrls((prev) => [...prev, ...newUrls]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removePendingUrl = (url: string) => {
        setPendingUrls((prev) => prev.filter((u) => u !== url));
    };

    const handleSubmit = async () => {
        const text = body.trim();
        const imageUrls = [...pendingUrls];
        if (!title.trim() && !text && imageUrls.length === 0) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim() || 'Untitled note',
                    body: text || ' ',
                    image_urls: imageUrls,
                    priority,
                    is_pinned: isPinned,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save note');
            setNotes((prev) => [data, ...prev]);
            setTitle('');
            setBody('');
            setPendingUrls([]);
            setPriority('NORMAL');
            setIsPinned(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save note');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async (id: string) => {
        const text = editBody.trim();
        const t = editTitle.trim();
        if (!t && !text) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`/api/notes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: t || 'Untitled note', body: text }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update note');
            setNotes((prev) => prev.map((n) => (n.id === id ? data : n)));
            setEditingId(null);
            setEditTitle('');
            setEditBody('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update note');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this note?')) return;
        setError(null);
        try {
            const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to delete');
            }
            setNotes((prev) => prev.filter((n) => n.id !== id));
            if (editingId === id) {
                setEditingId(null);
                setEditBody('');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete note');
        }
    };

    const startEdit = (note: ImportantNote) => {
        setEditingId(note.id);
        setEditTitle(note.title);
        setEditBody(note.body);
    };

    const sortedNotes = useMemo(() => {
        const arr = [...notes];
        arr.sort((a, b) => {
            if (sortBy === 'PINNED') {
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (sortBy === 'PRIORITY') {
                const order: ImportantNotePriority[] = ['HIGH', 'NORMAL', 'LOW'];
                const pa = order.indexOf(a.priority ?? 'NORMAL');
                const pb = order.indexOf(b.priority ?? 'NORMAL');
                if (pa !== pb) return pa - pb;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (sortBy === 'OLDEST') {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        return arr;
    }, [notes, sortBy]);

    const renderPriorityBadge = (p: ImportantNotePriority) => {
        if (p === 'HIGH') {
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100">High</span>;
        }
        if (p === 'LOW') {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-100">
                    Low
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                Normal
            </span>
        );
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-4 md:px-6 -mt-8 pt-8 space-y-6">
                <div className="border-b border-slate-200 pb-6">
                    <Skeleton className="h-8 w-56 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-40 w-full rounded-xl" />
                <div className="space-y-4 pt-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="border-b border-slate-200 bg-white shadow-sm -mt-8 pt-8">
                <div className="max-w-3xl mx-auto px-4 md:px-6 pb-6">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                            <StickyNote className="w-5 h-5" />
                        </span>
                        Important Notes
                    </h1>
                    <p className="mt-2 text-slate-500 text-sm max-w-xl">
                        Shared notes for the team. Add text and photos (e.g. from your phone) so everyone stays in the loop.
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
                {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
                        {error}
                    </div>
                )}

                {/* New note form */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/80">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            New note
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Date is added automatically
                        </p>
                    </div>
                    <div className="p-4 space-y-4">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder='Headline e.g. "Delay on XYZ school run"'
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                        />
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="What’s on your mind? e.g. Delivery delay for School X, stock reminder…"
                            className="w-full min-h-[100px] rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-y"
                            rows={3}
                        />
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-slate-500">Priority</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as ImportantNotePriority)}
                                    className="text-xs rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                                >
                                    <option value="HIGH">High</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="LOW">Low</option>
                                </select>
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isPinned}
                                    onChange={(e) => setIsPinned(e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                />
                                <span>Pin to top</span>
                            </label>
                        </div>

                        {/* Photo upload: file input supports camera on mobile with capture */}
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium cursor-pointer transition-colors">
                                <Camera className="w-4 h-4" />
                                <span>Add photo</span>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    multiple
                                    capture="environment"
                                    className="sr-only"
                                    onChange={handleFileSelect}
                                    disabled={uploading}
                                />
                            </label>
                            <span className="text-xs text-slate-400">
                                {uploading ? 'Uploading…' : 'Camera or gallery'}
                            </span>
                        </div>
                        {pendingUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {pendingUrls.map((url) => (
                                    <div
                                        key={url}
                                        className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                                    >
                                        <img
                                            src={url}
                                            alt="Attachment"
                                            className="h-20 w-20 object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePendingUrl(url)}
                                            className="absolute top-1 right-1 p-1 rounded-full bg-slate-800/80 text-white hover:bg-slate-800"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={(body.trim() === '' && pendingUrls.length === 0) || submitting}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold shadow-sm transition-colors"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                Post note
                            </button>
                        </div>
                    </div>
                </section>

                {/* List of notes */}
                <section>
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Recent notes
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 uppercase tracking-wide">Sort</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="text-xs rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
                            >
                                <option value="PINNED">Pinned + newest</option>
                                <option value="NEWEST">Newest first</option>
                                <option value="OLDEST">Oldest first</option>
                                <option value="PRIORITY">Priority</option>
                            </select>
                        </div>
                    </div>
                    {sortedNotes.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-slate-500 text-sm">
                            No notes yet. Post one above to get started.
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {sortedNotes.map((note) => (
                                <li
                                    key={note.id}
                                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                                >
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                    <span className="text-slate-600 text-xs">
                                                        {formatNoteDate(note.created_at)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {renderPriorityBadge(note.priority ?? 'NORMAL')}
                                                    {note.is_pinned && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                                                            Pinned
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {editingId === note.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdate(note.id)}
                                                            disabled={submitting}
                                                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                                                            title="Save"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                setEditBody('');
                                                            }}
                                                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEdit(note)}
                                                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(note.id)}
                                                            className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {editingId === note.id ? (
                                            <>
                                                <input
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                                    placeholder="Headline"
                                                    autoFocus
                                                />
                                                <textarea
                                                    value={editBody}
                                                    onChange={(e) => setEditBody(e.target.value)}
                                                    className="mt-2 w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-y"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="mt-2 text-sm font-semibold text-slate-900">
                                                    {note.title || 'Untitled note'}
                                                </h3>
                                                <p className="mt-1 text-slate-800 text-sm whitespace-pre-wrap">
                                                    {note.body || '(No details)'}
                                                </p>
                                            </>
                                        )}
                                        {note.image_urls?.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {note.image_urls.map((url) => (
                                                    <a
                                                        key={url}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="rounded-lg overflow-hidden border border-slate-200 hover:opacity-90"
                                                    >
                                                        <img
                                                            src={url}
                                                            alt="Note attachment"
                                                            className="h-24 w-24 object-cover"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
