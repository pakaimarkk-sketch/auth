const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

function configurePassport(passport, users) {
  passport.use(
    new LocalStrategy(
      { usernameField: "identifier" },
      async (identifier, password, done) => {
        try {
          const user = await users.findByIdentifier(identifier);

          if (!user || !user.password) {
            return done(null, false);
          }

          const match = await bcrypt.compare(password, user.password);

          if (!match) {
            return done(null, false);
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, {
      id: user.id,
      version: user.auth_version,
    });
  });

  passport.deserializeUser(async (sessionUser, done) => {
    try {
      if (!sessionUser || typeof sessionUser !== "object") {
        return done(null, false);
      }

      const user = await users.findById(sessionUser.id);

      if (!user || user.auth_version !== sessionUser.version) {
        return done(null, false);
      }

      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

module.exports = configurePassport;
