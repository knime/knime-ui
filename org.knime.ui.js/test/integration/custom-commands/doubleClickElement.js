// There is no Webdriver command for double clicking an element.
// Nightwatch's doubleClick() does not accept a selector, so it requires to
// 1. scroll the element into view
// 2. position the mouse pointer over its center
// 3. doubleClick()
// The click() command does 2. and 3. internally, guaranteed by the spec
// (https://www.w3.org/TR/webdriver/#element-click)

const delay = 20;

module.exports = class DoubleClickElement {
    /**
     * Custom command nightwatch.doubleClickElement, allowing double-click on an element with optional modifier key
     * @param {String} selector An element selector
     * @param {Object=} offset Coordinate offset from the top left of the targeted object
     * @param {Number} offset.x
     * @param {Number} offset.y
     * @param {String} modifierKey An optional modifier key to depress during double-click. Should be taken from
     *                 `nightwatch.Keys`
     * @return {void}
     *
     * @example
     * nightwatch.doubleClickElement({
     *     selector: '.someClass',
     *     offset: { x: 50, y: 50},
     *     modifierKey: nightwatch.Keys.SHIFT
     * });
     * */
    command({ selector, offset = {}, modifierKey }) {
        const nightwatch = this.api;
        if (modifierKey) {
            nightwatch.keys(modifierKey);
        }
        // this also scrolls the element into view
        nightwatch.moveToElement(selector, offset.x || 0, offset.y || 0);
        nightwatch.pause(delay); // timing issue in Jenkins
        nightwatch.doubleClick();
        if (modifierKey) {
            nightwatch.keys(nightwatch.Keys.NULL);
        }
    }
};

