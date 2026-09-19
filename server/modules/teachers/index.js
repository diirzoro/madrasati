// modules/teachers/index.js
// OWNING MODULE: teachers
// Minimal module descriptor: teacher profiles.

const router = require('./router');
const repository = require('./repository');
const service = require('./service');

module.exports = {
  name: 'teachers',
  dependencies: ['common', 'identity'],
  router,
  repository,
  service,
};