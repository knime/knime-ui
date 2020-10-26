import dotenv from 'dotenv';
import consola from 'consola';

dotenv.config();
let levelId = process.env.TEST_LOG_LEVEL || 'Error';
export const level = consola.LogLevel[`${levelId[0].toUpperCase()}${levelId.slice(1)}`];
