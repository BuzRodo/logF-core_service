/**
 * Utilidades de normalización de teléfono, compartidas por los módulos que necesitan
 * comparar números ignorando formato (espacios, guiones, +, paréntesis, etc.).
 */

/** Cantidad mínima/máxima de dígitos que se acepta como teléfono válido. */
export const MIN_PHONE_DIGITS = 6;
export const MAX_PHONE_DIGITS = 15;

/** Extrae solo los dígitos de un teléfono (descarta espacios, guiones, +, paréntesis, etc.). */
export function normalizePhoneDigits(phone: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

/** true si la cantidad de dígitos está dentro del rango aceptado (6 a 15). */
export function isValidPhoneDigits(digits: string): boolean {
  return digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS;
}
