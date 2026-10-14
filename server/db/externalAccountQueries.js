const { randomUUID } = require("node:crypto");
const pool = require("./pool");

async function findGoogleUser(providerUserId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.email,
            u.email_verified_at, u.auth_version
     FROM external_accounts AS a
     JOIN users AS u ON u.id = a.user_id
     WHERE a.provider = 'google'
       AND a.provider_user_id = $1`,
    [providerUserId],
  );

  return rows[0] ?? null;
}

async function findOrCreateGoogleUser({ providerUserId, email }) {
  const existing = await findGoogleUser(providerUserId);

  if (existing) return existing;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO users
         (username, password, email, email_verified_at)
       VALUES ($1, NULL, $2, NOW())
       RETURNING id, username, email,
                 email_verified_at, auth_version`,
      [`google_${randomUUID()}`, email],
    );

    const user = rows[0];

    await client.query(
      `INSERT INTO external_accounts
         (provider, provider_user_id, user_id)
       VALUES ('google', $1, $2)`,
      [providerUserId, user.id],
    );

    await client.query("COMMIT");

    return user;
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const existing = await findGoogleUser(providerUserId);

      if (existing) return existing;

      if (error.constraint === "users_email_key") {
        const conflict = new Error("Existing account requires linking");
        conflict.code = "ACCOUNT_LINK_REQUIRED";
        throw conflict;
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function linkGoogleAccount({ userId, version, providerUserId, email }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, email, auth_version
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    const user = rows[0];

    if (!user || user.auth_version !== version || user.email !== email) {
      const error = new Error("Account changed or email mismatch");
      error.code = "LINK_REJECTED";
      throw error;
    }

    const existing = await client.query(
      `SELECT provider_user_id, user_id
       FROM external_accounts
       WHERE provider = 'google'
         AND (provider_user_id = $1 OR user_id = $2)`,
      [providerUserId, userId],
    );

    if (existing.rows.length > 0) {
      const sameLink =
        existing.rows.length === 1 &&
        existing.rows[0].user_id === userId &&
        existing.rows[0].provider_user_id === providerUserId;

      if (!sameLink) {
        const error = new Error("Google account already linked");
        error.code = "LINK_REJECTED";
        throw error;
      }
    } else {
      await client.query(
        `INSERT INTO external_accounts
           (provider, provider_user_id, user_id)
         VALUES ('google', $1, $2)`,
        [providerUserId, userId],
      );
    }

    await client.query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, NOW())
       WHERE id = $1`,
      [userId],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const conflict = new Error("Google account already linked");
      conflict.code = "LINK_REJECTED";
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function findFacebookUser(providerUserId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.email,
            u.email_verified_at, u.auth_version,
            u.password IS NOT NULL AS has_password
     FROM external_accounts AS a
     JOIN users AS u ON u.id = a.user_id
     WHERE a.provider = 'facebook'
       AND a.provider_user_id = $1`,
    [providerUserId],
  );

  return rows[0] ?? null;
}

async function linkFacebookAccount({ userId, version, providerUserId, email }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, email, email_verified_at, auth_version
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    const user = rows[0];

    if (
      !user ||
      user.auth_version !== version ||
      !user.email_verified_at ||
      user.email !== email
    ) {
      const error = new Error("Account changed or email mismatch");
      error.code = "LINK_REJECTED";
      throw error;
    }

    const existing = await client.query(
      `SELECT provider_user_id, user_id
       FROM external_accounts
       WHERE provider = 'facebook'
         AND (provider_user_id = $1 OR user_id = $2)`,
      [providerUserId, userId],
    );

    if (existing.rows.length > 0) {
      const sameLink =
        existing.rows.length === 1 &&
        existing.rows[0].user_id === userId &&
        existing.rows[0].provider_user_id === providerUserId;

      if (!sameLink) {
        const error = new Error("Facebook account already linked");
        error.code = "LINK_REJECTED";
        throw error;
      }
    } else {
      await client.query(
        `INSERT INTO external_accounts
           (provider, provider_user_id, user_id)
         VALUES ('facebook', $1, $2)`,
        [providerUserId, userId],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const conflict = new Error("Facebook account already linked");
      conflict.code = "LINK_REJECTED";
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function findOrCreateFacebookUser({ providerUserId, email }) {
  const existing = await findFacebookUser(providerUserId);

  if (existing) return existing;

  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    const error = new Error("Facebook email unavailable");
    error.code = "FACEBOOK_EMAIL_REQUIRED";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO users
         (username, password, email, email_verified_at)
       VALUES ($1, NULL, $2, NULL)
       RETURNING id, username, email,
                 email_verified_at, auth_version,
                 password IS NOT NULL AS has_password`,
      [`facebook_${randomUUID()}`, email],
    );

    const user = rows[0];

    await client.query(
      `INSERT INTO external_accounts
         (provider, provider_user_id, user_id)
       VALUES ('facebook', $1, $2)`,
      [providerUserId, user.id],
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const existing = await findFacebookUser(providerUserId);

      if (existing) return existing;

      if (error.constraint === "users_email_key") {
        const conflict = new Error("Existing account requires linking");
        conflict.code = "ACCOUNT_LINK_REQUIRED";
        throw conflict;
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  findOrCreateGoogleUser,
  linkGoogleAccount,
  findFacebookUser,
  linkFacebookAccount,
  findOrCreateFacebookUser,
};
