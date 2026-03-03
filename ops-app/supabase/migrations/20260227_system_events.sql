-- System-wide event log for orders, fix-ups, batches, etc.

CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    prev_state JSONB,
    new_state JSONB,
    actor_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_system_events_entity_id ON system_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_system_events_entity_type ON system_events(entity_type);
CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp DESC);

