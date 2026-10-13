require("dotenv").config();

const createMailer = require("./mailer");

async function main() {
  const mailer = createMailer({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.MAIL_FROM,
  });

  await mailer.verify();
  console.log("Az SMTP-kapcsolat és hitelesítés működik.");
}

main().catch((error) => {
  console.error("SMTP-ellenőrzési hiba:", error.code || error.name);
  process.exitCode = 1;
});
