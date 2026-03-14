-- Proposals: store replies from schools; support delete (PDF cleanup is optional in app)
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS reply_text TEXT,
  ADD COLUMN IF NOT EXISTS reply_at TIMESTAMPTZ;

COMMENT ON COLUMN proposals.reply_text IS 'Reply or notes from the school about this proposal.';
COMMENT ON COLUMN proposals.reply_at IS 'When the reply was received or recorded.';
