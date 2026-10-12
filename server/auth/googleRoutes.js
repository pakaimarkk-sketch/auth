const { Router } = require("express");

function createGoogleRouter({ passport, frontendUrl }) {
  const router = Router();

  function redirectError(res, code) {
    const url = new URL(frontendUrl);
    url.searchParams.set("authError", code);
    return res.redirect(url.toString());
  }

  router.get(
    "/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    }),
  );

  router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", (error, user) => {
      if (error) {
        if (error.code === "ACCOUNT_LINK_REQUIRED") {
          return redirectError(res, "account-link-required");
        }

        console.error("Google-belépési hiba:", error.message);
        return redirectError(res, "google-login-failed");
      }

      if (!user) {
        return redirectError(res, "google-login-failed");
      }

      req.logIn(user, (error) => {
        if (error) return next(error);

        req.session.authMeta = {
          loggedInAt: new Date().toISOString(),
          browser: (req.get("user-agent") || "Ismeretlen böngésző").slice(
            0,
            500,
          ),
        };

        req.session.save((error) => {
          if (error) return next(error);

          res.redirect(frontendUrl);
        });
      });
    })(req, res, next);
  });

  return router;
}

module.exports = createGoogleRouter;
