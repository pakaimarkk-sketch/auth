const { encryptPayload } = require("../email/payloadCrypto");

async function enqueuePasswordNotification(client, user) {
  if (!user.email || !user.email_verified_at) {
    return;
  }

  const payload = encryptPayload({
    to: user.email,
    changedAt: new Date().toISOString(),
  });

  await client.query(
    `INSERT INTO email_jobs
       (user_id, type, payload, expires_at)
     VALUES ($1, 'password-changed', $2, NOW() + INTERVAL '1 day')`,
    [user.id, payload],
  );
}

module.exports = enqueuePasswordNotification;
