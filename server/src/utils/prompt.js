const SYSTEM_PROMPT =
  'You are a quiz generator. Given a job description, you produce exactly 5 multiple choice questions that test understanding of the company, the role, the responsibilities, the required skills, and the broader context of the position. You respond only with valid JSON, no markdown, no commentary. Follow the exact schema provided.';

/**
 * Build the user-facing prompt for the Claude API call.
 * @param {string} jobDescription - The raw job description text
 * @returns {string} The complete user prompt
 */
function buildUserPrompt(jobDescription) {
  return `Analyze the following job description and generate exactly 5 multiple choice questions. Each question must test a different aspect: company understanding, role understanding, key responsibilities, required skills, and broader context or industry fit.

Job Description:
${jobDescription}

Respond ONLY with valid JSON matching this exact schema (no markdown, no extra text):

{
  "jobTitle": "string",
  "questions": [
    {
      "questionId": "q1",
      "questionText": "string",
      "options": [
        { "label": "A", "text": "string" },
        { "label": "B", "text": "string" },
        { "label": "C", "text": "string" },
        { "label": "D", "text": "string" }
      ],
      "correctAnswer": "A",
      "explanation": "string",
      "wrongExplanations": {
        "B": "string",
        "C": "string",
        "D": "string"
      }
    },
    {
      "questionId": "q2",
      "questionText": "string",
      "options": [
        { "label": "A", "text": "string" },
        { "label": "B", "text": "string" },
        { "label": "C", "text": "string" },
        { "label": "D", "text": "string" }
      ],
      "correctAnswer": "B",
      "explanation": "string",
      "wrongExplanations": {
        "A": "string",
        "C": "string",
        "D": "string"
      }
    },
    {
      "questionId": "q3",
      "questionText": "string",
      "options": [
        { "label": "A", "text": "string" },
        { "label": "B", "text": "string" },
        { "label": "C", "text": "string" },
        { "label": "D", "text": "string" }
      ],
      "correctAnswer": "C",
      "explanation": "string",
      "wrongExplanations": {
        "A": "string",
        "B": "string",
        "D": "string"
      }
    },
    {
      "questionId": "q4",
      "questionText": "string",
      "options": [
        { "label": "A", "text": "string" },
        { "label": "B", "text": "string" },
        { "label": "C", "text": "string" },
        { "label": "D", "text": "string" }
      ],
      "correctAnswer": "D",
      "explanation": "string",
      "wrongExplanations": {
        "A": "string",
        "B": "string",
        "C": "string"
      }
    },
    {
      "questionId": "q5",
      "questionText": "string",
      "options": [
        { "label": "A", "text": "string" },
        { "label": "B", "text": "string" },
        { "label": "C", "text": "string" },
        { "label": "D", "text": "string" }
      ],
      "correctAnswer": "A",
      "explanation": "string",
      "wrongExplanations": {
        "B": "string",
        "C": "string",
        "D": "string"
      }
    }
  ],
  "learningSummary": "string"
}

Rules:
- questionId must be exactly "q1", "q2", "q3", "q4", "q5"
- correctAnswer must be one of "A", "B", "C", "D"
- wrongExplanations must contain an entry for each option label that is NOT the correctAnswer
- All fields are required and must be non-empty strings
- Return ONLY the JSON object, nothing else`;
}

const RETRY_SUFFIX =
  'Your previous response was invalid. You MUST respond with valid JSON matching the exact schema. No markdown. No extra text.';

module.exports = { SYSTEM_PROMPT, buildUserPrompt, RETRY_SUFFIX };
