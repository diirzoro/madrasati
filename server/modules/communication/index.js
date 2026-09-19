// modules/communication/index.js
// OWNING MODULE: communication
const router = require('./router');
const repository = require('./repository');
const service = require('./service');
module.exports = { name: 'communication', dependencies: ['common', 'identity'], router, repository, service };