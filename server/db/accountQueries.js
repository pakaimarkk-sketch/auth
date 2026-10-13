const pool = require("./pool");

async function matchesGoogleAccount({ userId, providerUserId }) {
  const { rows } = await pool.query(
    `SELECT 1
     FROM external_accounts
     WHERE user_id = $1
       AND provider = 'google'
       AND provider_user_id = $2`,
    [userId, providerUserId],
  );

  return rows.length === 1;
}

async function deleteAccount({
  userId,
  version,
  expectedPasswordHash,
  googleId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, password, auth_version
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    const user = rows[0];

    let allowed = Boolean(user && user.auth_version === version);

    if (allowed && user.password !== null) {
      allowed =
        typeof expectedPasswordHash === "string" &&
        user.password === expectedPasswordHash;
    } else if (allowed) {
      const linked = await client.query(
        `SELECT 1
         FROM external_accounts
         WHERE user_id = $1
           AND provider = 'google'
           AND provider_user_id = $2`,
        [userId, googleId ?? null],
      );

      allowed = linked.rows.length === 1;
    }

    if (!allowed) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      `DELETE FROM "session"
       WHERE sess->'passport'->'user'->>'id' = $1`,
      [String(userId)],
    );

    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  matchesGoogleAccount,
  deleteAccount,
};
