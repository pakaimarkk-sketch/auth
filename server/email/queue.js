const pool = require("../db/pool");
const { encryptPayload } = require("./payloadCrypto");

async function enqueue(type, data, lifetimeMinutes) {
  const payload = encryptPayload(data);

  const result = await pool.query(
    `INSERT INTO email_jobs
       (user_id, type, payload, expires_at)
     SELECT id, $1, $2, NOW() + ($3 * INTERVAL '1 minute')
     FROM users
     WHERE email = $4`,
    [type, payload, lifetimeMinutes, data.to],
  );

  if (result.rowCount !== 1) {
    throw new Error("A levélhez tartozó fiók már nem található.");
  }
}

module.exports = {
  sendVerificationEmail: (data) => enqueue("verification", data, 55),

  sendPasswordResetEmail: (data) => enqueue("password-reset", data, 25),
};
