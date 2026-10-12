const pool = require("./pool");

async function findByUsername(username) {
  const { rows } = await pool.query(
    "SELECT id, username, password FROM users WHERE username = $1",
    [username],
  );

  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await pool.query(
    "SELECT id, username FROM users WHERE id = $1",
    [id],
  );

  return rows[0] ?? null;
}

async function create({ username, passwordHash }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, password)
       VALUES ($1, $2)
       RETURNING id, username`,
      [username, passwordHash],
    );

    return rows[0];
  } catch (error) {
    if (error.code === "23505" && error.constraint === "users_username_key") {
      const conflict = new Error("Username already exists");
      conflict.code = "USERNAME_TAKEN";
      throw conflict;
    }

    throw error;
  }
}

module.exports = {
  findByUsername,
  findById,
  create,
};
