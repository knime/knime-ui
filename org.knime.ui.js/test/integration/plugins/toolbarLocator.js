const { validateEnum } = require('./util/valideEnum');

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (validateEnum('action', providedLocator)) {
            locatorObj.value = providedLocator.action.css;
        }
    });
};
