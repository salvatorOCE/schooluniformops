-- School ops login: one hashed password per school for the school-facing ops portal.
-- Login API looks up by password hash and sets session to school:CODE.
CREATE TABLE IF NOT EXISTS school_ops_credentials (
    school_id UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE school_ops_credentials IS 'Hashed passwords for school ops portal; one row per school.';
