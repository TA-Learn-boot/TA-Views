/** Pragmatic email shape check (not full RFC 5322). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_MIN_LENGTH = 6

/**
 * @returns {string} empty if valid, otherwise a user-facing message
 */
export function validateEmail(email) {
  const t = (email || '').trim()
  if (!t) return 'Email is required.'
  if (t.length > 254) return 'Email is too long.'
  if (!EMAIL_PATTERN.test(t)) return 'Enter a valid email address.'
  return ''
}

/**
 * Sign-up / password-reset style rules.
 * @returns {string} empty if valid
 */
export function validatePasswordSignup(password) {
  if (password == null || password === '') return 'Password is required.'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.'
  return ''
}
