BEGIN;

CREATE TABLE users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password TEXT,
  email VARCHAR(254),
  email_verified_at TIMESTAMPTZ,
  auth_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_key UNIQUE (email)
);

CREATE TABLE email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX email_verification_tokens_user_id_idx
  ON email_verification_tokens(user_id);

CREATE TABLE password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  auth_version INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX password_reset_tokens_user_id_idx
  ON password_reset_tokens(user_id);

CREATE TABLE external_accounts (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  user_id INTEGER NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  PRIMARY KEY (provider, provider_user_id),
  UNIQUE (user_id, provider)
);

CREATE TABLE "session" (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX session_expire_idx
  ON "session" (expire);

CREATE TABLE revoked_sessions (
  sid VARCHAR PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;