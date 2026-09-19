// modules/common/money.js
// Canonical money model for PostgreSQL module foundation.
//
// DECISION: NUMERIC(14,2) is the single permanent money representation
// for all business money values (fees, pricing, services).
// Legacy `amount_cents` / `fee_cents` / `price_cents` columns are kept
// only as a transitional bridge (Phase 2D/2E removes them) and are
// NEVER treated as a second permanent money model.
//
// Values from PostgreSQL NUMERIC arrive as strings; all helpers return
// strings so no floating-point rounding can corrupt business money.

const { ValidationError } = require('./errors');

const MONEY_SCALE = 2;

function assertMoney(value, field = 'value') {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) {
    throw new ValidationError(`${field} must be a money value with at most 2 decimals`);
  }
  return Number(text).toFixed(MONEY_SCALE);
}

function moneyToIntegerCents(money, field = 'value') {
  const normalized = assertMoney(money, field);
  if (normalized === null) return 0;
  return Math.round(Number(normalized) * 100);
}

function integerCentsToMoney(cents, field = 'value') {
  const n = Number(cents);
  if (!Number.isInteger(n)) {
    throw new ValidationError(`${field} must be an integer amount in cents`);
  }
  return (n / 100).toFixed(MONEY_SCALE);
}

function isMoney(value) {
  if (value === null || value === undefined || value === '') return true;
  const text = String(value).trim();
  return /^-?\d+(\.\d{1,2})?$/.test(text);
}

module.exports = {
  MONEY_SCALE,
  assertMoney,
  moneyToIntegerCents,
  integerCentsToMoney,
  isMoney,
};