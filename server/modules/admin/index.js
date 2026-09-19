// modules/admin/index.js
// OWNING MODULE: admin
const router = require('./router');
const repository = require('./repository');
const service = require('./service');
module.exports = { name: 'admin', dependencies: ['common', 'identity'], router, repository, service };