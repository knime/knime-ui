const { validateEnum } = require('./util/validateEnum');

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (validateEnum('context', providedLocator)) {
            locatorObj.type = 'xpath';
            // eslint-disable-next-line max-len
            locatorObj.value = `//div[contains(@class, "isVisible")]//span[text()="${providedLocator.context.xpath}"]/../..`;
        }
    });
};
