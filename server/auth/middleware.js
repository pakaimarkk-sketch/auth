function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Előbb jelentkezz be!",
    });
  }

  next();
}

module.exports = requireAuth;
