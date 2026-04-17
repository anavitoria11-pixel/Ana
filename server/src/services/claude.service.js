const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildUserPrompt, RETRY_SUFFIX } = require('../utils/prompt');

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
  timeout: 30000,
});

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 4096;
const MAX_JD_LENGTH = 15000;

/**
 * Validate the parsed quiz response from Claude.
 * Throws a descriptive error if anything is invalid.
 * @param {any} data - Parsed JSON from Claude
 * @returns {true}
 */
function validateQuizResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not an object');
  }

  if (typeof data.jobTitle !== 'string' || data.jobTitle.trim() === '') {
    throw new Error('jobTitle must be a non-empty string');
  }

  if (typeof data.learningSummary !== 'string' || data.learningSummary.trim() === '') {
    throw new Error('learningSummary must be a non-empty string');
  }

  if (!Array.isArray(data.questions) || data.questions.length !== 5) {
    throw new Error(`questions must be an array of exactly 5 items, got ${Array.isArray(data.questions) ? data.questions.length : typeof data.questions}`);
  }

  const validAnswers = ['A', 'B', 'C', 'D'];
  const validQuestionIds = ['q1', 'q2', 'q3', 'q4', 'q5'];

  data.questions.forEach((q, index) => {
    const qLabel = `Question at index ${index}`;

    if (!validQuestionIds.includes(q.questionId)) {
      throw new Error(`${qLabel}: questionId must be one of q1-q5, got "${q.questionId}"`);
    }

    if (typeof q.questionText !== 'string' || q.questionText.trim() === '') {
      throw new Error(`${qLabel} (${q.questionId}): questionText must be a non-empty string`);
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`${qLabel} (${q.questionId}): options must be an array of exactly 4 items`);
    }

    const optionLabels = q.options.map((o) => o.label);
    validAnswers.forEach((label) => {
      if (!optionLabels.includes(label)) {
        throw new Error(`${qLabel} (${q.questionId}): options must include label "${label}"`);
      }
    });

    q.options.forEach((opt, optIdx) => {
      if (!validAnswers.includes(opt.label)) {
        throw new Error(`${qLabel} (${q.questionId}): option at index ${optIdx} has invalid label "${opt.label}"`);
      }
      if (typeof opt.text !== 'string' || opt.text.trim() === '') {
        throw new Error(`${qLabel} (${q.questionId}): option "${opt.label}" must have non-empty text`);
      }
    });

    if (!validAnswers.includes(q.correctAnswer)) {
      throw new Error(`${qLabel} (${q.questionId}): correctAnswer must be one of A/B/C/D, got "${q.correctAnswer}"`);
    }

    if (!optionLabels.includes(q.correctAnswer)) {
      throw new Error(`${qLabel} (${q.questionId}): correctAnswer "${q.correctAnswer}" does not match any option label`);
    }

    if (typeof q.explanation !== 'string' || q.explanation.trim() === '') {
      throw new Error(`${qLabel} (${q.questionId}): explanation must be a non-empty string`);
    }

    if (!q.wrongExplanations || typeof q.wrongExplanations !== 'object' || Array.isArray(q.wrongExplanations)) {
      throw new Error(`${qLabel} (${q.questionId}): wrongExplanations must be an object`);
    }

    const wrongLabels = validAnswers.filter((l) => l !== q.correctAnswer);
    wrongLabels.forEach((label) => {
      if (typeof q.wrongExplanations[label] !== 'string' || q.wrongExplanations[label].trim() === '') {
        throw new Error(`${qLabel} (${q.questionId}): wrongExplanations must have a non-empty string for label "${label}"`);
      }
    });
  });

  return true;
}

/**
 * Attempt to parse JSON from Claude's response text.
 * First tries a direct JSON.parse; if that fails, tries to extract
 * the JSON object between the first '{' and last '}'.
 * @param {string} text
 * @returns {any} Parsed JSON object
 */
function parseResponse(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try extracting JSON between first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonSubstring = text.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonSubstring);
      } catch (e2) {
        throw new Error(`Could not parse JSON from response: ${e2.message}`);
      }
    }

    throw new Error(`Response does not contain a JSON object: ${e.message}`);
  }
}

/**
 * Call Claude to generate a quiz from a job description.
 * Retries once if the response is invalid.
 * @param {string} jobDescription
 * @returns {Promise<Object>} Validated quiz data
 */
async function generateQuiz(jobDescription) {
  // Truncate to max length
  const truncatedJD = jobDescription.slice(0, MAX_JD_LENGTH);

  const userPrompt = buildUserPrompt(truncatedJD);

  // First attempt
  let responseText;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    responseText = message.content[0].text;
  } catch (err) {
    throw new Error(`Claude API call failed: ${err.message}`);
  }

  // Try to parse and validate first attempt
  let parsed;
  let validationError;

  try {
    parsed = parseResponse(responseText);
    validateQuizResponse(parsed);
    return parsed;
  } catch (err) {
    validationError = err;
    console.warn('First Claude response invalid, retrying:', err.message);
  }

  // Retry with suffix
  const retryPrompt = userPrompt + '\n\n' + RETRY_SUFFIX;

  let retryResponseText;
  try {
    const retryMessage = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: retryPrompt },
      ],
    });

    retryResponseText = retryMessage.content[0].text;
  } catch (err) {
    throw new Error(`Claude API retry call failed: ${err.message}`);
  }

  try {
    parsed = parseResponse(retryResponseText);
    validateQuizResponse(parsed);
    return parsed;
  } catch (err) {
    console.error('Retry also failed:', err.message);
    throw new Error('Failed to generate quiz');
  }
}

module.exports = { generateQuiz, validateQuizResponse };
