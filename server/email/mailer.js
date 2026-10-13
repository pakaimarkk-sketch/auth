const nodemailer = require("nodemailer");

function createMailer({ host, port, user, password, from }) {
  if (
    !host ||
    !Number.isInteger(port) ||
    ![465, 587].includes(port) ||
    !user ||
    !password ||
    !from
  ) {
    throw new Error("Hiányzó vagy érvénytelen SMTP-konfiguráció.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,

    auth: {
      user,
      pass: password,
    },

    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  async function send({ to, subject, text }) {
    const result = await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });

    if (!result.accepted?.length) {
      throw new Error("Az SMTP-szerver nem fogadta el a címzettet.");
    }
  }

  return {
    verify: () => transporter.verify(),

    sendVerificationEmail: ({ to, url }) =>
      send({
        to,
        subject: "E-mail-cím megerősítése",
        text: [
          "Az e-mail-címed megerősítéséhez nyisd meg ezt a linket:",
          "",
          url,
          "",
          "A link 1 óráig érvényes.",
          "Ha nem te kérted, hagyd figyelmen kívül ezt az üzenetet.",
        ].join("\n"),
      }),

    sendPasswordResetEmail: ({ to, url }) =>
      send({
        to,
        subject: "Jelszó beállítása vagy visszaállítása",
        text: [
          "Új helyi jelszó megadásához nyisd meg ezt a linket:",
          "",
          url,
          "",
          "A link 30 percig érvényes és egyszer használható.",
          "Ha nem te kérted, hagyd figyelmen kívül ezt az üzenetet.",
        ].join("\n"),
      }),
  };
}

module.exports = createMailer;
