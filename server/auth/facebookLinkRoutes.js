const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const requireAuth = require("./middleware");

function createFacebookLinkRouter({
  passport,
  users,
  externalAccounts,
  frontendUrl,
}) {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message: "Túl sok próbálkozás. Próbáld újra később.",
    },
  });

  function finish(req, res, next, result) {
    delete req.session.facebookLink;

    req.session.save((error) => {
      if (error) return next(error);

      const url = new URL(frontendUrl);
      url.searchParams.set("facebookLink", result);
      res.redirect(url.toString());
    });
  }

  router.post(
    "/facebook/link",
    requireAuth,
    limiter,
    async (req, res, next) => {
      const { password } = req.body ?? {};

      if (!req.user.email_verified_at) {
        return res.status(400).json({
          message: "Előbb erősítsd meg a helyi e-mail-címedet.",
        });
      }

      if (
        typeof password !== "string" ||
        password.length === 0 ||
        Buffer.byteLength(password, "utf8") > 72
      ) {
        return res.status(400).json({
          message: "Add meg a jelenlegi jelszavadat.",
        });
      }

      try {
        const storedHash = await users.findPasswordById(req.user.id);

        if (!storedHash || !(await bcrypt.compare(password, storedHash))) {
          return res.status(400).json({
            message: "A jelenlegi jelszó hibás.",
          });
        }

        req.session.facebookLink = {
          userId: req.user.id,
          version: req.user.auth_version,
          expiresAt: Date.now() + 5 * 60 * 1000,
        };

        req.session.save((error) => {
          if (error) return next(error);

          res.json({
            startUrl: "/api/auth/facebook/link/start",
          });
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/facebook/link/start", requireAuth, (req, res, next) => {
    const pending = req.session.facebookLink;

    if (
      !pending ||
      pending.userId !== req.user.id ||
      pending.version !== req.user.auth_version ||
      pending.expiresAt <= Date.now()
    ) {
      return finish(req, res, next, "failed");
    }

    passport.authenticate("facebook-link", {
      scope: ["email"],
    })(req, res, next);
  });

  router.get("/facebook/link/callback", requireAuth, (req, res, next) => {
    passport.authenticate("facebook-link", (error, profile) => {
      if (error || !profile) {
        return finish(req, res, next, "failed");
      }

      const pending = req.session.facebookLink;

      if (
        !pending ||
        pending.userId !== req.user.id ||
        pending.version !== req.user.auth_version ||
        pending.expiresAt <= Date.now()
      ) {
        return finish(req, res, next, "failed");
      }

      async function link() {
        try {
          await externalAccounts.linkFacebookAccount({
            userId: req.user.id,
            version: pending.version,
            providerUserId: profile.providerUserId,
            email: profile.email,
          });

          finish(req, res, next, "success");
        } catch (error) {
          if (error.code !== "LINK_REJECTED") {
            console.error("Facebook-összekapcsolási hiba:", error.message);
          }

          finish(req, res, next, "failed");
        }
      }

      link().catch(next);
    })(req, res, next);
  });

  return router;
}

module.exports = createFacebookLinkRouter;
