const authService = require('../services/auth.service');

/**
 * POST /api/auth/signup
 * Register a new user and return a JWT.
 */
async function signup(req, res, next) {
  try {
    const { username, password, securityQuestion, securityAnswer } = req.body;
    const result = await authService.signup({
      username,
      password,
      securityQuestion,
      securityAnswer,
    });
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Authenticate a user and return a JWT.
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Return the currently authenticated user's info from the JWT payload.
 * requireAuth middleware must run before this.
 */
function me(req, res) {
  return res.status(200).json({
    userId: req.user.userId,
    username: req.user.username,
  });
}

/**
 * POST /api/auth/reset-password/question
 * Return the security question for a given username.
 * Body: { username }
 */
async function getSecurityQuestion(req, res, next) {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string' || username.trim() === '') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const result = await authService.getSecurityQuestion(username.trim());
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password/verify
 * Verify the security answer and update the password.
 * Body: { username, securityAnswer, newPassword }
 */
async function resetPassword(req, res, next) {
  try {
    const { username, securityAnswer, newPassword } = req.body;

    if (!username || typeof username !== 'string' || username.trim() === '') {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!securityAnswer || typeof securityAnswer !== 'string' || securityAnswer.trim() === '') {
      return res.status(400).json({ error: 'Security answer is required' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const result = await authService.resetPassword(
      username.trim(),
      securityAnswer,
      newPassword
    );
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, me, getSecurityQuestion, resetPassword };
