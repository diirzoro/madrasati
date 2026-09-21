require('dotenv').config();
const { Pool } = require('pg');

// Local development can use DATABASE_URL.
// Netlify Database exposes NETLIFY_DB_URL to builds/functions/agents.
// Keep DATABASE_URL as the first choice so existing local deployments remain compatible.
const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;

if (!DATABASE_URL) {
  throw new Error(
    'No PostgreSQL connection string found. Set DATABASE_URL locally or connect a Netlify Database so NETLIFY_DB_URL is available.'
  );
}

const pool = new Pool({ connectionString: DATABASE_URL });

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient, DATABASE_URL };
