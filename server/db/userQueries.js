const pool = require("./pool");
const enqueuePasswordNotification = require("./passwordNotification");
const { encryptPayload } = require("../email/payloadCrypto");

async function findByUsername(username) {
  const { rows } = await pool.query(
    `SELECT id, username, password, email,
        email_verified_at, auth_version,
        password IS NOT NULL AS has_password
 FROM users
 WHERE username = $1`,
    [username],
  );

  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, username, email,
        email_verified_at, auth_version,
        password IS NOT NULL AS has_password
 FROM users
 WHERE id = $1`,
    [id],
  );

  return rows[0] ?? null;
}

async function findByIdentifier(identifier) {
  const isEmail = identifier.includes("@");

  const query = isEmail
    ? `SELECT id, username, password, email,
              email_verified_at, auth_version,
              password IS NOT NULL AS has_password
       FROM users WHERE email = $1`
    : `SELECT id, username, password, email,
              email_verified_at, auth_version,
              password IS NOT NULL AS has_password
       FROM users WHERE username = $1`;

  const value = isEmail ? identifier.toLowerCase() : identifier;

  const { rows } = await pool.query(query, [value]);

  return rows[0] ?? null;
}

async function findPasswordById(id) {
  const { rows } = await pool.query(
    "SELECT password FROM users WHERE id = $1",
    [id],
  );

  return rows[0]?.password ?? null;
}

async function updatePasswordAndNotify(query, values) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(query, values);
    const user = rows[0];

    if (!user) {
      await client.query("COMMIT");
      return false;
    }

    await enqueuePasswordNotification(client, user);

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function changePassword({ userId, expectedPasswordHash, passwordHash }) {
  return updatePasswordAndNotify(
    `UPDATE users
     SET password = $1,
         auth_version = auth_version + 1
     WHERE id = $2 AND password = $3
     RETURNING id, email, email_verified_at`,
    [passwordHash, userId, expectedPasswordHash],
  );
}

async function createPasswordReset({ email, tokenHash, expiresAt, url }) {
  return runTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, email, auth_version
       FROM users
       WHERE email = $1
         AND email_verified_at IS NOT NULL
       FOR UPDATE`,
      [email],
    );

    const user = rows[0];

    if (!user) {
      return false;
    }

    await client.query(
      `INSERT INTO password_reset_tokens
         (token_hash, user_id, auth_version, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tokenHash, user.id, user.auth_version, expiresAt],
    );

    const payload = encryptPayload({
      to: user.email,
      url,
    });

    await client.query(
      `INSERT INTO email_jobs
         (user_id, type, payload, expires_at)
       VALUES ($1, 'password-reset', $2, $3)`,
      [user.id, payload, new Date(expiresAt.getTime() - 5 * 60 * 1000)],
    );

    return true;
  });
}

async function resetPassword({ tokenHash, passwordHash }) {
  return updatePasswordAndNotify(
    `WITH consumed AS (
       DELETE FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > NOW()
       RETURNING user_id, auth_version
     )
     UPDATE users AS u
     SET password = $2,
         auth_version = u.auth_version + 1
     FROM consumed AS c
     WHERE u.id = c.user_id
       AND u.auth_version = c.auth_version
     RETURNING u.id, u.email, u.email_verified_at`,
    [tokenHash, passwordHash],
  );
}

async function create({ username, passwordHash, email }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, password, email)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, email_verified_at`,
      [username, passwordHash, email],
    );

    return rows[0];
  } catch (error) {
    if (error.code === "23505") {
      const codes = {
        users_username_key: "USERNAME_TAKEN",
        users_email_key: "EMAIL_TAKEN",
      };

      const code = codes[error.constraint];

      if (code) {
        const conflict = new Error(code);
        conflict.code = code;
        throw conflict;
      }
    }

    throw error;
  }
}

async function saveEmailVerificationToken({
  userId,
  email,
  tokenHash,
  expiresAt,
  url,
}) {
  return runTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, email, email_verified_at
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    const user = rows[0];

    if (!user || user.email !== email || user.email_verified_at) {
      return false;
    }

    await client.query(
      `INSERT INTO email_verification_tokens
         (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt],
    );

    const payload = encryptPayload({
      to: user.email,
      url,
    });

    await client.query(
      `INSERT INTO email_jobs
         (user_id, type, payload, expires_at)
       VALUES ($1, 'verification', $2, $3)`,
      [user.id, payload, new Date(expiresAt.getTime() - 5 * 60 * 1000)],
    );

    return true;
  });
}

async function verifyEmailToken(tokenHash) {
  const { rows } = await pool.query(
    `WITH consumed AS (
       DELETE FROM email_verification_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()
       RETURNING user_id
     )
     UPDATE users
     SET email_verified_at = COALESCE(email_verified_at, NOW())
     WHERE id IN (SELECT user_id FROM consumed)
     RETURNING id, username, email, email_verified_at`,
    [tokenHash],
  );

  return rows[0] ?? null;
}

async function runTransaction(action) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await action(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  findByUsername,
  findById,
  create,
  saveEmailVerificationToken,
  verifyEmailToken,
  findPasswordById,
  changePassword,
  createPasswordReset,
  resetPassword,
  findByIdentifier,
};
