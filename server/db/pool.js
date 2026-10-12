const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "auth_dev",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
