const serverless = require('serverless-http');
const app = require('../../server/pg-app');

exports.handler = serverless(app);
