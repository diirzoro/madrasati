// modules/common/pool.js
// Single shared PostgreSQL connection pool for the module foundation.
// Reuses the existing pool from server/config/db.js so there is exactly
// one pool across the repository/services layer and the current runtime.

module.exports = require('../../config/db');