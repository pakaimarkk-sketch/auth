const auth = createAuth({
  users: {
    findById: userQueries.findById,
    findByEmail: userQueries.findByEmail,
    create: userQueries.create,
  },
  sessionSecret: process.env.SESSION_SECRET,
});
