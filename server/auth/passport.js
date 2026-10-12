const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

function configurePassport(passport, users) {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await users.findByUsername(username);

        if (!user) {
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
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await users.findById(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });
}

module.exports = configurePassport;
