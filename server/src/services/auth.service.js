const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findByUsername, findById, updatePassword } = require('../models/user.model');

const BCRYPT_COST = 10;

/**
 * Hash a plain-text password using bcrypt.
 * @param {string} password
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Sign a JWT token for the given user.
 * @param {string} userId
 * @param {string} username
 * @returns {string} Signed JWT
 */
function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Verify a JWT token and return the decoded payload.
 * Throws if token is invalid or expired.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Register a new user.
 * @param {Object} data - { username, password, securityQuestion, securityAnswer }
 * @returns {Promise<{ userId, username, token }>}
 */
async function signup(data) {
  const { username, password, securityQuestion, securityAnswer } = data;

  // Check for existing username (case-insensitive via model)
  const existing = await findByUsername(username);
  if (existing) {
    const err = new Error('Username already taken');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const securityAnswerHash = await hashPassword(securityAnswer.toLowerCase().trim());

  const user = await createUser({
    username,
    passwordHash,
    securityQuestion,
    securityAnswerHash,
  });

  const token = generateToken(user._id, user.username);

  return { userId: user._id, username: user.username, token };
}

/**
 * Authenticate a user and return a token.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ userId, username, token }>}
 */
async function login(username, password) {
  const user = await findByUsername(username);

  if (!user) {
    const err = new Error('Invalid username or password');
    err.statusCode = 401;
    throw err;
  }

  const passwordMatch = await comparePassword(password, user.passwordHash);

  if (!passwordMatch) {
    const err = new Error('Invalid username or password');
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken(user._id, user.username);

  return { userId: user._id, username: user.username, token };
}

/**
 * Get the security question for a given username.
 * @param {string} username
 * @returns {Promise<{ securityQuestion: string }>}
 */
async function getSecurityQuestion(username) {
  const user = await findByUsername(username);

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return { securityQuestion: user.securityQuestion };
}

/**
 * Reset a user's password after verifying their security answer.
 * @param {string} username
 * @param {string} securityAnswer
 * @param {string} newPassword
 * @returns {Promise<{ success: boolean }>}
 */
async function resetPassword(username, securityAnswer, newPassword) {
  const user = await findByUsername(username);

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const answerMatch = await comparePassword(
    securityAnswer.toLowerCase().trim(),
    user.securityAnswerHash
  );

  if (!answerMatch) {
    const err = new Error('Incorrect security answer');
    err.statusCode = 401;
    throw err;
  }

  const newHash = await hashPassword(newPassword);
  await updatePassword(user._id, newHash);

  return { success: true };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  signup,
  login,
  getSecurityQuestion,
  resetPassword,
};
