import {
  normalizePhoneDigits,
  isValidPhoneDigits,
  MIN_PHONE_DIGITS,
  MAX_PHONE_DIGITS,
} from './phone.util';

describe('phone.util', () => {
  describe('normalizePhoneDigits', () => {
    it('elimina espacios, guiones, paréntesis y el signo +', () => {
      expect(normalizePhoneDigits('099 111 222')).toBe('099111222');
      expect(normalizePhoneDigits('+598 99 111 222')).toBe('59899111222');
      expect(normalizePhoneDigits('(099) 111-222')).toBe('099111222');
    });

    it('devuelve string vacío si no hay dígitos', () => {
      expect(normalizePhoneDigits('abc')).toBe('');
      expect(normalizePhoneDigits('')).toBe('');
    });

    it('maneja null/undefined sin lanzar', () => {
      expect(normalizePhoneDigits(null as unknown as string)).toBe('');
      expect(normalizePhoneDigits(undefined as unknown as string)).toBe('');
    });
  });

  describe('isValidPhoneDigits', () => {
    it(`rechaza menos de ${MIN_PHONE_DIGITS} dígitos`, () => {
      expect(isValidPhoneDigits('12345')).toBe(false);
    });

    it(`acepta el límite inferior (${MIN_PHONE_DIGITS} dígitos)`, () => {
      expect(isValidPhoneDigits('123456')).toBe(true);
    });

    it(`acepta el límite superior (${MAX_PHONE_DIGITS} dígitos)`, () => {
      expect(isValidPhoneDigits('1'.repeat(MAX_PHONE_DIGITS))).toBe(true);
    });

    it(`rechaza más de ${MAX_PHONE_DIGITS} dígitos`, () => {
      expect(isValidPhoneDigits('1'.repeat(MAX_PHONE_DIGITS + 1))).toBe(false);
    });

    it('rechaza string vacío', () => {
      expect(isValidPhoneDigits('')).toBe(false);
    });
  });
});
