const FacebookStrategy = require("passport-facebook").Strategy;

function configureFacebook(passport, { facebook, externalAccounts }) {
  const common = {
    clientID: facebook.appId,
    clientSecret: facebook.appSecret,
    state: true,
    enableProof: true,
    profileFields: ["id", "email"],
  };

  passport.use(
    "facebook",
    new FacebookStrategy(
      {
        ...common,
        callbackURL: facebook.callbackUrl,
        sessionKey: "oauth2:facebook-login",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          if (!profile.id) {
            return done(null, false);
          }

          const rawEmail = profile.emails?.[0]?.value;

          const user = await externalAccounts.findOrCreateFacebookUser({
            providerUserId: profile.id,
            email:
              typeof rawEmail === "string"
                ? rawEmail.trim().toLowerCase()
                : null,
          });

          done(null, user);
        } catch (error) {
          done(error);
        }
      },
    ),
  );

  passport.use(
    "facebook-link",
    new FacebookStrategy(
      {
        ...common,
        callbackURL: facebook.linkCallbackUrl,
        sessionKey: "oauth2:facebook-link",
      },
      (accessToken, refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;

        if (!profile.id || typeof email !== "string") {
          return done(null, false);
        }

        done(null, {
          providerUserId: profile.id,
          email: email.trim().toLowerCase(),
        });
      },
    ),
  );

  passport.use(
    "facebook-delete",
    new FacebookStrategy(
      {
        ...common,
        callbackURL: facebook.deleteCallbackUrl,
        sessionKey: "oauth2:facebook-delete",
      },
      (accessToken, refreshToken, profile, done) => {
        if (!profile.id) {
          return done(null, false);
        }

        done(null, {
          providerUserId: profile.id,
        });
      },
    ),
  );
}

module.exports = configureFacebook;
