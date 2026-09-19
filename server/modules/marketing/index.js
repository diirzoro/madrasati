// modules/marketing/index.js
// OWNING MODULE: marketing
// Hero slides + advertisements + offers (Super-Admin managed, PostgreSQL authoritative).
const router = require('./router');
const repository = require('./repository');
const service = require('./service');
module.exports = { name: 'marketing', dependencies: ['common', 'identity', 'organizations'], router, repository, service };
