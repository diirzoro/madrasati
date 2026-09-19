// modules/academic/index.js
// OWNING MODULE: academic
// Module descriptor: academic catalog + org join tables.

const router = require('./router');
const repository = require('./repository');
const service = require('./service');

module.exports = {
  name: 'academic',
  dependencies: ['common', 'identity'],
  router,
  repository,
  service,
};