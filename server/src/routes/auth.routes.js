const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth.middleware');
const { handleValidationErrors } = require('../middleware/validate.middleware');
const {
  signupValidation,
  loginValidation,
} = require('../utils/validators');
const authController = require('../controllers/auth.controller');

// POST /api/auth/signup
router.post(
  '/signup',
  signupValidation,
  handleValidationErrors,
  authController.signup
);

// POST /api/auth/login
router.post(
  '/login',
  loginValidation,
  handleValidationErrors,
  authController.login
);

// GET /api/auth/me — requires valid JWT
router.get('/me', requireAuth, authController.me);

// POST /api/auth/reset-password/question — get the security question for a username
router.post('/reset-password/question', authController.getSecurityQuestion);

// POST /api/auth/reset-password/verify — verify answer and set new password
router.post('/reset-password/verify', authController.resetPassword);

module.exports = router;
