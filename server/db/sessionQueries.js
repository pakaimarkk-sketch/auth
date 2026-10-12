const pool = require("./pool");

async function listActive({ userId, version }) {
  const { rows } = await pool.query(
    `SELECT sid, sess, expire
     FROM "session"
     WHERE expire > NOW()
       AND sess->'passport'->'user'->>'id' = $1
       AND sess->'passport'->'user'->>'version' = $2
     ORDER BY expire DESC`,
    [String(userId), String(version)],
  );

  return rows;
}

async function revoke({ sid, userId, version }) {
  const result = await pool.query(
    `DELETE FROM "session"
     WHERE sid = $1
       AND sess->'passport'->'user'->>'id' = $2
       AND sess->'passport'->'user'->>'version' = $3`,
    [sid, String(userId), String(version)],
  );

  return result.rowCount === 1;
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
};
