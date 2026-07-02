/**
 * Normalizes a raw phone number by removing formatting characters,
 * prepending a country code if it is a local 10-digit number,
 * and validating that the length is between 10 and 15 digits.
 * 
 * @param {string|number} rawNumber The raw phone number input
 * @param {string} defaultCountryCode The default country code (default '91' for India)
 * @returns {string|null} Normalized phone number string containing only digits, or null if invalid
 */
function normalizePhoneNumber(rawNumber, defaultCountryCode = '91') {
  if (rawNumber === undefined || rawNumber === null) {
    return null;
  }

  // Strip all spaces, dashes, parentheses, and plus signs
  let cleaned = String(rawNumber).replace(/[\s\-\(\)\+]/g, '');

  // Ensure it only contains digits
  if (!/^\d+$/.test(cleaned)) {
    return null;
  }

  // If the number doesn't start with the country code and is 10 digits, prepend the default country code
  if (cleaned.length === 10) {
    cleaned = defaultCountryCode + cleaned;
  }

  // Returns null if the result isn't a valid-looking phone number (not 10-15 digits)
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return cleaned;
  }

  return null;
}

module.exports = {
  normalizePhoneNumber,
};
