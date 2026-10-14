const { Passport } = require("passport");
const { Router } = require("express");
const { csrfSync } = require("csrf-sync");

const configurePassport = require("./passport");
const configureGoogle = require("./google");
const configureFacebook = require("./facebook");

const createAuthRouter = require("./routes");
const createEmailRouter = require("./emailRoutes");
const createPasswordRouter = require("./passwordRoutes");
const createSessionRouter = require("./sessionRoutes");
const createAccountRouter = require("./accountRoutes");

const createGoogleRouter = require("./googleRoutes");
const createGoogleLinkRouter = require("./googleLinkRoutes");

const createFacebookRouter = require("./facebookRoutes");
const createFacebookLinkRouter = require("./facebookLinkRoutes");
const createFacebookDeleteRouter = require("./facebookDeleteRoutes");

const createSessionGuard = require("./sessionGuard");
const requireAuth = require("./middleware");

function requireFunctions(object, names) {
  for (const name of names) {
    if (typeof object?.[name] !== "function") {
      throw new Error(`Hiányzó auth függvény: ${name}`);
    }
  }
}

function createAuth({
  users,
  frontendUrl,
  sessions,
  google = null,
  facebook = null,
  externalAccounts,
  accounts,
}) {
  const providers = {
    google: google !== null,
    facebook: facebook !== null,
  };

  const frontendOrigin = new URL(frontendUrl);

  if (!["http:", "https:"].includes(frontendOrigin.protocol)) {
    throw new Error("A frontendUrl HTTP- vagy HTTPS-cím legyen.");
  }

  requireFunctions(users, [
    "findByIdentifier",
    "findById",
    "create",
    "saveEmailVerificationToken",
    "verifyEmailToken",
    "findPasswordById",
    "changePassword",
    "createPasswordReset",
    "resetPassword",
  ]);

  requireFunctions(sessions, [
    "listActive",
    "revoke",
    "invalidateOthers",
    "isRevoked",
  ]);

  requireFunctions(accounts, ["deleteAccount"]);

  if (providers.google) {
    if (
      !google.clientId ||
      !google.clientSecret ||
      !google.callbackUrl ||
      !google.linkCallbackUrl ||
      !google.deleteCallbackUrl
    ) {
      throw new Error("Hiányos Google-konfiguráció.");
    }

    requireFunctions(externalAccounts, [
      "findOrCreateGoogleUser",
      "linkGoogleAccount",
    ]);

    requireFunctions(accounts, ["matchesGoogleAccount"]);
  }

  if (providers.facebook) {
    if (
      !facebook.appId ||
      !facebook.appSecret ||
      !facebook.callbackUrl ||
      !facebook.linkCallbackUrl ||
      !facebook.deleteCallbackUrl
    ) {
      throw new Error("Hiányos Facebook-konfiguráció.");
    }

    requireFunctions(externalAccounts, [
      "findOrCreateFacebookUser",
      "linkFacebookAccount",
    ]);

    requireFunctions(accounts, ["matchesFacebookAccount"]);
  }

  const passport = new Passport();

  configurePassport(passport, users);

  if (providers.google) {
    configureGoogle(passport, {
      google,
      externalAccounts,
    });
  }

  if (providers.facebook) {
    configureFacebook(passport, {
      facebook,
      externalAccounts,
    });
  }

  const { generateToken, csrfSynchronisedProtection } = csrfSync();

  const router = Router();

  router.get("/config", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ providers });
  });

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
      frontendUrl,
    }),
  );

  router.use(
    createAccountRouter({
      passport,
      users,
      accounts,
      frontendUrl,
      providers,
    }),
  );

  if (providers.google) {
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
  }

  if (providers.facebook) {
    router.use(
      createFacebookRouter({
        passport,
        frontendUrl,
      }),
    );

    router.use(
      createFacebookLinkRouter({
        passport,
        users,
        externalAccounts,
        frontendUrl,
      }),
    );

    router.use(
      createFacebookDeleteRouter({
        passport,
        users,
        accounts,
        frontendUrl,
      }),
    );
  }

  return {
    initialize: passport.initialize(),
    session: passport.session(),
    sessionGuard: createSessionGuard({ sessions }),
    router,
    requireAuth,
    csrfProtection: csrfSynchronisedProtection,
  };
}

module.exports = createAuth;
