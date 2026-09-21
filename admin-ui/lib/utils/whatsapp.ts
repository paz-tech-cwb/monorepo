/**
 * Normalize a Brazilian phone number (any format — formatted display value,
 * raw digits, or `+55...` API value, mirroring the normalization already
 * done by `PhoneInput`/`formatPhoneBR`) into E.164 digits-only, suitable
 * for a `wa.me/<digits>` link.
 *
 * Returns null when the phone is missing or doesn't look like a valid
 * Brazilian number (10 or 11 local digits).
 */
export function toWhatsAppDigits(phone: string | null | undefined): string | null {
  if (!phone) return null

  const digits = phone.replace(/\D/g, "")
  if (!digits) return null

  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) {
    return digits
  }

  const local = digits.startsWith("0") ? digits.slice(1) : digits
  if (local.length === 10 || local.length === 11) {
    return `55${local}`
  }

  return null
}

/**
 * Build a `wa.me` chat URL for a Brazilian phone number, optionally
 * pre-filling the message text. Returns null when the phone can't be
 * normalized to a valid WhatsApp number.
 */
export function whatsAppChatUrl(phone: string | null | undefined, text?: string): string | null {
  const digits = toWhatsAppDigits(phone)
  if (!digits) return null

  const url = `https://wa.me/${digits}`
  return text ? `${url}?text=${encodeURIComponent(text)}` : url
}
