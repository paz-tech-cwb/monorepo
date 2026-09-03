/**
 * Format a Brazilian phone number to (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export function formatPhoneBR(value: string): string {
  const cleaned = value.replace(/\D/g, "")

  if (cleaned.length <= 2) {
    return cleaned
  }

  if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
  }

  if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }

  // Mobile with 9 digits
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
}

/**
 * Remove formatting from a phone number
 */
export function unformatPhone(value: string): string {
  return value.replace(/\D/g, "")
}

/**
 * Validate a Brazilian phone number
 */
export function validatePhoneBR(value: string): boolean {
  const cleaned = unformatPhone(value)
  return cleaned.length === 10 || cleaned.length === 11
}
