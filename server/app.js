require("dotenv").config();

const express = require("express");
const session = require("express-session");
const createAuth = require("@pakaimark/auth");
const sessions = require("./db/sessionQueries");
const users = require("./db/userQueries");
const externalAccounts = require("./db/externalAccountQueries");
const accounts = require("./db/accountQueries");

if (!process.env.SESSION_SECRET) {
  throw new Error("A SESSION_SECRET környezeti változó hiányzik.");
}

const isProduction = process.env.NODE_ENV === "production";

const app = express();

const auth = createAuth({
  users,
  sessions,
  externalAccounts,
  accounts,

  google:
    process.env.GOOGLE_ENABLED === "true"
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackUrl: process.env.GOOGLE_CALLBACK_URL,
          linkCallbackUrl: process.env.GOOGLE_LINK_CALLBACK_URL,
          deleteCallbackUrl: process.env.GOOGLE_DELETE_CALLBACK_URL,
        }
      : null,

  facebook:
    process.env.FACEBOOK_ENABLED === "true"
      ? {
          appId: process.env.FACEBOOK_APP_ID,
          appSecret: process.env.FACEBOOK_APP_SECRET,
          callbackUrl: process.env.FACEBOOK_CALLBACK_URL,
          linkCallbackUrl: process.env.FACEBOOK_LINK_CALLBACK_URL,
          deleteCallbackUrl: process.env.FACEBOOK_DELETE_CALLBACK_URL,
        }
      : null,
  frontendUrl: process.env.FRONTEND_URL,
});

const PgSession = require("connect-pg-simple")(session);
const pool = require("./db/pool");

app.use(express.json());

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),

    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    rolling: true,

    cookie: {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(auth.sessionGuard);
app.use(auth.initialize);
app.use(auth.session);

app.get("/", (req, res) => {
  res.json({ message: "Az auth backend fut." });
});

app.use("/api/auth", auth.router);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      code: "INVALID_CSRF_TOKEN",
      message: "Érvénytelen biztonsági token. Próbáld újra.",
    });
  }

  console.error(error);

  res.status(500).json({
    message: "Szerverhiba történt. Próbáld újra később.",
  });
});

app.listen(3000, () => {
  console.log("app listening on port 3000!");
});
