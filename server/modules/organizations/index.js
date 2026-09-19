// modules/organizations/index.js
// OWNING MODULE: organizations
// Module descriptor: router + repository + service.
// Dependencies: common (pool, errors, audit, http, money), identity (auth).

const router = require('./router');
const repository = require('./repository');
const service = require('./service');

module.exports = {
  name: 'organizations',
  dependencies: ['common', 'identity'],
  router,
  repository,
  service,
};