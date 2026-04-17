const { quizzes, results } = require('../config/db');

/**
 * Create a new quiz document.
 * @param {Object} data - Quiz data including userId, jobDescription, questions, etc.
 */
async function createQuiz(data) {
  const now = new Date().toISOString();
  const doc = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  return quizzes.insert(doc);
}

/**
 * Find a quiz by its _id.
 * @param {string} id
 */
async function findById(id) {
  return quizzes.findOne({ _id: id });
}

/**
 * Find all quizzes belonging to a user.
 * @param {string} userId
 */
async function findByUserId(userId) {
  return quizzes.find({ userId });
}

/**
 * Create a quiz result document.
 * @param {Object} data - { quizId, userId, score, totalQuestions, answers, submittedAt }
 */
async function createResult(data) {
  const now = new Date().toISOString();
  const doc = {
    ...data,
    createdAt: now,
  };
  return results.insert(doc);
}

/**
 * Find a result by quizId.
 * @param {string} quizId
 */
async function findResultByQuizId(quizId) {
  return results.findOne({ quizId });
}

/**
 * Find all results for a user.
 * @param {string} userId
 */
async function findResultByUserId(userId) {
  return results.find({ userId });
}

module.exports = {
  createQuiz,
  findById,
  findByUserId,
  createResult,
  findResultByQuizId,
  findResultByUserId,
};
