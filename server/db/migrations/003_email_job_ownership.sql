BEGIN;

DELETE FROM email_jobs
WHERE status = 'failed' AND payload IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM email_jobs) THEN
    RAISE EXCEPTION 'Az email_jobs még nem üres. Előbb rendezd a meglévő feladatokat.';
  END IF;
END
$$;

ALTER TABLE email_jobs
  ADD COLUMN user_id INTEGER NOT NULL
    REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX email_jobs_user_id_idx
  ON email_jobs(user_id);

ALTER TABLE email_jobs
  DROP CONSTRAINT email_jobs_type_check;

ALTER TABLE email_jobs
  ADD CONSTRAINT email_jobs_type_check
  CHECK (type IN (
    'verification',
    'password-reset',
    'password-changed'
  ));

COMMIT;