export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very strong'

export interface PasswordRequirements {
  minLength: boolean
  hasUpper: boolean
  hasLower: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

export interface ValidateOptions {
  requireSpecial?: boolean
  minLength?: number
}

export interface ValidationResult {
  valid: boolean
  score: number // 0-100
  strength: PasswordStrength
  requirements: PasswordRequirements
  missing: string[]
  color: string // tailwind color class hint
}

const specialRegex = /[^A-Za-z0-9]/

export function validatePassword(password: string, options: ValidateOptions = {}): ValidationResult {
  const minLength = options.minLength ?? 8
  const requireSpecial = options.requireSpecial ?? false

  const requirements: PasswordRequirements = {
    minLength: password.length >= minLength,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: specialRegex.test(password),
  }

  const missing: string[] = []
  if (!requirements.minLength) missing.push(`Minimum ${minLength} characters`)
  if (!requirements.hasUpper) missing.push('At least one uppercase letter')
  if (!requirements.hasLower) missing.push('At least one lowercase letter')
  if (!requirements.hasNumber) missing.push('At least one number')
  if (requireSpecial && !requirements.hasSpecial) missing.push('At least one special character')

  // Base score out of 100 considering each requirement equally
  const totalChecks = requireSpecial ? 5 : 4
  const passedChecks = (requirements.minLength ? 1 : 0)
    + (requirements.hasUpper ? 1 : 0)
    + (requirements.hasLower ? 1 : 0)
    + (requirements.hasNumber ? 1 : 0)
    + (requireSpecial && requirements.hasSpecial ? 1 : 0)

  // Additional points for extra length and variety
  const lengthBonus = Math.min(20, Math.max(0, password.length - minLength) * 2)
  const varietyBonus = (requirements.hasUpper && requirements.hasLower && requirements.hasNumber && requirements.hasSpecial) ? 10 : 0

  let score = Math.round((passedChecks / totalChecks) * 70 + lengthBonus + varietyBonus)
  score = Math.min(100, score)

  let strength: PasswordStrength
  let color: string
  if (score < 40) { strength = 'weak'; color = 'text-red-600' }
  else if (score < 65) { strength = 'medium'; color = 'text-yellow-600' }
  else if (score < 85) { strength = 'strong'; color = 'text-green-600' }
  else { strength = 'very strong'; color = 'text-emerald-600' }

  const valid = strength === 'strong' || strength === 'very strong'

  return { valid, score, strength, requirements, missing, color }
}

export interface GenerateOptions {
  length?: number
  requireSpecial?: boolean
}

export function generateStrongPassword(options: GenerateOptions = {}): string {
  const length = Math.max(8, options.length ?? 12)
  const requireSpecial = options.requireSpecial ?? false

  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()-_=+[]{}|;:,.<>?'

  // Ensure inclusion of each required category
  const chars: string[] = []
  chars.push(randomChar(upper))
  chars.push(randomChar(lower))
  chars.push(randomChar(numbers))
  if (requireSpecial) chars.push(randomChar(special))

  // Fill the rest with a mix
  const pool = requireSpecial ? (upper + lower + numbers + special) : (upper + lower + numbers)
  while (chars.length < length) {
    chars.push(randomChar(pool))
  }

  // Shuffle to avoid predictable order
  return shuffle(chars).join('')
}

function randomChar(str: string): string {
  const idx = Math.floor(Math.random() * str.length)
  return str[idx]
}

function shuffle<T>(arr: T[]): T[] {
  // Fisher–Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}
