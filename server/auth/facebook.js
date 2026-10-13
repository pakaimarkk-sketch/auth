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
          const user = await externalAccounts.findFacebookUser(profile.id);

          if (!user) {
            return done(null, false);
          }

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
}

module.exports = configureFacebook;
