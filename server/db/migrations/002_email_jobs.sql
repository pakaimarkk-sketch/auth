CREATE TABLE email_jobs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL
    CHECK (type IN ('verification', 'password-reset')),
  payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error_code VARCHAR(100)
);

CREATE INDEX email_jobs_pending_idx
  ON email_jobs (available_at, id)
  WHERE status = 'pending';