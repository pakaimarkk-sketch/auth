const {
  randomBytes,
  createCipheriv,
  createDecipheriv,
} = require("node:crypto");

const keyHex = process.env.EMAIL_QUEUE_KEY;

if (!/^[a-f0-9]{64}$/i.test(keyHex ?? "")) {
  throw new Error("Érvénytelen EMAIL_QUEUE_KEY.");
}

const key = Buffer.from(keyHex, "hex");

function encryptPayload(data) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);

  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

function decryptPayload(value) {
  const buffer = Buffer.from(value, "base64");

  if (buffer.length < 28) {
    throw new Error("Érvénytelen titkosított levéladat.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    buffer.subarray(0, 12),
    { authTagLength: 16 },
  );

  decipher.setAuthTag(buffer.subarray(12, 28));

  const decrypted = Buffer.concat([
    decipher.update(buffer.subarray(28)),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

module.exports = { encryptPayload, decryptPayload };
