import dotenv from 'dotenv';
dotenv.config();
let levelId = process.env.INTEGRATION_TEST_LOG_LEVEL || 'Error';
export const level = consola.LogLevel[`${levelId[0].toUpperCase()}${levelId.slice(1)}`];
