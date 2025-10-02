/**
 * Shared utility for handling college name normalization
 * Used by both client (CollegePicker) and server (alumni-locations endpoint)
 * to ensure consistent cleaning of college names with location suffixes
 */

/**
 * Cleans college names by removing location suffixes like " — City, ST"
 * Examples:
 * - "Cornell University — Ithaca, NY" → "Cornell University"
 * - "Boston College — Chestnut Hill, MA" → "Boston College"  
 * - "Harvard University" → "Harvard University" (no change)
 */
export function cleanCollegeName(collegeName: string): string {
  if (!collegeName || typeof collegeName !== 'string') {
    return '';
  }

  // Remove location suffixes in formats:
  // " — City, ST" or " - City, ST" 
  // Handles various dash types (em dash, en dash, hyphen)
  const cleaned = collegeName
    .replace(/\s+[-—–]\s+[A-Za-z .'-]+,\s*[A-Z]{2}$/g, '')
    .trim();

  return cleaned;
}

/**
 * Checks if a college name has a location suffix
 */
export function hasLocationSuffix(collegeName: string): boolean {
  if (!collegeName || typeof collegeName !== 'string') {
    return false;
  }

  return /\s+[-—–]\s+[A-Za-z .'-]+,\s*[A-Z]{2}$/.test(collegeName);
}