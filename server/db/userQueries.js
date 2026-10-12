const pool = require("./pool");

async function findByUsername(username) {
  const { rows } = await pool.query(
    `SELECT id, username, password, email, email_verified_at, auth_version
 FROM users WHERE username = $1`,
    [username],
  );

  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await pool.query(
    "SELECT id, username, email, email_verified_at, auth_version FROM users WHERE id = $1",
    [id],
  );

  return rows[0] ?? null;
}

async function findPasswordById(id) {
  const { rows } = await pool.query(
    "SELECT password FROM users WHERE id = $1",
    [id],
  );

  return rows[0]?.password ?? null;
}

async function changePassword({ userId, expectedPasswordHash, passwordHash }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET password = $1,
         auth_version = auth_version + 1
     WHERE id = $2 AND password = $3
     RETURNING id`,
    [passwordHash, userId, expectedPasswordHash],
  );

  return rows.length === 1;
}

async function createPasswordReset({ email, tokenHash, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO password_reset_tokens
       (token_hash, user_id, auth_version, expires_at)
     SELECT $1, id, auth_version, $2
     FROM users
     WHERE email = $3 AND email_verified_at IS NOT NULL
     RETURNING user_id`,
    [tokenHash, expiresAt, email],
  );

  return rows.length === 1;
}

async function resetPassword({ tokenHash, passwordHash }) {
  const { rows } = await pool.query(
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
     RETURNING u.id`,
    [tokenHash, passwordHash],
  );

  return rows.length === 1;
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

async function saveEmailVerificationToken({ userId, tokenHash, expiresAt }) {
  await pool.query(
    `INSERT INTO email_verification_tokens
       (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
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
};
