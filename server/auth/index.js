const { Passport } = require("passport");
const { Router } = require("express");
const { csrfSync } = require("csrf-sync");

const configurePassport = require("./passport");
const createAuthRouter = require("./routes");
const requireAuth = require("./middleware");

function createAuth({ users }) {
  for (const name of ["findByUsername", "findById", "create"]) {
    if (typeof users?.[name] !== "function") {
      throw new Error(`Hiányzó auth adatkezelő függvény: ${name}`);
    }
  }

  const passport = new Passport();

  configurePassport(passport, users);

  const { generateToken, csrfSynchronisedProtection } = csrfSync();

  const router = Router();

  router.get("/csrf-token", (req, res, next) => {
    const token = generateToken(req);

    req.session.save((error) => {
      if (error) return next(error);

      res.set("Cache-Control", "no-store");
      res.json({ token });
    });
  });

  router.use(csrfSynchronisedProtection);

  router.use(
    createAuthRouter({
      passport,
      users,
    }),
  );

  return {
    initialize: passport.initialize(),
    session: passport.session(),
    router,
    requireAuth,
    csrfProtection: csrfSynchronisedProtection,
  };
}

module.exports = createAuth;
