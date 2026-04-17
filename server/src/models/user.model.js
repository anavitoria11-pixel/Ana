const { users } = require('../config/db');

/**
 * Create a new user document in the database.
 * @param {Object} data - { username, passwordHash, securityQuestion, securityAnswerHash }
 */
async function createUser(data) {
  const now = new Date().toISOString();
  const doc = {
    username: data.username.toLowerCase(),
    passwordHash: data.passwordHash,
    securityQuestion: data.securityQuestion,
    securityAnswerHash: data.securityAnswerHash,
    createdAt: now,
    updatedAt: now,
  };
  return users.insert(doc);
}

/**
 * Find a user by username (case-insensitive).
 * @param {string} username
 */
async function findByUsername(username) {
  return users.findOne({ username: username.toLowerCase() });
}

/**
 * Find a user by their NeDB _id.
 * @param {string} id
 */
async function findById(id) {
  return users.findOne({ _id: id });
}

/**
 * Update the password hash for a user.
 * @param {string} id - The user's _id
 * @param {string} hash - The new bcrypt hash
 */
async function updatePassword(id, hash) {
  return users.update(
    { _id: id },
    { $set: { passwordHash: hash, updatedAt: new Date().toISOString() } }
  );
}

module.exports = { createUser, findByUsername, findById, updatePassword };
