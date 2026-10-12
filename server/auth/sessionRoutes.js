const { Router } = require("express");
const { createHash } = require("node:crypto");
const requireAuth = require("./middleware");

function managementId(sid) {
  return createHash("sha256").update(sid).digest("hex");
}

function createSessionRouter({ sessions }) {
  const router = Router();

  router.get("/sessions", requireAuth, async (req, res, next) => {
    try {
      const rows = await sessions.listActive({
        userId: req.user.id,
        version: req.user.auth_version,
      });

      res.set("Cache-Control", "no-store");

      res.json({
        sessions: rows.map((row) => ({
          id: managementId(row.sid),
          current: row.sid === req.sessionID,
          loggedInAt: row.sess.authMeta?.loggedInAt ?? null,
          browser: row.sess.authMeta?.browser ?? "Nincs eltárolt leírás",
          expiresAt: row.expire,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/revoke", requireAuth, async (req, res, next) => {
    const { id } = req.body ?? {};

    if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) {
      return res.status(400).json({
        message: "Érvénytelen sessionazonosító.",
      });
    }

    try {
      const rows = await sessions.listActive({
        userId: req.user.id,
        version: req.user.auth_version,
      });

      const target = rows.find((row) => managementId(row.sid) === id);

      if (!target) {
        return res.status(404).json({
          message: "A session már nem aktív vagy nem található.",
        });
      }

      if (target.sid === req.sessionID) {
        return res.status(400).json({
          message: "Az aktuális sessionhöz a kijelentkezésgombot használd.",
        });
      }

      const revoked = await sessions.revoke({
        sid: target.sid,
        userId: req.user.id,
        version: req.user.auth_version,
      });

      if (!revoked) {
        return res.status(404).json({
          message: "A session már nem található.",
        });
      }

      res.json({ message: "A session megszüntetve." });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/sessions/revoke-others",
    requireAuth,
    async (req, res, next) => {
      try {
        const version = await sessions.invalidateOthers({
          userId: req.user.id,
          version: req.user.auth_version,
        });

        if (version === null) {
          return res.status(409).json({
            message: "A fiók időközben megváltozott. Jelentkezz be újra.",
          });
        }

        req.session.passport.user.version = version;
        req.user.auth_version = version;

        req.session.save((error) => {
          if (error) return next(error);

          res.json({
            message: "A többi session érvénytelenítve.",
          });
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

module.exports = createSessionRouter;
