// modules/common/phone.js
// OWNING MODULE: common (shared helper, no dependencies)
// Single source of truth for phone normalization/validation.
// Normalized form is E.164-ish: "+<cc><national>" (digits only after +).
// Uniqueness is enforced in the DB on phone_normalized (live rows only).

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toAsciiDigits(s) {
  return String(s || '').replace(/[٠-٩]/g, (c) => String(AR_DIGITS.indexOf(c)));
}

// Per-country national-number rules. `mobile` is checked first when present;
// otherwise `national` length range applies.
const COUNTRY_RULES = {
  YE: { mobile: /^7\d{8}$/, national: /^\d{7,9}$/ },
};

function normalizePhone(rawPhone, countryCode) {
  if (rawPhone === null || rawPhone === undefined) return null;
  const cc = String(countryCode || '').replace(/\D/g, '');
  if (!cc) throw new Error('Country calling code is required.');
  let digits = toAsciiDigits(rawPhone).replace(/\D/g, '');
  if (!digits) throw new Error('Phone number is required.');
  // Strip international prefix / country code / trunk zero.
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith(cc)) digits = digits.slice(cc.length);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!digits) throw new Error('Phone number is required.');
  return { national: digits, e164: `+${cc}${digits}` };
}

function validatePhoneForCountry(rawPhone, countryCode, countryIso) {
  const norm = normalizePhone(rawPhone, countryCode);
  const iso = String(countryIso || '').toUpperCase();
  const rule = COUNTRY_RULES[iso];
  const ok = rule
    ? (rule.mobile ? rule.mobile.test(norm.national) || rule.national.test(norm.national) : rule.national.test(norm.national))
    : /^\d{6,14}$/.test(norm.national);
  if (!ok) throw new Error('Invalid phone number for the selected country.');
  return norm;
}

module.exports = { normalizePhone, validatePhoneForCountry, toAsciiDigits };
