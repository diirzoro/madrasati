// modules/common/http.js
// Small HTTP helpers that mirror the current runtime's response mapping
// conventions so the future PG-backed API stays compatible with the
// existing frontend contract (camelCase fields).

const { AppError } = require('./errors');

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed == null ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err && err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate value violates a unique constraint', code: 'CONFLICT' });
  }
  if (err && err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist', code: 'FK_VIOLATION' });
  }
  if (err && err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid identifier or value type', code: 'INVALID_INPUT' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { parseJson, asyncHandler, notFoundHandler, errorHandler };