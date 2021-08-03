const { validateEnum } = require('./util/validateEnum');

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (validateEnum('hover', providedLocator)) {
            locatorObj.value = providedLocator.hover.css;
        }
    });
};
