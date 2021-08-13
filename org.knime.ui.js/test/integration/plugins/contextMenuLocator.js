const { validateEnum } = require('./util/validateEnum');

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (validateEnum('context', providedLocator)) {
            // locatorObj.value = `//`
            locatorObj.value = providedLocator.context.xpath;
        }
    });
};
