/**
 * Distinguish user-facing API/validation errors from programming errors.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isUserFacingError(err) {
  return Boolean(err && typeof err === 'object' && err.userFacing === true);
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [extra]
 */
export function createUserFacingError(message, extra = {}) {
  const err = new Error(message);
  err.userFacing = true;
  Object.assign(err, extra);
  return err;
}

/**
 * Log programming/runtime errors — never show these as toasts.
 * @param {string} context
 * @param {unknown} err
 */
export function logAppError(context, err) {
  console.error(`[${context}]`, err);
}

/**
 * Patterns that indicate a JS exception leaked into a toast message.
 * @param {string} message
 */
export function looksLikeRuntimeException(message) {
  if (!message || typeof message !== 'string') return false;
  return /is not a function|is not defined|Cannot read properties of|Unexpected token|is not iterable/i.test(message);
}
