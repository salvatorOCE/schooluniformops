import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ImportantNote, ImportantNotePriority } from '@/lib/types';

const TABLE = 'important_notes';

export async function PATCH(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Note ID required' }, { status: 400 });
    }
    try {
        const body = await _req.json();
        const {
            title,
            body: noteBody,
            image_urls,
            priority,
            is_pinned,
        } = body as {
            title?: string;
            body?: string;
            image_urls?: string[];
            priority?: ImportantNotePriority;
            is_pinned?: boolean;
        };
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (typeof title === 'string') payload.title = title.trim();
        if (typeof noteBody === 'string') payload.body = noteBody;
        if (Array.isArray(image_urls)) payload.image_urls = image_urls;
        if (priority && ['LOW', 'NORMAL', 'HIGH'].includes(priority)) payload.priority = priority;
        if (typeof is_pinned === 'boolean') payload.is_pinned = is_pinned;

        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('Notes update error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        const note: ImportantNote = {
            id: data.id,
            title: data.title ?? '',
            body: data.body ?? '',
            priority: (data.priority as ImportantNotePriority) ?? 'NORMAL',
            is_pinned: data.is_pinned ?? false,
            created_at: data.created_at,
            updated_at: data.updated_at,
            image_urls: Array.isArray(data.image_urls) ? data.image_urls : [],
        };
        return NextResponse.json(note);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Note ID required' }, { status: 400 });
    }
    try {
        const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
        if (error) {
            console.error('Notes delete error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }
}
