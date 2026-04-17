const { generateQuiz } = require('./claude.service');
const {
  createQuiz,
  findById,
  findByUserId,
  createResult,
  findResultByQuizId,
  findResultByUserId,
} = require('../models/quiz.model');

/**
 * Strip the correctAnswer and explanation fields from questions
 * so they are safe to send to the frontend before submission.
 * @param {Object} quiz - Full quiz document from the DB
 * @returns {Object} Quiz safe for the frontend
 */
function sanitizeQuizForFrontend(quiz) {
  return {
    _id: quiz._id,
    userId: quiz.userId,
    jobTitle: quiz.jobTitle,
    jobDescription: quiz.jobDescription,
    learningSummary: quiz.learningSummary,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    questions: quiz.questions.map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      // correctAnswer, explanation, wrongExplanations are intentionally omitted
    })),
  };
}

/**
 * Create a new quiz for a user by calling the Claude API.
 * Saves the full quiz (with answers) to the DB but returns a sanitized version.
 * @param {string} userId
 * @param {string} jobDescription
 * @returns {Promise<Object>} Sanitized quiz (no answers)
 */
async function createQuizService(userId, jobDescription) {
  // Call Claude to generate quiz data
  const quizData = await generateQuiz(jobDescription);

  // Persist the full quiz document (including correct answers and explanations)
  const savedQuiz = await createQuiz({
    userId,
    jobDescription,
    jobTitle: quizData.jobTitle,
    questions: quizData.questions,
    learningSummary: quizData.learningSummary,
  });

  // Return sanitized version (no answers for the frontend)
  return sanitizeQuizForFrontend(savedQuiz);
}

/**
 * Get a quiz by ID, checking that it belongs to the requesting user.
 * Attaches the result if the quiz has been submitted.
 * @param {string} quizId
 * @param {string} userId
 * @returns {Promise<Object>} Quiz with optional result
 */
async function getQuizById(quizId, userId) {
  const quiz = await findById(quizId);

  if (!quiz) {
    const err = new Error('Quiz not found');
    err.statusCode = 404;
    throw err;
  }

  if (quiz.userId !== userId) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  // Check if already submitted
  const result = await findResultByQuizId(quizId);

  if (result) {
    // Return full quiz data (with answers) plus result since quiz is already submitted
    return {
      ...quiz,
      result,
    };
  }

  // Quiz not yet submitted — return sanitized version (no answers)
  return sanitizeQuizForFrontend(quiz);
}

/**
 * Get all quizzes for a user, sorted newest first.
 * Attaches score from result if available.
 * @param {string} userId
 * @returns {Promise<Array>} List of quiz summaries
 */
async function getUserQuizzes(userId) {
  const quizzes = await findByUserId(userId);
  const userResults = await findResultByUserId(userId);

  // Build a lookup map: quizId -> result
  const resultByQuizId = {};
  for (const result of userResults) {
    resultByQuizId[result.quizId] = result;
  }

  // Sort newest first
  const sorted = quizzes.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Return summary info for each quiz
  return sorted.map((quiz) => {
    const result = resultByQuizId[quiz._id];
    return {
      _id: quiz._id,
      userId: quiz.userId,
      jobTitle: quiz.jobTitle,
      jobDescription: quiz.jobDescription,
      createdAt: quiz.createdAt,
      submitted: !!result,
      score: result ? result.score : null,
      totalQuestions: result ? result.totalQuestions : 5,
    };
  });
}

/**
 * Submit answers for a quiz. Scores the answers and saves a result.
 * @param {string} quizId
 * @param {string} userId
 * @param {Array} answers - Array of { questionId, selectedAnswer }
 * @returns {Promise<Object>} Score, per-question results, and learningSummary
 */
async function submitQuiz(quizId, userId, answers) {
  const quiz = await findById(quizId);

  if (!quiz) {
    const err = new Error('Quiz not found');
    err.statusCode = 404;
    throw err;
  }

  if (quiz.userId !== userId) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  // Check if already submitted
  const existingResult = await findResultByQuizId(quizId);
  if (existingResult) {
    const err = new Error('Quiz has already been submitted');
    err.statusCode = 409;
    throw err;
  }

  // Build a lookup map: questionId -> question
  const questionMap = {};
  for (const question of quiz.questions) {
    questionMap[question.questionId] = question;
  }

  // Score each answer and build per-question results
  let score = 0;
  const questionResults = answers.map((answer) => {
    const question = questionMap[answer.questionId];

    if (!question) {
      const err = new Error(`Question ${answer.questionId} not found in quiz`);
      err.statusCode = 400;
      throw err;
    }

    const isCorrect = answer.selectedAnswer === question.correctAnswer;
    if (isCorrect) score += 1;

    // Build explanation: show the correct answer's explanation
    // and the wrong explanation for the selected answer if incorrect
    const resultEntry = {
      questionId: answer.questionId,
      questionText: question.questionText,
      selectedAnswer: answer.selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation,
      options: question.options,
    };

    if (!isCorrect) {
      resultEntry.wrongExplanation = question.wrongExplanations[answer.selectedAnswer] || null;
      resultEntry.wrongExplanations = question.wrongExplanations;
    } else {
      resultEntry.wrongExplanations = question.wrongExplanations;
    }

    return resultEntry;
  });

  const totalQuestions = quiz.questions.length;

  // Persist the result
  await createResult({
    quizId,
    userId,
    score,
    totalQuestions,
    answers: questionResults,
    submittedAt: new Date().toISOString(),
  });

  return {
    quizId,
    score,
    totalQuestions,
    percentage: Math.round((score / totalQuestions) * 100),
    questionResults,
    learningSummary: quiz.learningSummary,
  };
}

module.exports = {
  createQuiz: createQuizService,
  getQuizById,
  getUserQuizzes,
  submitQuiz,
};
