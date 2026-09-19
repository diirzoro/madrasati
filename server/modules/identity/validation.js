// modules/identity/validation.js
// OWNING MODULE: identity
// Lightweight input validation for identity routes.

const { ValidationError } = require('../common/errors');

function validateRegistration(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name is required and must be at least 2 characters.' });
  }
  if (!body.email || typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    errors.push({ field: 'email', message: 'Please provide a valid email address.' });
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 8 || !/[A-Z]/.test(body.password) || !/[^A-Za-z0-9\s]/.test(body.password)) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters with at least one capital letter and one symbol.' });
  }
  if (errors.length) {
    throw new ValidationError(errors.map((e) => e.message).join(' '));
  }
}

function validateProfileUpdate(body) {
  if (!body || typeof body !== 'object') throw new ValidationError('Request body must be an object.');
  const fields = ['fullName', 'avatarUrl', 'bio', 'gender', 'preferredLanguage', 'phoneAlt', 'timezone', 'metadata'];
  const known = fields.filter((f) => body[f] !== undefined);
  if (!known.length) throw new ValidationError('No editable fields supplied');
}

module.exports = { validateRegistration, validateProfileUpdate };