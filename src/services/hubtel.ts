import type { GhanaNetwork } from '../types/hubtel.types';

/**
 * Sanitizes local Ghanaian phone numbers to international Hubtel standard (233XXXXXXXXX).
 * Handles formats like:
 * - '0241234567' -> '233241234567'
 * - '+233 50 123 4567' -> '233501234567'
 * - '233271234567' -> '233271234567'
 * - '241234567' -> '233241234567'
 */
export function sanitizeGhanaianPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Remove all non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');

  // Handle leading 0 (e.g. 024XXXXXXX -> 10 digits)
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '233' + digits.substring(1);
  } else if (digits.startsWith('233') && digits.length === 12) {
    // Already in correct 233XXXXXXXXX format
  } else if (digits.length === 9) {
    // 9 digits without leading 0 or 233
    digits = '233' + digits;
  }

  // Validate final Ghanaian 12-digit format
  if (digits.length !== 12 || !digits.startsWith('233')) {
    throw new Error(
      `Invalid Ghanaian phone number format: '${phoneNumber}'. Expected 10 digits (e.g. 024XXXXXXX) or 12 digits (233XXXXXXXXX).`
    );
  }

  return digits;
}

/**
 * Detects the Ghanaian telecom network based on mobile prefix.
 */
export function detectGhanaNetwork(phoneNumber: string): GhanaNetwork {
  const sanitized = sanitizeGhanaianPhoneNumber(phoneNumber);
  const prefix = sanitized.substring(3, 5); // 233[XX]XXXXXXX

  // MTN: 024, 054, 055, 059, 025, 053 -> 24, 54, 55, 59, 25, 53
  if (['24', '54', '55', '59', '25', '53'].includes(prefix)) {
    return 'mtn-gh';
  }

  // Telecel / Vodafone: 020, 050 -> 20, 50
  if (['20', '50'].includes(prefix)) {
    return 'vodafone-gh';
  }

  // AT / AirtelTigo: 027, 057, 026, 056 -> 27, 57, 26, 56
  if (['27', '57'].includes(prefix)) {
    return 'tigo-gh';
  }
  if (['26', '56'].includes(prefix)) {
    return 'airtel-gh';
  }

  return 'unknown';
}
