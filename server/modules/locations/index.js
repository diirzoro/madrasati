// modules/locations/index.js
// OWNING MODULE: locations
// Module descriptor: read-only location catalog.

const router = require('./router');
const repository = require('./repository');
const service = require('./service');

module.exports = {
  name: 'locations',
  dependencies: ['common'],
  router,
  repository,
  service,
};