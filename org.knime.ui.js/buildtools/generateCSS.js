/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

import * as colors from '../style/colors';

const camelToSnake = str => str.replace(/(.?)([A-Z])/g,
    (_, before, letter) => `${before}${before ? '-' : ''}${letter.toLowerCase()}`);


const assets = ['warning', 'error', 'darkeningMask', 'notificationBackground'];

/**
 * Generate colors.css with the above color names from colors.js
 * @returns {void}
 */
export default function () {
    let rules = assets.map(name => `--${camelToSnake(name)}-color: ${colors[name]};`);
    let content = `/* This is an auto-generated file.
 * Do not change manually.
 * Changes should go to style/colors.js.
*/

:root {
  ${rules.join('\n  ')}
}
`;

    let outPath = path.join(__dirname, '..', 'assets', 'colors.css');

    console.info('Generating assets/colors.css');
    fs.writeFileSync(outPath, content);
}
