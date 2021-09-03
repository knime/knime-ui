const execa = require('execa');
const axios = require('axios');
const codecept = require('./codecept.conf');
const consola = require('consola');
const { level } = require('./logger.config.js');

consola.level = level;

const configPath = 'test/integration/codecept.conf.js';

let testName = '';
if (process.argv[2]) {
    testName = `suites/${process.argv[2]}`;
}

axios(`${codecept.config.helpers.Puppeteer.url}/json/version`).then((res) => {
    const overrideValue = { helpers: {
        Puppeteer: {
            chrome: {
                browserWSEndpoint: res.data.webSocketDebuggerUrl
            }
        }
    } };
    const overrideValueString = JSON.stringify(overrideValue);
    try {
        execa.command(`npx codeceptjs run ${testName} --steps --reporter mocha-multi -c ${configPath} --override ${overrideValueString} `, {
            stdio: 'inherit'
        });
    } catch (error) {
        throw new Error(error);
    }
});
