// modules/admissions/index.js
// OWNING MODULE: admissions
const router = require('./router');
const repository = require('./repository');
const service = require('./service');
module.exports = { name: 'admissions', dependencies: ['common', 'identity'], router, repository, service };