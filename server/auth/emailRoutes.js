const { Router } = require("express");
const { randomBytes, createHash } = require("node:crypto");
const { rateLimit } = require("express-rate-limit");
const requireAuth = require("./middleware");

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function createEmailRouter({ users, sendVerificationEmail, frontendUrl }) {
  const router = Router();

  const sendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message: "Túl sok megerősítési kérés. Próbáld újra később.",
    },
  });

  const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message: "Túl sok ellenőrzési kérés. Próbáld újra később.",
    },
  });

  router.post(
    "/request-email-verification",
    requireAuth,
    sendLimiter,
    async (req, res, next) => {
      try {
        if (!req.user.email) {
          return res.status(400).json({
            message: "Ehhez a fiókhoz még nincs e-mail-cím.",
          });
        }

        if (req.user.email_verified_at) {
          return res.json({
            message: "Az e-mail-cím már meg van erősítve.",
          });
        }

        const token = randomBytes(32).toString("hex");

        await users.saveEmailVerificationToken({
          userId: req.user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });

        const url = new URL(frontendUrl);
        url.hash = `verify-email=${token}`;

        await sendVerificationEmail({
          to: req.user.email,
          url: url.toString(),
        });

        res.json({
          message: "A megerősítési link elküldve.",
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post("/verify-email", verifyLimiter, async (req, res, next) => {
    const { token } = req.body ?? {};

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({
        message: "Érvénytelen megerősítési token.",
      });
    }

    try {
      const user = await users.verifyEmailToken(hashToken(token));

      if (!user) {
        return res.status(400).json({
          message: "A link lejárt, már felhasználták vagy érvénytelen.",
        });
      }

      res.json({
        message: "Az e-mail-cím megerősítése sikeres.",
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createEmailRouter;
