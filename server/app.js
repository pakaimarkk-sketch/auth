require("dotenv").config();

const express = require("express");
const session = require("express-session");
const createAuth = require("./auth");
const users = require("./db/userQueries");

if (!process.env.SESSION_SECRET) {
  throw new Error("A SESSION_SECRET környezeti változó hiányzik.");
}

const isProduction = process.env.NODE_ENV === "production";

const app = express();
const auth = createAuth({ users });
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
