const GoogleStrategy = require("passport-google-oauth20").Strategy;

function configureGoogle(passport, { google, externalAccounts }) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: google.clientId,
        clientSecret: google.clientSecret,
        callbackURL: google.callbackUrl,
        state: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleProfile = profile._json;

          const emailVerified =
            googleProfile?.email_verified === true ||
            googleProfile?.verified_email === true;

          const email = googleProfile?.email;

          if (!profile.id || typeof email !== "string" || !emailVerified) {
            return done(null, false);
          }

          const user = await externalAccounts.findOrCreateGoogleUser({
            providerUserId: profile.id,
            email: email.trim().toLowerCase(),
          });

          done(null, user);
        } catch (error) {
          done(error);
        }
      },
    ),
  );

  passport.use(
    "google-link",
    new GoogleStrategy(
      {
        clientID: google.clientId,
        clientSecret: google.clientSecret,
        callbackURL: google.linkCallbackUrl,
        state: true,
        sessionKey: "oauth2:google-link",
      },
      (accessToken, refreshToken, profile, done) => {
        const data = profile._json;

        const verified =
          data?.email_verified === true || data?.verified_email === true;

        if (!profile.id || typeof data?.email !== "string" || !verified) {
          return done(null, false);
        }

        done(null, {
          providerUserId: profile.id,
          email: data.email.trim().toLowerCase(),
        });
      },
    ),
  );
}

module.exports = configureGoogle;
