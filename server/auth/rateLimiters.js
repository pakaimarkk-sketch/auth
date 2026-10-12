const { rateLimit } = require("express-rate-limit");

function createAuthRateLimiters() {
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message: "Túl sok belépési próbálkozás. Próbáld újra később.",
    },
  });

  const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message: "Túl sok regisztrációs próbálkozás. Próbáld újra később.",
    },
  });

  return { loginLimiter, signupLimiter };
}

module.exports = createAuthRateLimiters;
