function createSessionGuard({ sessions }) {
  return async function sessionGuard(req, res, next) {
    try {
      if (!req.session || !req.session.passport?.user) {
        return next();
      }

      const revoked = await sessions.isRevoked(req.sessionID);

      if (!revoked) {
        return next();
      }

      req.session.regenerate((error) => {
        if (error) return next(error);

        next();
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = createSessionGuard;
