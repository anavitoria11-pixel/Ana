/**
 * Formats an ISO date string to "Month D, YYYY" format
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Formatted date string
 */
export function formatDate(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Truncates a string with ellipsis if it exceeds maxLen
 * @param {string} str - String to truncate
 * @param {number} maxLen - Maximum length before truncation
 * @returns {string} Truncated string
 */
export function truncate(str, maxLen) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}

/**
 * Returns a color key based on score vs total
 * @param {number} score - Achieved score
 * @param {number} total - Total possible score
 * @returns {'correct'|'accent'|'incorrect'} Color identifier
 */
export function getScoreColor(score, total) {
  if (score === total) return 'correct'
  if (score >= total / 2) return 'accent'
  return 'incorrect'
}
