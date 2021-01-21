import execa from 'execa';
import waitOn from 'wait-on';
import consola from 'consola';
import { level } from './logger.config.mjs';

consola.level = level;

import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const nightWatchBinPath = path.resolve(__dirname, '../../node_modules/nightwatch/bin/nightwatch');
let args = [];

args.push('--env', 'ap-cef');
args.push('--config', path.resolve(__dirname, 'nightwatch.config.js'));

const URL = 'http://127.0.0.1:8888';

consola.log(`Waiting for ${URL} …`);

waitOn({
    resources: [URL],
    timeout: 2 * 60 * 1000
}, err => {
    if (err) {
        throw err;
    }

    execa(nightWatchBinPath, args, {
        stdio: 'inherit'
    });
});
