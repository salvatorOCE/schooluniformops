-- Order notes for admin/school communication and reminders

CREATE TABLE IF NOT EXISTS order_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    author_role TEXT NOT NULL CHECK (author_role IN ('admin', 'school')),
    author_display TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_created_at ON order_notes(created_at DESC);

-- RLS: allow read for anon (used by client adapter for hasNotes badge)
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read order_notes" ON order_notes FOR SELECT USING (true);
