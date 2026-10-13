const { Router } = require("express");
const bcrypt = require("bcryptjs");
const requireAuth = require("./middleware");
const createAuthRateLimiters = require("./rateLimiters");

function createAuthRouter({ passport, users, sessions }) {
  const router = Router();
  const { loginLimiter, signupLimiter } = createAuthRateLimiters();

  router.post("/sign-up", signupLimiter, async (req, res, next) => {
    const { username, password, email } = req.body ?? {};

    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "A felhasználónév és a jelszó megadása kötelező.",
      });
    }

    const cleanUsername = username.trim();

    if (cleanUsername.includes("@")) {
      return res.status(400).json({
        message: "A felhasználónév nem tartalmazhat @ karaktert.",
      });
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      return res.status(400).json({
        message: "A felhasználónév 3–50 karakter hosszú lehet.",
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        message: "A jelszó legalább 12 karakter hosszú legyen.",
      });
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        message: "A jelszó legfeljebb 72 bájt hosszú lehet.",
      });
    }

    if (typeof email !== "string") {
      return res.status(400).json({
        message: "Az e-mail-cím megadása kötelező.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        message: "Érvénytelen e-mail-cím.",
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      await users.create({
        username: cleanUsername,
        passwordHash: hashedPassword,
        email: cleanEmail,
      });

      res.status(201).json({ message: "Sikeres regisztráció" });
    } catch (error) {
      if (error.code === "USERNAME_TAKEN") {
        return res.status(409).json({
          message: "Ez a felhasználónév már foglalt.",
        });
      }

      if (error.code === "EMAIL_TAKEN") {
        return res.status(409).json({
          message: "Ez az e-mail-cím már használatban van.",
        });
      }

      next(error);
    }
  });

  router.post("/log-in", loginLimiter, (req, res, next) => {
    const { identifier, password } = req.body ?? {};

    if (typeof identifier !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Az azonosító és a jelszó megadása kötelező.",
      });
    }

    const cleanIdentifier = identifier.trim();
    const isEmail = cleanIdentifier.includes("@");

    const validIdentifier = isEmail
      ? cleanIdentifier.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier)
      : cleanIdentifier.length >= 3 && cleanIdentifier.length <= 50;

    if (
      !validIdentifier ||
      password.length === 0 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Érvénytelen bejelentkezési adatok.",
      });
    }

    req.body.identifier = cleanIdentifier;

    passport.authenticate("local", (error, user) => {
      if (error) return next(error);

      if (!user) {
        return res.status(401).json({
          message: "Hibás azonosító vagy jelszó.",
        });
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

          res.json({
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              emailVerified: Boolean(user.email_verified_at),
              hasPassword: user.has_password,
            },
          });
        });
      });
    })(req, res, next);
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      emailVerified: Boolean(req.user.email_verified_at),
      hasPassword: req.user.has_password,
    });
  });

  router.post("/log-out", async (req, res, next) => {
    try {
      if (req.isAuthenticated()) {
        await sessions.revoke({
          sid: req.sessionID,
          userId: req.user.id,
          version: req.user.auth_version,
        });
      }

      req.logout((error) => {
        if (error) return next(error);

        req.session.destroy((error) => {
          if (error) return next(error);

          res.clearCookie("connect.sid", {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });

          res.json({ message: "Sikeres kijelentkezés" });
        });
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createAuthRouter;
