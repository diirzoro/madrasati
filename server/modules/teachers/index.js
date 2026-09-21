// modules/teachers/index.js
// OWNING MODULE: teachers
// Teacher profiles, per-subject pricing, documents and the deletion lifecycle.
//
// `identity` is a hard dependency: creating a teacher creates a real login in
// `users`. `academic` is read-only here — the global subject and stage catalogs
// belong to that module, and this one only links teachers to their rows.

const router = require('./router');
const repository = require('./repository');
const service = require('./service');

module.exports = {
  name: 'teachers',
  dependencies: ['common', 'identity', 'academic'],
  router,
  repository,
  service,
};