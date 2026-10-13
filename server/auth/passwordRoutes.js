const { Router } = require("express");
const { randomBytes, createHash } = require("node:crypto");
const { rateLimit } = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const requireAuth = require("./middleware");

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 12 &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

function createPasswordRouter({ users, sendPasswordResetEmail, frontendUrl }) {
  const router = Router();

  function limiter(limit) {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        message: "Túl sok próbálkozás. Próbáld újra később.",
      },
    });
  }

  router.post(
    "/change-password",
    requireAuth,
    limiter(5),
    async (req, res, next) => {
      const { currentPassword, newPassword } = req.body ?? {};

      if (
        typeof currentPassword !== "string" ||
        Buffer.byteLength(currentPassword, "utf8") > 72 ||
        !validPassword(newPassword)
      ) {
        return res.status(400).json({
          message:
            "Érvénytelen jelszóadatok. Az új jelszó legalább 12 karakter és legfeljebb 72 bájt legyen.",
        });
      }

      try {
        const storedHash = await users.findPasswordById(req.user.id);

        if (
          !storedHash ||
          !(await bcrypt.compare(currentPassword, storedHash))
        ) {
          return res.status(400).json({
            message: "A jelenlegi jelszó hibás.",
          });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        const changed = await users.changePassword({
          userId: req.user.id,
          expectedPasswordHash: storedHash,
          passwordHash,
        });

        if (!changed) {
          return res.status(409).json({
            message: "A fiók időközben megváltozott. Jelentkezz be újra.",
          });
        }

        req.session.destroy((error) => {
          if (error) return next(error);

          res.clearCookie("connect.sid", {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });

          res.json({
            message: "A jelszó megváltozott. Jelentkezz be újra.",
          });
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post("/forgot-password", limiter(3), async (req, res, next) => {
    const { email } = req.body ?? {};

    if (
      typeof email !== "string" ||
      email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        message: "Érvénytelen e-mail-cím.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      const token = randomBytes(32).toString("hex");

      const url = new URL(frontendUrl);
      url.hash = `reset-password=${token}`;

      await users.createPasswordReset({
        email: cleanEmail,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        url: url.toString(),
      });

      res.json({
        message:
          "Ha az e-mail-címhez megerősített fiók tartozik, elküldjük a visszaállítási linket.",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/reset-password", limiter(10), async (req, res, next) => {
    const { token, newPassword } = req.body ?? {};

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/.test(token) ||
      !validPassword(newPassword)
    ) {
      return res.status(400).json({
        message:
          "Érvénytelen token vagy jelszó. A jelszó legalább 12 karakter és legfeljebb 72 bájt legyen.",
      });
    }

    try {
      const passwordHash = await bcrypt.hash(newPassword, 10);

      const changed = await users.resetPassword({
        tokenHash: hashToken(token),
        passwordHash,
      });

      if (!changed) {
        return res.status(400).json({
          message: "A link lejárt, már felhasználták vagy érvénytelen.",
        });
      }

      res.json({
        message:
          "A jelszó visszaállítása sikeres. Jelentkezz be az új jelszóval.",
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createPasswordRouter;
