const { Router } = require("express");
const bcrypt = require("bcryptjs");
const requireAuth = require("./middleware");
const createAuthRateLimiters = require("./rateLimiters");

function createAuthRouter({ passport, users }) {
  const router = Router();
  const { loginLimiter, signupLimiter } = createAuthRateLimiters();

  router.post("/sign-up", signupLimiter, async (req, res, next) => {
    const { username, password } = req.body ?? {};

    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "A felhasználónév és a jelszó megadása kötelező.",
      });
    }

    const cleanUsername = username.trim();

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

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      await users.create({
        username: cleanUsername,
        passwordHash: hashedPassword,
      });

      res.status(201).json({ message: "Sikeres regisztráció" });
    } catch (error) {
      if (error.code === "USERNAME_TAKEN") {
        return res.status(409).json({
          message: "Ez a felhasználónév már foglalt.",
        });
      }

      next(error);
    }
  });

  router.post("/log-in", loginLimiter, (req, res, next) => {
    const { username, password } = req.body ?? {};

    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "A felhasználónév és a jelszó megadása kötelező.",
      });
    }

    const cleanUsername = username.trim();

    if (
      cleanUsername.length < 3 ||
      cleanUsername.length > 50 ||
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Érvénytelen felhasználónév vagy jelszó.",
      });
    }

    req.body.username = cleanUsername;

    passport.authenticate("local", (error, user) => {
      if (error) return next(error);

      if (!user) {
        return res.status(401).json({
          message: "Hibás felhasználónév vagy jelszó",
        });
      }

      req.logIn(user, (error) => {
        if (error) return next(error);

        res.json({
          user: {
            id: user.id,
            username: user.username,
          },
        });
      });
    })(req, res, next);
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({
      id: req.user.id,
      username: req.user.username,
    });
  });

  router.post("/log-out", (req, res, next) => {
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
  });

  return router;
}

module.exports = createAuthRouter;
