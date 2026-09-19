// modules/identity/index.js
// OWNING MODULE: identity
// Dependency graph:
//   identity -> common (pool, errors, audit, http, money)
//   identity does NOT depend on other business modules.
// Exported API: router ready to mount, plus repository/service accessors.

const router = require('./router');
const repository = require('./repository');
const service = require('./service');
const auth = require('./auth');

module.exports = {
  name: 'identity',
  dependencies: ['common'],
  router,
  repository,
  service,
  auth,
};