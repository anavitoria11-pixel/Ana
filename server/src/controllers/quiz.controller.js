const quizService = require('../services/quiz.service');

/**
 * POST /api/quizzes
 * Create a new quiz from a job description.
 * Returns the quiz without correct answers or explanations (safe for frontend).
 */
async function createQuiz(req, res, next) {
  try {
    const { jobDescription } = req.body;
    const userId = req.user.userId;

    const quiz = await quizService.createQuiz(userId, jobDescription);
    return res.status(201).json(quiz);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quizzes
 * List all quizzes for the authenticated user, sorted newest first.
 * Includes score from results if the quiz has been submitted.
 */
async function getQuizzes(req, res, next) {
  try {
    const userId = req.user.userId;
    const quizzes = await quizService.getUserQuizzes(userId);
    return res.status(200).json(quizzes);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quizzes/:quizId
 * Get a single quiz by ID.
 * Includes result data if the quiz has been submitted.
 */
async function getQuiz(req, res, next) {
  try {
    const { quizId } = req.params;
    const userId = req.user.userId;

    const quiz = await quizService.getQuizById(quizId, userId);
    return res.status(200).json(quiz);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/quizzes/:quizId/submit
 * Submit answers for a quiz.
 * Returns score, per-question results with explanations, and the learning summary.
 */
async function submitQuiz(req, res, next) {
  try {
    const { quizId } = req.params;
    const userId = req.user.userId;
    const { answers } = req.body;

    const result = await quizService.submitQuiz(quizId, userId, answers);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { createQuiz, getQuizzes, getQuiz, submitQuiz };
