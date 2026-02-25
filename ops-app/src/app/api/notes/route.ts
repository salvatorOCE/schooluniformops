import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ImportantNote, ImportantNotePriority } from '@/lib/types';

const TABLE = 'important_notes';

export async function GET() {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    try {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Notes fetch error:', error);
            const msg = error.message || '';
            if (msg.includes("Could not find the table 'public.important_notes'")) {
                return NextResponse.json(
                    {
                        error:
                            'Important Notes table is missing. Run the migration `20260225_important_notes.sql` in the Supabase project, then reload this page.',
                    },
                    { status: 500 }
                );
            }
            return NextResponse.json({ error: msg || 'Failed to fetch notes' }, { status: 500 });
        }
        const notes: ImportantNote[] = (data || []).map((row: any) => ({
            id: row.id,
            title: row.title ?? '',
            body: row.body ?? '',
            priority: (row.priority as ImportantNotePriority) ?? 'NORMAL',
            is_pinned: row.is_pinned ?? false,
            created_at: row.created_at,
            updated_at: row.updated_at,
            image_urls: Array.isArray(row.image_urls) ? row.image_urls : (row.image_urls ? JSON.parse(JSON.stringify(row.image_urls)) : []),
        }));
        return NextResponse.json(notes);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    try {
        const body = await req.json();
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
        const payload = {
            title: typeof title === 'string' ? title.trim() : '',
            body: typeof noteBody === 'string' ? noteBody : '',
            priority: priority && ['LOW', 'NORMAL', 'HIGH'].includes(priority) ? priority : 'NORMAL',
            is_pinned: is_pinned === true,
            image_urls: Array.isArray(image_urls) ? image_urls : [],
            updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .insert(payload)
            .select()
            .single();
        if (error) {
            console.error('Notes insert error:', error);
            const msg = error.message || '';
            if (msg.includes("Could not find the table 'public.important_notes'")) {
                return NextResponse.json(
                    {
                        error:
                            'Important Notes table is missing. Run the migration `20260225_important_notes.sql` in the Supabase project, then reload this page.',
                    },
                    { status: 500 }
                );
            }
            return NextResponse.json({ error: msg || 'Failed to create note' }, { status: 500 });
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
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }
}
