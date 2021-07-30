const { validateEnum } = require('./util/valideEnum');

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (validateEnum('hover', providedLocator)) {
            locatorObj.value = providedLocator.hover.css;
        }
    });
};
