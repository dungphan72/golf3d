/**
 * Vietnamese License Plate Recognition & Normalization Utilities
 * Supports standard formats:
 * - 51A-123.45, 51K-246.80, 30H-678.90, 29A-999.99
 * - 51A12345, 30H67890
 * - 51-A 123.45, 51A 1234
 * - Motorbike / commercial formats: 59C1-123.45, 29-LD 1234
 */

export function cleanPlateString(input: string): string {
  if (!input) return '';
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatVietnamesePlate(cleanText: string): string {
  if (!cleanText) return '';
  const clean = cleanPlateString(cleanText);

  // Pattern: 2 digits + 1-2 letters + 4-5 digits
  const m = clean.match(/^([1-9][0-9][A-Z]{1,2})([0-9]{4,5})$/i);
  if (m) {
    const series = m[1];
    const num = m[2];
    if (num.length === 5) {
      return `${series}-${num.slice(0, 3)}.${num.slice(3)}`;
    }
    return `${series}-${num}`;
  }

  // Fallback for motorbike/special plates: 2 digits + 1 letter + 1 digit + 4-5 digits
  const m2 = clean.match(/^([1-9][0-9][A-Z][0-9])([0-9]{4,5})$/i);
  if (m2) {
    const series = m2[1];
    const num = m2[2];
    if (num.length === 5) {
      return `${series}-${num.slice(0, 3)}.${num.slice(3)}`;
    }
    return `${series}-${num}`;
  }

  return cleanText.trim().toUpperCase();
}

export function extractVietnamesePlate(rawText: string): string | null {
  if (!rawText) return null;
  const upper = rawText.toUpperCase();

  // Clean common OCR substitutions: e.g. 'O' or 'D' in numbers, '1' vs 'I'
  const normalized = upper
    .replace(/[–—_]/g, '-')
    .replace(/[^A-Z0-9\s.-]/g, ' ');

  // Regex patterns for Vietnamese vehicle plates
  const patterns = [
    // Standard 5-digit: 51A-123.45, 30H 678.90, 51K-246.80
    /\b([1-9][0-9][A-Z]{1,2})[-\s.]?([0-9]{3}[-.\s]?[0-9]{2})\b/i,
    // Standard 4-digit: 29A-1234, 51A 5678
    /\b([1-9][0-9][A-Z]{1,2})[-\s.]?([0-9]{4})\b/i,
    // Without separator: 51A12345, 30H67890
    /\b([1-9][0-9][A-Z]{1,2})([0-9]{4,5})\b/i,
    // Motorbike / commercial: 59C1-123.45, 29X5-6789
    /\b([1-9][0-9][A-Z][0-9])[-\s.]?([0-9]{3}[-.\s]?[0-9]{2})\b/i,
    /\b([1-9][0-9][A-Z][0-9])[-\s.]?([0-9]{4,5})\b/i,
  ];

  for (const pat of patterns) {
    const match = normalized.match(pat);
    if (match) {
      const series = match[1].replace(/[^A-Z0-9]/g, '');
      const rawNum = match[2].replace(/[^0-9]/g, '');
      if (rawNum.length === 5) {
        return `${series}-${rawNum.slice(0, 3)}.${rawNum.slice(3)}`;
      } else if (rawNum.length === 4) {
        return `${series}-${rawNum}`;
      }
    }
  }

  // Direct exact match after stripping punctuation
  const cleanOnly = cleanPlateString(upper);
  if (cleanOnly.length >= 7 && cleanOnly.length <= 9) {
    const directMatch = cleanOnly.match(/^([1-9][0-9][A-Z]{1,2})([0-9]{4,5})$/);
    if (directMatch) {
      const series = directMatch[1];
      const num = directMatch[2];
      if (num.length === 5) {
        return `${series}-${num.slice(0, 3)}.${num.slice(3)}`;
      }
      return `${series}-${num}`;
    }
  }

  return null;
}
