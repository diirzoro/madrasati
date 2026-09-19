// modules/bookings/index.js
// OWNING MODULE: bookings
const router = require('./router');
const repository = require('./repository');
const service = require('./service');
module.exports = { name: 'bookings', dependencies: ['common', 'identity'], router, repository, service };