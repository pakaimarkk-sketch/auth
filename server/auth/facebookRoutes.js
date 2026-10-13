const { Router } = require("express");

function createFacebookRouter({ passport, frontendUrl }) {
  const router = Router();

  function fail(res) {
    const url = new URL(frontendUrl);
    url.searchParams.set("authError", "facebook-login-failed");
    res.redirect(url.toString());
  }

  router.get(
    "/facebook",
    passport.authenticate("facebook", {
      scope: ["email"],
    }),
  );

  router.get("/facebook/callback", (req, res, next) => {
    passport.authenticate("facebook", (error, user) => {
      if (error) {
        console.error("Facebook-belépési hiba:", error.message);
        return fail(res);
      }

      if (!user) {
        return fail(res);
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

module.exports = createFacebookRouter;
