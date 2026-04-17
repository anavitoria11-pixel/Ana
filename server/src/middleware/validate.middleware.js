const { validationResult } = require('express-validator');

/**
 * Middleware that checks for express-validator validation errors.
 * If any errors exist, responds with 400 and an array of error messages.
 * Otherwise, passes control to the next handler.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  next();
}

module.exports = { handleValidationErrors };
