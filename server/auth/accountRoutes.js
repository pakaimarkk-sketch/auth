const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const requireAuth = require("./middleware");

function createAccountRouter({ passport, users, accounts, frontendUrl }) {
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

  function validBinding(binding, user) {
    return (
      binding &&
      binding.userId === user.id &&
      binding.version === user.auth_version &&
      binding.expiresAt > Date.now()
    );
  }

  function finishGoogle(req, res, next, result) {
    delete req.session.googleDeletePending;

    req.session.save((error) => {
      if (error) return next(error);

      const url = new URL(frontendUrl);
      url.searchParams.set("deleteCheck", result);
      res.redirect(url.toString());
    });
  }

  router.post(
    "/account/delete/google",
    requireAuth,
    limiter,
    async (req, res, next) => {
      try {
        const passwordHash = await users.findPasswordById(req.user.id);

        if (passwordHash) {
          return res.status(400).json({
            message:
              "Ehhez a fiókhoz helyi jelszó tartozik. A törlést azzal erősítsd meg.",
          });
        }

        delete req.session.googleDeleteGrant;

        req.session.googleDeletePending = {
          userId: req.user.id,
          version: req.user.auth_version,
          expiresAt: Date.now() + 5 * 60 * 1000,
        };

        req.session.save((error) => {
          if (error) return next(error);

          res.json({
            startUrl: "/api/auth/google/delete/start",
          });
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/google/delete/start", requireAuth, (req, res, next) => {
    if (!validBinding(req.session.googleDeletePending, req.user)) {
      return finishGoogle(req, res, next, "failed");
    }

    passport.authenticate("google-delete", {
      scope: ["profile", "email"],
      prompt: "select_account",
    })(req, res, next);
  });

  router.get("/google/delete/callback", requireAuth, (req, res, next) => {
    passport.authenticate("google-delete", (error, profile) => {
      async function verify() {
        if (
          error ||
          !profile ||
          !validBinding(req.session.googleDeletePending, req.user)
        ) {
          delete req.session.googleDeleteGrant;
          return finishGoogle(req, res, next, "failed");
        }

        const matches = await accounts.matchesGoogleAccount({
          userId: req.user.id,
          providerUserId: profile.providerUserId,
        });

        if (!matches) {
          delete req.session.googleDeleteGrant;
          return finishGoogle(req, res, next, "failed");
        }

        req.session.googleDeleteGrant = {
          userId: req.user.id,
          version: req.user.auth_version,
          googleId: profile.providerUserId,
          expiresAt: Date.now() + 5 * 60 * 1000,
        };

        finishGoogle(req, res, next, "success");
      }

      verify().catch(next);
    })(req, res, next);
  });

  router.post(
    "/account/delete",
    requireAuth,
    limiter,
    async (req, res, next) => {
      const { password, confirmation } = req.body ?? {};

      if (confirmation !== "TÖRLÉS") {
        return res.status(400).json({
          message: "A megerősítéshez írd be: TÖRLÉS",
        });
      }

      try {
        const storedHash = await users.findPasswordById(req.user.id);
        let googleId = null;

        if (storedHash) {
          if (
            typeof password !== "string" ||
            password.length === 0 ||
            Buffer.byteLength(password, "utf8") > 72 ||
            !(await bcrypt.compare(password, storedHash))
          ) {
            return res.status(400).json({
              message: "A jelenlegi jelszó hibás.",
            });
          }
        } else {
          const grant = req.session.googleDeleteGrant;

          if (!validBinding(grant, req.user)) {
            return res.status(403).json({
              message:
                "A törlés előtt kattints a Google-fiók ellenőrzése gombra, és válaszd a fiókodhoz kapcsolt Google-fiókot.",
            });
          }

          googleId = grant.googleId;
        }

        const deleted = await accounts.deleteAccount({
          userId: req.user.id,
          version: req.user.auth_version,
          expectedPasswordHash: storedHash,
          googleId,
        });

        if (!deleted) {
          return res.status(409).json({
            message:
              "A fiók időközben megváltozott. Kezdd újra az ellenőrzést.",
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
            message: "A fiók törlése sikeres.",
          });
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

module.exports = createAccountRouter;
