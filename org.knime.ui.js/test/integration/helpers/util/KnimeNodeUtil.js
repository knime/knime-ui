const { locator } = require('codeceptjs');

/**
* Converts selector to a CSS selector.
* @param {String} selector The ID of the Node.
* @returns {String} CSS Selector.
*/
const _getNodeSelector = (selector) => {
    // eslint-disable-next-line new-cap
    const nodeSelector = new locator(selector);
    return nodeSelector.value;
};

/**
* Get coordinates of center of a node
* @param {String} selector The ID of the Node to hover.
* @param {String} page Needs page for context.
* @returns {Object} x and y coordinates.
*/
const _getCenterNode = async (selector, page) => {
    const nodeSelector = _getNodeSelector(selector);
    const source = await page.$(nodeSelector);
    const coordinates = await source.boundingBox();

    const x = coordinates.x + coordinates.width / 2;
    // eslint-disable-next-line no-magic-numbers
    const y = coordinates.y + coordinates.height / 1.5;

    return { x, y };
};

module.exports = {
    _getCenterNode,
    _getNodeSelector
};
