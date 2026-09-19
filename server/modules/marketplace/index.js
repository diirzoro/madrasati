// modules/marketplace/index.js
// OWNING MODULE: marketplace
const router = require('./router');
const repository = require('./repository');
const service = require('./service');
module.exports = { name: 'marketplace', dependencies: ['common', 'identity'], router, repository, service };