const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");
const requireAuth = require("./middleware");

function createFacebookDeleteRouter({
  passport,
  users,
  accounts,
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

  function validBinding(binding, user) {
    return (
      binding &&
      binding.userId === user.id &&
      binding.version === user.auth_version &&
      binding.expiresAt > Date.now()
    );
  }

  function finishFacebook(req, res, next, result) {
    delete req.session.facebookDeletePending;

    if (result !== "success") {
      delete req.session.facebookDeleteGrant;
    }

    req.session.save((error) => {
      if (error) return next(error);

      const url = new URL(frontendUrl);
      url.searchParams.set("facebookDeleteCheck", result);
      res.redirect(url.toString());
    });
  }

  router.post(
    "/account/delete/facebook",
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

        delete req.session.facebookDeleteGrant;

        req.session.facebookDeletePending = {
          userId: req.user.id,
          version: req.user.auth_version,
          expiresAt: Date.now() + 5 * 60 * 1000,
        };

        req.session.save((error) => {
          if (error) return next(error);

          res.json({
            startUrl: "/api/auth/facebook/delete/start",
          });
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/facebook/delete/start", requireAuth, (req, res, next) => {
    if (!validBinding(req.session.facebookDeletePending, req.user)) {
      return finishFacebook(req, res, next, "failed");
    }

    passport.authenticate("facebook-delete", {
      scope: ["email"],
      authType: "reauthenticate",
    })(req, res, next);
  });

  router.get("/facebook/delete/callback", requireAuth, (req, res, next) => {
    passport.authenticate("facebook-delete", (error, profile) => {
      async function verify() {
        if (
          error ||
          !profile ||
          !validBinding(req.session.facebookDeletePending, req.user)
        ) {
          return finishFacebook(req, res, next, "failed");
        }

        const matches = await accounts.matchesFacebookAccount({
          userId: req.user.id,
          providerUserId: profile.providerUserId,
        });

        if (!matches) {
          return finishFacebook(req, res, next, "failed");
        }

        req.session.facebookDeleteGrant = {
          userId: req.user.id,
          version: req.user.auth_version,
          facebookId: profile.providerUserId,
          expiresAt: Date.now() + 5 * 60 * 1000,
        };

        return finishFacebook(req, res, next, "success");
      }

      verify().catch(next);
    })(req, res, next);
  });

  return router;
}

module.exports = createFacebookDeleteRouter;
