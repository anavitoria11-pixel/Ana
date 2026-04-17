const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { requireAuth } = require('../middleware/auth.middleware');
const { handleValidationErrors } = require('../middleware/validate.middleware');
const { quizValidation, submitValidation } = require('../utils/validators');
const quizController = require('../controllers/quiz.controller');

// Stricter rate limiter for quiz creation: 10 requests per hour
const createQuizLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many quiz creation requests. Please try again later.' },
});

// All quiz routes require authentication
router.use(requireAuth);

// POST /api/quizzes — create a new quiz (stricter rate limit applied)
router.post(
  '/',
  createQuizLimiter,
  quizValidation,
  handleValidationErrors,
  quizController.createQuiz
);

// GET /api/quizzes — list all quizzes for the authenticated user
router.get('/', quizController.getQuizzes);

// GET /api/quizzes/:quizId — get a single quiz by ID
router.get('/:quizId', quizController.getQuiz);

// POST /api/quizzes/:quizId/submit — submit answers for a quiz
router.post(
  '/:quizId/submit',
  submitValidation,
  handleValidationErrors,
  quizController.submitQuiz
);

module.exports = router;
