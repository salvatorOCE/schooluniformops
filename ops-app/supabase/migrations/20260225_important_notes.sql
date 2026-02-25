CREATE TABLE IF NOT EXISTS important_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_important_notes_created_at ON important_notes (created_at DESC);

COMMENT ON TABLE important_notes IS 'Team-visible notes with date and optional photo attachments';

-- Storage bucket for note photo attachments (public so image URLs work in the app)
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', true)
ON CONFLICT (id) DO NOTHING;
