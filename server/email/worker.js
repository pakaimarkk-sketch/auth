require("dotenv").config();

const { setTimeout: delay } = require("node:timers/promises");
const pool = require("../db/pool");
const createMailer = require("./mailer");
const { decryptPayload } = require("./payloadCrypto");

const mailer = createMailer({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
  from: process.env.MAIL_FROM,
});

let stopping = false;

process.on("SIGINT", () => {
  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

async function processOne() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT *
       FROM email_jobs
       WHERE status = 'pending'
         AND available_at <= NOW()
       ORDER BY available_at, id
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
    );

    const job = rows[0];

    if (!job) {
      await client.query("COMMIT");
      return false;
    }

    if (new Date(job.expires_at).getTime() <= Date.now()) {
      await client.query(
        `UPDATE email_jobs
         SET status = 'failed',
             payload = NULL,
             last_error_code = 'EXPIRED'
         WHERE id = $1`,
        [job.id],
      );

      await client.query("COMMIT");
      return true;
    }

    let failure = null;

    try {
      const data = decryptPayload(job.payload);

      if (job.type === "verification") {
        await mailer.sendVerificationEmail(data);
      } else if (job.type === "password-reset") {
        await mailer.sendPasswordResetEmail(data);
      } else if (job.type === "password-changed") {
        await mailer.sendPasswordChangedEmail(data);
      } else {
        throw new Error("Ismeretlen levéltípus.");
      }
    } catch (error) {
      failure = error;
    }

    if (!failure) {
      await client.query("DELETE FROM email_jobs WHERE id = $1", [job.id]);
    } else {
      const attempts = job.attempts + 1;

      const permanentFailure =
        failure.code === "EAUTH" || Number(failure.responseCode) >= 500;

      const failed = permanentFailure || attempts >= 5;

      const retrySeconds = Math.min(30 * 2 ** (attempts - 1), 300);

      const errorCode = String(
        failure.code || failure.name || "SEND_FAILED",
      ).slice(0, 100);

      await client.query(
        `UPDATE email_jobs
         SET attempts = $2,
             status = $3,
             available_at = NOW() + ($4 * INTERVAL '1 second'),
             last_error_code = $5,
             payload = CASE WHEN $6 THEN NULL ELSE payload END
         WHERE id = $1`,
        [
          job.id,
          attempts,
          failed ? "failed" : "pending",
          retrySeconds,
          errorCode,
          failed,
        ],
      );

      console.error(
        `E-mail feladat ${job.id}: ${errorCode}; ` +
          (failed ? "végleg sikertelen" : "újrapróbálás később"),
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log("Az e-mail worker elindult.");

  try {
    while (!stopping) {
      const processed = await processOne();

      if (!processed) {
        await delay(2000);
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Workerhiba:", error.code || error.name);
  process.exitCode = 1;
});
