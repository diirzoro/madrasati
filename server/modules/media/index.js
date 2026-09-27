// modules/media/index.js
// OWNING MODULE: media
// Module descriptor: router + repository + service.
// Dependencies: common (pool, errors, audit, http), identity (auth), organizations.
const router = require('./router');
const repository = require('./repository');
const service = require('./service');

module.exports = {
  name: 'media',
  dependencies: ['common', 'identity', 'organizations'],
  router,
  repository,
  service,
};
