const pool = require("./pool");

async function listActive({ userId, version }) {
  const { rows } = await pool.query(
    `SELECT s.sid, s.sess, s.expire
     FROM "session" AS s
     WHERE s.expire > NOW()
       AND s.sess->'passport'->'user'->>'id' = $1
       AND s.sess->'passport'->'user'->>'version' = $2
       AND NOT EXISTS (
         SELECT 1
         FROM revoked_sessions AS r
         WHERE r.sid = s.sid
       )
     ORDER BY s.expire DESC`,
    [String(userId), String(version)],
  );

  return rows;
}

async function revoke({ sid, userId, version }) {
  const { rows } = await pool.query(
    `WITH recorded AS (
       INSERT INTO revoked_sessions (sid)
       SELECT sid
       FROM "session"
       WHERE sid = $1
         AND sess->'passport'->'user'->>'id' = $2
         AND sess->'passport'->'user'->>'version' = $3
       ON CONFLICT (sid) DO UPDATE
         SET sid = EXCLUDED.sid
       RETURNING sid
     )
     DELETE FROM "session"
     WHERE sid IN (SELECT sid FROM recorded)
     RETURNING sid`,
    [sid, String(userId), String(version)],
  );

  return rows.length === 1;
}

async function isRevoked(sid) {
  const { rows } = await pool.query(
    "SELECT 1 FROM revoked_sessions WHERE sid = $1",
    [sid],
  );

  return rows.length > 0;
}

async function invalidateOthers({ userId, version }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET auth_version = auth_version + 1
     WHERE id = $1 AND auth_version = $2
     RETURNING auth_version`,
    [userId, version],
  );

  return rows[0]?.auth_version ?? null;
}

module.exports = {
  listActive,
  revoke,
  invalidateOthers,
  isRevoked,
};
