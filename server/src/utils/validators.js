const { body } = require('express-validator');

/**
 * Validation chain for user signup.
 * - username: 3-30 chars, alphanumeric + underscores only
 * - password: minimum 8 characters
 * - securityQuestion: non-empty string
 * - securityAnswer: non-empty string
 */
const signupValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers, and underscores'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('securityQuestion')
    .trim()
    .notEmpty()
    .withMessage('Security question is required'),

  body('securityAnswer')
    .trim()
    .notEmpty()
    .withMessage('Security answer is required'),
];

/**
 * Validation chain for user login.
 * - username: must be present
 * - password: must be present
 */
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation chain for quiz creation.
 * - jobDescription: 50-15000 chars, not just whitespace
 */
const quizValidation = [
  body('jobDescription')
    .trim()
    .isLength({ min: 50, max: 15000 })
    .withMessage('Job description must be between 50 and 15000 characters')
    .custom((value) => {
      if (!value || value.trim().length < 50) {
        throw new Error('Job description cannot be mostly whitespace');
      }
      return true;
    }),
];

/**
 * Validation chain for quiz submission.
 * - answers: array of exactly 5 items
 * - each answer: { questionId: "q1"-"q5", selectedAnswer: "A"|"B"|"C"|"D" }
 */
const submitValidation = [
  body('answers')
    .isArray({ min: 5, max: 5 })
    .withMessage('Answers must be an array of exactly 5 items'),

  body('answers.*.questionId')
    .matches(/^q[1-5]$/)
    .withMessage('Each questionId must be q1, q2, q3, q4, or q5'),

  body('answers.*.selectedAnswer')
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Each selectedAnswer must be A, B, C, or D'),
];

module.exports = {
  signupValidation,
  loginValidation,
  quizValidation,
  submitValidation,
};
