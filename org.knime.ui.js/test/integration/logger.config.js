const dotenv = require('dotenv');
dotenv.config();
let levelId = process.env.INTEGRATION_TEST_LOG_LEVEL || 'Error';

const level = consola.LogLevel[`${levelId[0].toUpperCase()}${levelId.slice(1)}`];

module.exports = level;
