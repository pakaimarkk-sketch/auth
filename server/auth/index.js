const { Passport } = require("passport");
const { Router } = require("express");
const { csrfSync } = require("csrf-sync");

const configureGoogle = require("./google");
const createGoogleRouter = require("./googleRoutes");
const configurePassport = require("./passport");
const createAuthRouter = require("./routes");
const createEmailRouter = require("./emailRoutes");
const createSessionRouter = require("./sessionRoutes");
const requireAuth = require("./middleware");
const createPasswordRouter = require("./passwordRoutes");
const createGoogleLinkRouter = require("./googleLinkRoutes");
const createSessionGuard = require("./sessionGuard");
const createAccountRouter = require("./accountRoutes");

function createAuth({
  users,
  sendVerificationEmail,
  frontendUrl,
  sendPasswordResetEmail,
  sessions,
  google,
  externalAccounts,
  accounts,
}) {
  if (!google?.deleteCallbackUrl) {
    throw new Error("Hiányzó Google fióktörlési callback cím.");
  }

  for (const name of ["matchesGoogleAccount", "deleteAccount"]) {
    if (typeof accounts?.[name] !== "function") {
      throw new Error(`Hiányzó fiókkezelő függvény: ${name}`);
    }
  }

  if (!google?.linkCallbackUrl) {
    throw new Error("Hiányzó Google összekapcsolási callback cím.");
  }

  if (typeof externalAccounts?.linkGoogleAccount !== "function") {
    throw new Error("Hiányzó linkGoogleAccount adatkezelő függvény.");
  }
  if (typeof sendVerificationEmail !== "function") {
    throw new Error("Hiányzó sendVerificationEmail függvény.");
  }

  if (typeof sendPasswordResetEmail !== "function") {
    throw new Error("Hiányzó sendPasswordResetEmail függvény.");
  }

  if (!google?.clientId || !google?.clientSecret || !google?.callbackUrl) {
    throw new Error("Hiányzó Google OAuth-konfiguráció.");
  }

  if (typeof externalAccounts?.findOrCreateGoogleUser !== "function") {
    throw new Error("Hiányzó Google-fiók adatkezelő függvény.");
  }

  const frontendOrigin = new URL(frontendUrl);

  if (!["http:", "https:"].includes(frontendOrigin.protocol)) {
    throw new Error("A frontendUrl HTTP- vagy HTTPS-cím legyen.");
  }

  for (const name of ["listActive", "revoke", "invalidateOthers"]) {
    if (typeof sessions?.[name] !== "function") {
      throw new Error(`Hiányzó session adatkezelő függvény: ${name}`);
    }
  }

  for (const name of [
    "findByIdentifier",
    "findById",
    "create",
    "saveEmailVerificationToken",
    "verifyEmailToken",
    "findPasswordById",
    "changePassword",
    "createPasswordReset",
    "resetPassword",
  ]) {
    if (typeof users?.[name] !== "function") {
      throw new Error(`Hiányzó auth adatkezelő függvény: ${name}`);
    }
  }

  for (const name of [
    "listActive",
    "revoke",
    "invalidateOthers",
    "isRevoked",
  ]) {
    if (typeof sessions?.[name] !== "function") {
      throw new Error(`Hiányzó session adatkezelő függvény: ${name}`);
    }
  }

  const passport = new Passport();

  configurePassport(passport, users);

  configureGoogle(passport, {
    google,
    externalAccounts,
  });

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

  router.use(createSessionRouter({ sessions }));

  router.use(
    createEmailRouter({
      users,
      sendVerificationEmail,
      frontendUrl,
    }),
  );

  router.use(
    createAuthRouter({
      passport,
      users,
      sessions,
    }),
  );

  router.use(
    createPasswordRouter({
      users,
      sendPasswordResetEmail,
      frontendUrl,
    }),
  );

  router.use(
    createGoogleRouter({
      passport,
      frontendUrl,
    }),
  );

  router.use(
    createGoogleLinkRouter({
      passport,
      users,
      externalAccounts,
      frontendUrl,
    }),
  );

  router.use(
    createAccountRouter({
      passport,
      users,
      accounts,
      frontendUrl,
    }),
  );

  return {
    initialize: passport.initialize(),
    session: passport.session(),
    router,
    requireAuth,
    csrfProtection: csrfSynchronisedProtection,
    sessionGuard: createSessionGuard({ sessions }),
  };
}

module.exports = createAuth;
