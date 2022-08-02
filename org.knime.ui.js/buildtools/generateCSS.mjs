/* eslint-disable no-console */
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import * as colors from '../style/colors.mjs';
import * as shapes from '../style/shapes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// -- define the names of the variables that will end up in the css file
// colors.js -> colors.css (postfix color, someVariableName will become `--some-variable-name-color`)
const colorNames = [
    'warning',
    'error',
    'darkeningMask',
    'notificationBackground',
    'selection.activeBorder',
    'selection.activeBackground'
];

// shapes.js -> shapes.css (postfix shape, someVariableName will become `--some-variable-name-shape`)
const shapeNames = [
    'selectedNodeBorderRadius',
    'selectedNodeStrokeWidth',
    'selectedConnectorWidth',
    'connectorWidth',
    'highlightedConnectorWidth',
    'nodeNamePadding',
    'nodeNameFontSize',
    'nodeNameLineHeight',
    'nodeNameMaxLines'
];
// --

const camelToSnake = str => str.replace(
    /(.?)([A-Z])/g,
    (_, before, letter) => `${before}${before ? '-' : ''}${letter.toLowerCase()}`
);

const dotToDash = str => str.replace(/\./g, '-');

// access objects with a json path like syntax 'obj.x.y'
const getVal = (object, path) => path.split('.').reduce((res, prop) => res[prop], object);

const generateCssData = (names, data, postfix, sourceFile) => {
    let rules = names.map(name => `--${camelToSnake(dotToDash(name))}-${postfix}: ${getVal(data, name)};`);
    return `/* This is an auto-generated file.
 * Do not change manually.
 * Changes should go to ${sourceFile}.
*/

:root {
  ${rules.join('\n  ')}
}
`;
};

/**
 * Generate colors.css and shapes.css from the above color names from colors.js
 * @returns {void}
 */
function generate() {
    let colorsPath = path.join(__dirname, '..', 'assets', 'colors.css');
    console.info('Generating assets/colors.css');
    fs.writeFileSync(colorsPath, generateCssData(colorNames, colors, 'color', 'style/colors.js'));

    let shapesPath = path.join(__dirname, '..', 'assets', 'shapes.css');
    console.info('Generating assets/shapes.css');
    fs.writeFileSync(shapesPath, generateCssData(shapeNames, shapes, 'shape', 'style/shapes.js'));
}

generate();
